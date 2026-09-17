import type { Actor, Request, Row } from './core';

import {
  accessibleStores,
  allowed,
  boolean,
  choice,
  date,
  decorate,
  fail,
  find,
  insert,
  integer,
  memberScope,
  money,
  now,
  only,
  page,
  range,
  rows,
  scopeRows,
  storeScope,
  uuid,
} from './core';

export function cents(value: unknown) {
  const [whole = '0', part = '00'] = money(value).split('.');
  return BigInt(whole) * 100n + BigInt(part);
}
export function amount(value: bigint): string {
  const magnitude = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, '0')}`;
}
function cardForStore(id: string, storeId: string, monthly = false) {
  const card = find('cardTemplates', uuid(id));
  if (card.status !== 'published' || (card.accessScope === 'selected' && !card.storeIds.includes(storeId)))
    fail('卡种尚未发布或不适用于该门店');
  if (monthly && (card.kind !== 'period' || card.durationDays < 28 || card.durationDays > 31))
    fail('连续包月须选择月卡模板');
  return card;
}
function settings(req: Request, storeId: string, kind: string) {
  const { actor, body, method } = req;
  allowed(actor, 'sales:settings');
  if (!actor.globalCodes.includes('sales:settings')) fail('仅总部可配置售卡', 403);
  storeScope(actor, uuid(storeId));
  const existing = rows('salesSettings').find((s) => s.storeId === storeId && s.kind === kind);
  const defaults: Record<string, any> = {
    'online-sales-settings': { offers: [] },
    'subscription-settings': { items: [] },
    'verification-settings': {
      enabled: false,
      requireCheckin: true,
      supportedChannels: [],
    },
  };
  if (method === 'GET') return existing ?? { storeId, ...defaults[kind] };
  if (method !== 'PUT') fail('接口不存在', 404);
  let data: Record<string, any> = {};
  if (kind === 'online-sales-settings') {
    only(body, ['offers']);
    if (!Array.isArray(body.offers) || body.offers.length > 1000) fail('售卡配置必须为列表且不超过1000项');
    const offers = body.offers.map((o: Row) => {
      only(o, ['cardTemplateId', 'salePrice', 'startsAt', 'endsAt', 'enabled', 'contractRequired', 'approvalRequired']);
      cardForStore(o.cardTemplateId, storeId);
      const contractRequired = boolean(o.contractRequired, '合同要求');
      const item: Row = {
        ...o,
        salePrice: money(o.salePrice),
        enabled: boolean(o.enabled, '启用'),
        contractRequired,
        approvalRequired: contractRequired && boolean(o.approvalRequired, '审批要求'),
      };
      if (item.startsAt) item.startsAt = new Date(date(item.startsAt, '开始时间')).toISOString();
      if (item.endsAt) item.endsAt = new Date(date(item.endsAt, '结束时间')).toISOString();
      if (item.startsAt && item.endsAt && item.startsAt >= item.endsAt) fail('售卡时间范围不合法');
      return item;
    });
    if (new Set(offers.map((o) => o.cardTemplateId)).size !== offers.length) fail('卡种不可重复');
    data = { offers };
  }
  if (kind === 'subscription-settings') {
    only(body, ['items']);
    if (!Array.isArray(body.items) || body.items.length > 1000) fail('包月配置必须为列表且不超过1000项');
    const items = body.items.map((item: Row): Row => {
      only(item, [
        'cardTemplateId',
        'price',
        'billingDay',
        'renewalNoticeDays',
        'graceDays',
        'enabled',
        'contractRequired',
        'approvalRequired',
      ]);
      cardForStore(item.cardTemplateId, storeId, true);
      const contractRequired = boolean(item.contractRequired, '合同要求');
      return {
        ...item,
        price: money(item.price),
        billingDay: item.billingDay ? integer(item.billingDay, '扣款日', 1, 28) : null,
        renewalNoticeDays: integer(item.renewalNoticeDays, '提前通知天数', 0, 30),
        graceDays: integer(item.graceDays, '宽限天数', 0, 30),
        enabled: boolean(item.enabled, '启用'),
        contractRequired,
        approvalRequired: contractRequired && boolean(item.approvalRequired, '审批要求'),
      };
    });
    if (new Set(items.map((i) => i.cardTemplateId)).size !== items.length) fail('卡种不可重复');
    data = { items };
  }
  if (kind === 'verification-settings') {
    only(body, ['enabled', 'requireCheckin', 'supportedChannels', 'allowedStart', 'allowedEnd']);
    if (!Array.isArray(body.supportedChannels)) fail('请选择核销渠道');
    const supportedChannels = [
      ...new Set(body.supportedChannels.map((c) => choice(c, ['miniapp', 'app', 'meituan', 'douyin'], '核销渠道'))),
    ];
    for (const key of ['allowedStart', 'allowedEnd'])
      if (body[key] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body[key])) fail('允许核销时间须为HH:mm');
    data = {
      ...body,
      enabled: boolean(body.enabled, '核销开关'),
      requireCheckin: boolean(body.requireCheckin, '签到要求'),
      supportedChannels,
    };
    if (data.enabled && supportedChannels.length === 0) fail('启用核销时至少选一个渠道');
  }
  return existing
    ? Object.assign(existing, data, { updatedAt: now() })
    : insert('salesSettings', { storeId, kind, ...data });
}
export interface SaleFact {
  orderId: string;
  itemId: string;
  storeId: string;
  productType: string;
  cardTemplateId?: string;
  courseProductId?: string;
  cents: bigint;
  occurredAt: string;
}
// Payment and refund events retain their own dates. A later refund never rewrites an earlier month's receipts.
export function saleFacts(actor: Actor, query: Record<string, any>): SaleFact[] {
  const [from, to] = range(query);
  const orders = scopeRows(actor, rows('orders')).filter((o) => !query.storeId || o.storeId === query.storeId);
  const facts: SaleFact[] = [];
  for (const order of orders) {
    const payments = rows('payments').filter((p) => p.orderId === order.id && p.status === 'succeeded');
    const events = payments.map((p) => ({
      at: p.paidAt,
      cents: cents(p.amount),
    }));
    for (const refund of rows('refunds').filter(
      (r) => payments.some((p) => p.id === r.paymentTransactionId) && r.status === 'succeeded',
    ))
      events.push({ at: refund.refundedAt, cents: -cents(refund.amount) });
    const items = rows('orderItems').filter((i) => i.orderId === order.id);
    const total = items.reduce((sum, i) => sum + cents(i.payableAmount), 0n);
    for (const event of events.filter((e) => Date.parse(e.at) >= from && Date.parse(e.at) < to)) {
      let assigned = 0n;
      items.forEach((item, index) => {
        let value = total > 0n ? (event.cents * cents(item.payableAmount)) / total : 0n;
        if (index === items.length - 1) value = event.cents - assigned;
        assigned += value;
        facts.push({
          orderId: order.id,
          itemId: item.id,
          storeId: order.storeId,
          productType: item.productType,
          cardTemplateId: item.cardTemplateId,
          courseProductId: item.courseProductId,
          cents: value,
          occurredAt: event.at,
        });
      });
    }
  }
  return facts;
}
function reports(req: Request, name: string) {
  const { actor, query } = req;
  allowed(actor, 'reports:read');
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  const permitted = accessibleStores(actor);
  const stores = rows('stores').filter(
    (s) => (!permitted || permitted.includes(s.id)) && (!query.storeId || s.id === query.storeId),
  );
  const [from, to] = range(query);
  if (name === 'members') {
    const result = stores.map((store) => {
      const members = rows('members').filter((m) =>
        rows('memberStores').some((s) => s.memberId === m.id && s.storeId === store.id),
      );
      const expiring = (table: string) =>
        new Set(
          rows(table)
            .filter(
              (c) =>
                c.storeId === store.id &&
                c.status === 'active' &&
                Date.parse(c.expiresAt) >= Date.now() &&
                Date.parse(c.expiresAt) < Date.now() + 30 * 86_400_000,
            )
            .map((c) => c.memberId),
        ).size;
      return {
        id: store.id,
        storeName: store.name,
        totalMembers: members.length,
        newMembers: members.filter((m) => Date.parse(m.registeredAt) >= from && Date.parse(m.registeredAt) < to).length,
        leads: members.filter((m) => m.customerStage === 'lead').length,
        expiringCards: expiring('memberCards'),
        expiringCourses: expiring('memberCoursePacks'),
      };
    });
    return page(result, { page: query.page, pageSize: query.pageSize });
  }
  const facts = saleFacts(actor, query);
  if (name === 'performance') {
    const group = choice(query.groupBy ?? 'store', ['store', 'employee'], '汇总方式');
    const groups: Row[] =
      group === 'store'
        ? stores.map((s) => ({ id: s.id, name: s.name }))
        : rows('employees')
            .filter((e) => stores.some((s) => e.storeIds.includes(s.id)))
            .map((e) => ({ id: e.id, name: e.name }));
    const results = groups.map((entry) => {
      const values = facts.flatMap((f) => {
        if (group === 'store') return f.storeId === entry.id ? [f] : [];
        return rows('performanceAllocations')
          .filter((a) => a.orderItemId === f.itemId && a.employeeId === entry.id)
          .map((a) => ({
            ...f,
            cents: (f.cents * BigInt(Math.round(Number(a.shareRatio) * 1_000_000))) / 1_000_000n,
          }));
      });
      const net = values.reduce((sum, f) => sum + f.cents, 0n);
      const count = new Set(values.filter((f) => f.cents > 0n).map((f) => f.orderId)).size;
      const staffCount =
        group === 'store'
          ? rows('employees').filter((e) => e.storeIds.includes(entry.id) && e.status === 'active').length
          : 1;
      return {
        ...entry,
        netAmount: amount(net),
        cardAmount: amount(values.filter((f) => f.productType === 'card').reduce((sum, f) => sum + f.cents, 0n)),
        ptAmount: amount(
          values
            .filter(
              (f) => f.productType === 'course' && find('courseProducts', f.courseProductId ?? '').kind === 'personal',
            )
            .reduce((sum, f) => sum + f.cents, 0n),
        ),
        orderCount: count,
        employeeCount: staffCount,
        averageEmployeeAmount: amount(staffCount ? net / BigInt(staffCount) : 0n),
        averageOrderAmount: amount(count ? net / BigInt(count) : 0n),
      };
    });
    return {
      ...page(results, { page: query.page, pageSize: query.pageSize }),
      summary: {
        netAmount: amount(facts.reduce((sum, f) => sum + f.cents, 0n)),
        orderCount: new Set(facts.filter((f) => f.cents > 0n).map((f) => f.orderId)).size,
      },
    };
  }
  if (name === 'member-cards') {
    const cards = rows('cardTemplates').filter((c) => !query.cardTemplateId || c.id === query.cardTemplateId);
    const result = cards.map((card) => {
      const values = facts.filter((f) => f.cardTemplateId === card.id);
      const sold = rows('memberCards').filter(
        (c) => c.cardTemplateId === card.id && stores.some((s) => s.id === c.issuedStoreId),
      );
      return {
        id: card.id,
        name: card.name,
        version: card.version,
        soldCount: sold.filter((c) => Date.parse(c.startsAt) >= from && Date.parse(c.startsAt) < to).length,
        netAmount: amount(values.reduce((sum, f) => sum + f.cents, 0n)),
        holderCount: new Set(sold.map((c) => c.memberId)).size,
        usageCount: rows('cardUsage').filter(
          (u) =>
            stores.some((s) => s.id === u.storeId) &&
            find('memberCards', u.memberCardId).cardTemplateId === card.id &&
            Date.parse(u.occurredAt) >= from &&
            Date.parse(u.occurredAt) < to,
        ).length,
      };
    });
    return page(result, { page: query.page, pageSize: query.pageSize });
  }
  return undefined;
}
export function sales(req: Request): any {
  const { actor, method, query } = req;
  const [resource = '', rid, action, extra] = req.path.split('/').filter(Boolean);
  if (
    resource === 'stores' &&
    rid &&
    action &&
    ['online-sales-settings', 'subscription-settings', 'verification-settings'].includes(action) &&
    !extra
  )
    return settings(req, rid, action);
  if (
    resource === 'reports' &&
    rid &&
    ['member-cards', 'members', 'performance'].includes(rid) &&
    !action &&
    method === 'GET'
  )
    return reports(req, rid);
  const tables: Record<string, string> = {
    'self-service-card-orders': 'orders',
    subscriptions: 'subscriptions',
    verifications: 'verifications',
  };
  const table = tables[resource];
  if (!table) return undefined;
  if (extra || method !== 'GET') fail('接口不存在', 404);
  allowed(actor, 'sales:read');
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  if (query.memberId) memberScope(actor, uuid(query.memberId), query.storeId);
  const row = rid ? find(table, uuid(rid)) : undefined;
  if (row) storeScope(actor, row.storeId);
  if (resource === 'self-service-card-orders') {
    const qualifies = (order: Row) =>
      ['app', 'miniapp'].includes(order.channel) &&
      rows('orderItems').some((i) => i.orderId === order.id && i.productType === 'card');
    if (row && !qualifies(row)) fail('记录不存在', 404);
    if (action) fail('接口不存在', 404);
    if (row)
      return {
        ...decorate(row),
        items: rows('orderItems').filter((i) => i.orderId === row.id),
        cards: rows('memberCards').filter((c) =>
          rows('orderItems').some((i) => i.id === c.orderItemId && i.orderId === row.id),
        ),
        payments: rows('payments')
          .filter((p) => p.orderId === row.id)
          .map((p) => ({
            id: p.id,
            amount: p.amount,
            status: p.status,
            paidAt: p.paidAt,
          })),
        refunds: rows('refunds').filter((r) =>
          rows('payments').some((p) => p.id === r.paymentTransactionId && p.orderId === row.id),
        ),
      };
    return page(
      scopeRows(actor, rows(table))
        .filter((order) => qualifies(order))
        .map((r) => decorate(r)),
      query,
      'orderedAt',
    );
  }
  if (resource === 'subscriptions' && row && action === 'cycles')
    return page(
      rows('subscriptionCycles').filter((c) => c.agreementId === row.id),
      query,
      'periodStart',
    );
  if (action) fail('接口不存在', 404);
  return row
    ? decorate(row)
    : page(
        scopeRows(actor, rows(table)).map((r) => decorate(r)),
        query,
        resource === 'verifications' ? 'verifiedAt' : 'signedAt',
      );
}
