import type { Request, Row } from './core';

import { createHash, randomBytes } from 'node:crypto';

import {
  accessibleStores,
  allowed,
  audit,
  choice,
  date,
  decorate,
  fail,
  find,
  insert,
  integer,
  listIds,
  memberScope,
  money,
  now,
  only,
  page,
  rows,
  scopeRows,
  storeScope,
  str,
  uuid,
} from './core';

export function batchIdentity(req: Request, table: string) {
  const key = str(req.key, 'Idempotency-Key', 128);
  function canonical(value: any): any {
    if (Array.isArray(value)) return value.map((item) => canonical(item));
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.keys(value)
          .toSorted()
          .map((k) => [k, canonical(value[k])]),
      );
    return value;
  }
  const digest = createHash('sha256')
    .update(JSON.stringify(canonical(req.body)))
    .digest('hex');
  const previous = rows(table).find(
    (b) => b.createdBy === req.actor.id && b.requestKey === key,
  );
  if (previous && previous.requestDigest !== digest)
    fail('幂等键已用于不同批量操作', 409);
  return {
    previous,
    fields: { createdBy: req.actor.id, requestKey: key, requestDigest: digest },
  };
}
export function marketingHQ(req: Request, code: string) {
  allowed(req.actor, code);
  if (!req.actor.globalCodes.includes(code)) fail('仅总部可管理', 403);
}
function usable(template: Row, storeId: string) {
  return template.scope === 'all' || template.storeIds.includes(storeId);
}
function templateVisible(req: Request, template: Row) {
  const stores = accessibleStores(req.actor);
  return !stores || stores.some((s) => usable(template, s));
}
function requireTemplate(req: Request, id: string, issuing = false) {
  const template = find('couponTemplates', uuid(id));
  if (!templateVisible(req, template)) fail('优惠券模板不可访问', 404);
  if (
    template.status !== 'active' ||
    Date.parse(template.expiresAt) <= Date.now() ||
    (issuing && Date.parse(template.startsAt) > Date.now())
  )
    fail('优惠券未生效、已停用或过期', 409);
  return template;
}
function quotaView(row: Row) {
  return {
    ...decorate(row),
    templateName: find('couponTemplates', row.templateId).name,
    availableCount: row.allocatedCount - row.reservedCount - row.issuedCount,
  };
}
function ledger(
  quota: Row,
  action: string,
  allocatedDelta: number,
  reservedDelta: number,
  issuedDelta: number,
  sourceId: string,
) {
  insert('couponQuotaLedger', {
    quotaId: quota.id,
    templateId: quota.templateId,
    storeId: quota.storeId,
    action,
    allocatedDelta,
    reservedDelta,
    issuedDelta,
    sourceKey: `${action}:${sourceId}`,
    allocationItemId: action === 'allocate' ? sourceId : null,
    recipientId: action === 'allocate' ? null : sourceId,
    occurredAt: now(),
  });
}
function batchView(req: Request, batch: Row) {
  const recipients = scopeRows(
    req.actor,
    rows('couponRecipients').filter((r) => r.batchId === batch.id),
  );
  if (recipients.length === 0) fail('批次不可访问', 404);
  const successCount = recipients.filter(
    (r) => r.status === 'succeeded',
  ).length;
  return {
    id: batch.id,
    templateId: batch.templateId,
    createdAt: batch.createdAt,
    completedAt: batch.completedAt,
    status: batch.status,
    recipientCount: recipients.length,
    successCount,
    failureCount: recipients.length - successCount,
    recipients: recipients.map((r) => decorate(r)),
  };
}
export function coupons(req: Request): any {
  const { actor, method, body, query } = req;
  const [resource = '', rid, action, extra] = req.path
    .split('/')
    .filter(Boolean);
  if (
    ![
      'coupon-batches',
      'coupon-quota-batches',
      'coupon-quota-ledger',
      'coupon-store-quotas',
      'coupon-templates',
      'gift-code-batches',
      'member-coupons',
    ].includes(resource)
  )
    return undefined;
  if (extra) fail('接口不存在', 404);
  if (rid) uuid(rid);
  if (resource === 'gift-code-batches') return gifts(req, rid, action);
  let code = 'coupons:read';
  if (resource === 'coupon-quota-batches') code = 'coupons:allocate';
  else if (method !== 'GET')
    code = resource === 'coupon-batches' ? 'coupons:issue' : 'coupons:manage';
  allowed(actor, code);
  if (['coupons:allocate', 'coupons:manage'].includes(code))
    marketingHQ(req, code);
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  if (query.memberId) memberScope(actor, uuid(query.memberId), query.storeId);
  if (resource === 'coupon-templates') {
    if (action) fail('接口不存在', 404);
    const row = rid ? find('couponTemplates', rid) : undefined;
    if (row && !templateVisible(req, row)) fail('模板不可访问', 404);
    if (method === 'GET')
      return (
        row ??
        page(
          rows('couponTemplates').filter(
            (t) =>
              templateVisible(req, t) &&
              (!query.storeId || usable(t, query.storeId)),
          ),
          { ...query, storeId: undefined },
        )
      );
    if ((!row && method === 'POST') || (row && method === 'PATCH')) {
      only(body, [
        'name',
        'kind',
        'discountAmount',
        'discountRate',
        'minimumSpend',
        'startsAt',
        'expiresAt',
        'totalLimit',
        'perMemberLimit',
        'scope',
        'storeIds',
        'applicableProductType',
        ...(row ? ['status'] : []),
      ]);
      if (
        row &&
        row.allocatedCount > 0 &&
        Object.keys(body).some((k) => k !== 'status')
      )
        fail('已分配额度或已发券的模板只能停用，请新建模板', 409);
      const data = {
        status: 'active',
        allocatedCount: 0,
        issuedCount: 0,
        storeIds: [],
        ...row,
        ...body,
      } as Row;
      data.name = str(data.name, '优惠券名称');
      choice(data.kind, ['amount', 'rate'], '优惠方式');
      choice(data.scope, ['all', 'selected'], '门店范围');
      choice(data.status, ['active', 'inactive']);
      data.minimumSpend = money(data.minimumSpend);
      if (data.kind === 'amount') {
        data.discountAmount = money(data.discountAmount);
        if (Number(data.discountAmount) <= 0) fail('减免金额须大于0');
        data.discountRate = null;
      } else {
        if (
          !/^0\.\d{1,6}$/.test(String(data.discountRate)) ||
          Number(data.discountRate) <= 0
        )
          fail('折扣比例须大于0且小于1，最多6位小数');
        data.discountAmount = null;
      }
      data.startsAt = new Date(date(data.startsAt, '开始时间')).toISOString();
      data.expiresAt = new Date(date(data.expiresAt, '过期时间')).toISOString();
      if (data.startsAt >= data.expiresAt) fail('过期时间必须晚于开始时间');
      data.totalLimit =
        data.totalLimit === null || data.totalLimit === undefined
          ? null
          : integer(data.totalLimit, '总张数上限', 1, 1_000_000_000);
      data.perMemberLimit = integer(
        data.perMemberLimit,
        '每人领取上限',
        1,
        1000,
      );
      data.storeIds = listIds(data.storeIds, '门店');
      data.storeIds.forEach((s: string) => storeScope(actor, s));
      if (data.scope === 'selected' && data.storeIds.length === 0)
        fail('至少选择一个门店');
      if (data.applicableProductType)
        choice(
          data.applicableProductType,
          ['card', 'course', 'all'],
          '商品类型',
        );
      return row
        ? Object.assign(row, data, { updatedAt: now() })
        : insert('couponTemplates', data);
    }
  }
  if (resource === 'coupon-store-quotas' && method === 'GET' && !rid)
    return page(
      scopeRows(actor, rows('couponQuotas')).map((q) => quotaView(q)),
      query,
    );
  if (resource === 'coupon-quota-ledger' && method === 'GET' && !rid)
    return page(
      scopeRows(actor, rows('couponQuotaLedger')).map((r) => decorate(r)),
      query,
      'occurredAt',
    );
  if (resource === 'member-coupons' && method === 'GET' && !rid)
    return page(
      scopeRows(actor, rows('memberCoupons')).map((r) => ({
        ...decorate(r),
        templateName: find('couponTemplates', r.templateId).name,
      })),
      query,
      'issuedAt',
    );
  if (resource === 'coupon-quota-batches') {
    const row = rid ? find('couponQuotaBatches', rid) : undefined;
    if (method === 'GET') {
      if (row && action === 'items')
        return page(
          rows('couponQuotaItems')
            .filter((i) => i.batchId === row.id)
            .map((i) => decorate(i)),
          query,
        );
      if (action) fail('接口不存在', 404);
      return row ?? page(rows('couponQuotaBatches'), query);
    }
    if (method === 'POST' && !rid) {
      only(body, ['templateId', 'targetMode', 'storeIds', 'quantityPerStore']);
      const identity = batchIdentity(req, 'couponQuotaBatches');
      if (identity.previous) return identity.previous;
      const template = requireTemplate(req, body.templateId);
      const targetMode = choice(
        body.targetMode,
        ['selected', 'allEligible'],
        '目标范围',
      );
      if (targetMode === 'allEligible' && body.storeIds !== undefined)
        fail('全部适用门店不能同时指定门店列表');
      const selected =
        targetMode === 'selected'
          ? listIds(body.storeIds, '门店')
          : rows('stores')
              .filter((s) => s.status === 'active' && usable(template, s.id))
              .map((s) => s.id);
      if (selected.length === 0) fail('没有符合条件的门店');
      for (const storeId of selected) {
        const store = storeScope(actor, storeId);
        if (store.status !== 'active' || !usable(template, storeId))
          fail('包含停用或不适用的门店');
      }
      const quantity = integer(body.quantityPerStore, '每店张数', 1, 1_000_000);
      const total = quantity * selected.length;
      if (
        !Number.isSafeInteger(total) ||
        (template.totalLimit !== null &&
          template.allocatedCount + total > template.totalLimit)
      )
        fail('优惠券总部可分配总额不足', 409);
      const batch = insert('couponQuotaBatches', {
        ...identity.fields,
        templateId: template.id,
        targetMode,
        selectorSnapshot: { storeIds: selected },
        quantityPerStore: quantity,
        targetCount: selected.length,
        totalQuantity: total,
        status: 'succeeded',
        successCount: selected.length,
        failureCount: 0,
        completedAt: now(),
      });
      template.allocatedCount += total;
      for (const storeId of selected) {
        const item = insert('couponQuotaItems', {
          batchId: batch.id,
          storeId,
          quantity,
          status: 'succeeded',
          processedAt: now(),
        });
        const quota =
          rows('couponQuotas').find(
            (q) => q.templateId === template.id && q.storeId === storeId,
          ) ??
          insert('couponQuotas', {
            templateId: template.id,
            storeId,
            allocatedCount: 0,
            reservedCount: 0,
            issuedCount: 0,
            status: 'active',
          });
        quota.allocatedCount += quantity;
        ledger(quota, 'allocate', quantity, 0, 0, item.id);
      }
      audit(req, 'coupon.allocate', batch, {
        targetCount: selected.length,
        totalQuantity: total,
      });
      return batch;
    }
  }
  if (resource === 'coupon-batches') {
    const row = rid ? find('couponBatches', rid) : undefined;
    if (action) fail('接口不存在', 404);
    if (method === 'GET') {
      if (row) return batchView(req, row);
      const visibleIds = new Set(
        scopeRows(actor, rows('couponRecipients'))
          .filter((r) => !query.storeId || r.storeId === query.storeId)
          .map((r) => r.batchId),
      );
      return page(
        rows('couponBatches')
          .filter((b) => visibleIds.has(b.id))
          .map((b) => batchView(req, b)),
        { ...query, storeId: undefined },
      );
    }
    if (method === 'POST' && !rid) {
      only(body, ['templateId', 'targets']);
      const identity = batchIdentity(req, 'couponBatches');
      if (identity.previous) return batchView(req, identity.previous);
      const template = requireTemplate(req, body.templateId, true);
      if (
        !Array.isArray(body.targets) ||
        body.targets.length === 0 ||
        body.targets.length > 500
      )
        fail('单次请选择1到500位会员');
      const targets: { memberId: string; storeId: string }[] = [];
      for (const target of body.targets) {
        only(target, ['storeId', 'memberId']);
        const storeId = uuid(target.storeId);
        const memberId = uuid(target.memberId);
        memberScope(actor, memberId, storeId);
        if (!usable(template, storeId)) fail('优惠券不适用于目标门店');
        const duplicate = targets.find((t) => t.memberId === memberId);
        if (duplicate && duplicate.storeId !== storeId)
          fail('同一会员不能指定不同发行门店');
        if (!duplicate) targets.push({ memberId, storeId });
      }
      const demands = new Map<string, number>();
      for (const target of targets)
        demands.set(target.storeId, (demands.get(target.storeId) ?? 0) + 1);
      const quotas = new Map<string, Row>();
      for (const [storeId, count] of demands) {
        const quota = rows('couponQuotas').find(
          (q) => q.storeId === storeId && q.templateId === template.id,
        );
        if (
          !quota ||
          quota.status !== 'active' ||
          quota.allocatedCount - quota.reservedCount - quota.issuedCount < count
        )
          fail('目标门店可发券额度不足', 409);
        quotas.set(storeId, quota);
      }
      const batch = insert('couponBatches', {
        ...identity.fields,
        templateId: template.id,
        recipientCount: targets.length,
        status: 'succeeded',
        completedAt: now(),
      });
      for (const target of targets) {
        const quota = quotas.get(target.storeId);
        if (!quota) fail('额度不存在');
        const recipient = insert('couponRecipients', {
          batchId: batch.id,
          ...target,
          quotaId: quota.id,
          status: 'queued',
        });
        quota.reservedCount += 1;
        ledger(quota, 'reserve', 0, 1, 0, recipient.id);
        const owned = rows('memberCoupons').filter(
          (c) => c.templateId === template.id && c.memberId === target.memberId,
        ).length;
        quota.reservedCount -= 1;
        if (owned >= template.perMemberLimit) {
          Object.assign(recipient, {
            status: 'failed',
            failureReason: '超过每人领取上限',
            processedAt: now(),
          });
          ledger(quota, 'release', 0, -1, 0, recipient.id);
        } else {
          quota.issuedCount += 1;
          template.issuedCount += 1;
          Object.assign(recipient, { status: 'succeeded', processedAt: now() });
          insert('memberCoupons', {
            templateId: template.id,
            batchId: batch.id,
            ...target,
            issuedStoreId: target.storeId,
            couponNo: `CP${randomBytes(12).toString('hex').toUpperCase()}`,
            termsSnapshot: {
              name: template.name,
              kind: template.kind,
              discountAmount: template.discountAmount,
              discountRate: template.discountRate,
              minimumSpend: template.minimumSpend,
              scope: template.scope,
              storeIds: [...template.storeIds],
            },
            status: 'available',
            issuedAt: now(),
            expiresAt: template.expiresAt,
          });
          ledger(quota, 'issue', 0, -1, 1, recipient.id);
        }
      }
      const recipients = rows('couponRecipients').filter(
        (r) => r.batchId === batch.id,
      );
      batch.status = recipients.every((r) => r.status === 'succeeded')
        ? 'succeeded'
        : 'completed';
      audit(req, 'coupon.issue', batch);
      return batchView(req, batch);
    }
  }
  fail('接口不存在', 404);
}
function gifts(req: Request, rid?: string, action?: string) {
  marketingHQ(req, 'gifts:manage');
  const { method, body, query } = req;
  if (action) fail('接口不存在', 404);
  if (method === 'GET')
    return rid
      ? {
          ...find('giftBatches', rid),
          codes: rows('giftCodes')
            .filter((c) => c.batchId === rid)
            .map((c) => ({
              id: c.id,
              codeMasked: c.codeMasked,
              status: c.status,
              redeemedAt: c.redeemedAt,
            })),
        }
      : page(rows('giftBatches'), query);
  if (method === 'POST' && !rid) {
    only(body, [
      'name',
      'rewardType',
      'cardTemplateId',
      'courseProductId',
      'pointAmount',
      'count',
      'expiresAt',
    ]);
    const identity = batchIdentity(req, 'giftBatches');
    if (identity.previous) return identity.previous;
    const data = { ...body };
    data.name = str(data.name, '批次名称');
    choice(data.rewardType, ['card', 'course', 'points'], '礼品类型');
    if (
      [data.cardTemplateId, data.courseProductId, data.pointAmount].filter(
        (v) => v !== undefined && v !== null,
      ).length !== 1
    )
      fail('请选择且仅选择一种礼品权益');
    if (
      data.rewardType === 'card' &&
      find('cardTemplates', uuid(data.cardTemplateId)).status !== 'published'
    )
      fail('请选择已发布卡种');
    if (
      data.rewardType === 'course' &&
      find('courseProducts', uuid(data.courseProductId)).status !== 'active'
    )
      fail('请选择有效课程');
    if (data.rewardType === 'points')
      data.pointAmount = integer(data.pointAmount, '积分', 1, 1_000_000);
    data.count = integer(data.count, '数量', 1, 1000);
    data.expiresAt = new Date(date(data.expiresAt, '过期时间')).toISOString();
    if (Date.parse(data.expiresAt) <= Date.now()) fail('过期时间必须在未来');
    const batch = insert('giftBatches', {
      ...data,
      ...identity.fields,
      status: 'active',
    });
    const plainCodes: string[] = [];
    for (let i = 0; i < data.count; i++) {
      const code = randomBytes(16).toString('hex').toUpperCase();
      plainCodes.push(code);
      insert('giftCodes', {
        batchId: batch.id,
        codeDigest: createHash('sha256').update(code).digest('hex'),
        codeMasked: `****${code.slice(-4)}`,
        status: 'available',
      });
    }
    return { ...batch, plainCodes };
  }
  fail('接口不存在', 404);
}
