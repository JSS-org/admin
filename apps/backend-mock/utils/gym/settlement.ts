import type { Request, Row } from './core';

import {
  audit,
  choice,
  date,
  fail,
  find,
  insert,
  integer,
  now,
  only,
  page,
  rows,
  storeScope,
  str,
  uuid,
} from './core';
import { marketingHQ } from './coupons';

export function ratio(value: unknown): number {
  const text = String(value ?? '');
  if (!/^(0(?:\.\d{1,6})?|1(?:\.0{1,6})?)$/.test(text))
    fail('比例须在0到1之间，最多六位小数');
  return Math.round(Number(text) * 1_000_000);
}
export function effectiveDates(data: Record<string, any>) {
  const effectiveFrom = date(data.effectiveFrom, '生效日期');
  const effectiveTo = data.effectiveTo
    ? date(data.effectiveTo, '失效日期')
    : null;
  if (effectiveFrom.length !== 10 || (effectiveTo && effectiveTo.length !== 10))
    fail('有效期须为日期');
  if (effectiveTo && effectiveTo <= effectiveFrom)
    fail('失效日期须晚于生效日期');
  return { effectiveFrom, effectiveTo };
}
export function overlaps(a: Record<string, any>, b: Record<string, any>) {
  return (
    a.effectiveFrom < (b.effectiveTo ?? '9999-12-31') &&
    b.effectiveFrom < (a.effectiveTo ?? '9999-12-31')
  );
}
function accountView(row: Row) {
  return {
    id: row.id,
    storeId: row.storeId,
    storeName: row.storeId ? find('stores', row.storeId).name : '总部',
    provider: row.provider,
    merchantId: row.merchantId,
    accountName: row.accountName,
    accountMasked: row.accountMasked,
    bindingStatus: row.bindingStatus,
    boundAt: row.boundAt,
    createdAt: row.createdAt,
  };
}
function ruleData(body: Record<string, any>) {
  const dates = effectiveDates(body);
  const cycleUnit = choice(
    body.cycleUnit,
    ['day', 'week', 'month'],
    '结算周期',
  );
  const cycleValue = integer(body.cycleValue, '周期间隔', 1, 365);
  if (
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    body.items.length > 50
  )
    fail('须配置1到50个接收账户');
  const items = body.items.map((item: Row) => {
    only(item, ['paymentAccountId', 'ratio']);
    const account = find('paymentAccounts', uuid(item.paymentAccountId));
    return {
      paymentAccountId: account.id,
      ratio: (ratio(item.ratio) / 1_000_000).toFixed(6),
    };
  });
  if (new Set(items.map((i) => i.paymentAccountId)).size !== items.length)
    fail('接收账户不可重复');
  if (items.reduce((sum, i) => sum + ratio(i.ratio), 0) !== 1_000_000)
    fail('分账比例合计必须为1');
  return { ...dates, cycleUnit, cycleValue, items };
}
export function settlement(req: Request): any {
  const { actor, body, method, query } = req;
  const [resource, rid, action, extra] = req.path.split('/').filter(Boolean);
  const storeRules =
    resource === 'stores' && action === 'settlement-rules' && !extra;
  if (
    !storeRules &&
    !['payment-accounts', 'settlement-rules', 'settlements'].includes(
      resource ?? '',
    )
  )
    return undefined;
  marketingHQ(
    req,
    resource === 'settlements' ? 'settlement:read' : 'settlement:manage',
  );
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  if (resource === 'payment-accounts') {
    if (!rid && method === 'GET')
      return page(
        rows('paymentAccounts')
          .filter(
            (r) =>
              (!query.provider || r.provider === query.provider) &&
              (!query.bindingStatus || r.bindingStatus === query.bindingStatus),
          )
          .map((r) => accountView(r)),
        query,
      );
    if (!rid && method === 'POST') {
      only(body, [
        'storeId',
        'provider',
        'merchantId',
        'accountName',
        'accountDetails',
      ]);
      const storeId = body.storeId
        ? storeScope(actor, uuid(body.storeId)).id
        : null;
      const provider = choice(
        body.provider,
        ['wechat', 'alipay', 'bank'],
        '支付渠道',
      );
      const merchantId = str(body.merchantId, '商户号', 128);
      if (
        rows('paymentAccounts').some(
          (r) => r.provider === provider && r.merchantId === merchantId,
        )
      )
        fail('渠道商户号已存在', 409);
      const accountName = str(body.accountName, '账户名称');
      only(body.accountDetails, ['lastFour', 'credentialRef']);
      const lastFour = str(body.accountDetails.lastFour, '账号末四位', 4);
      if (!/^\d{4}$/.test(lastFour)) fail('账号末四位须为四位数字');
      const credentialSecretRef = body.accountDetails.credentialRef
        ? str(body.accountDetails.credentialRef, '凭据引用', 255)
        : null;
      const row = insert('paymentAccounts', {
        storeId,
        provider,
        merchantId,
        accountName,
        accountMasked: `****${lastFour}`,
        credentialSecretRef,
        bindingStatus: 'unbound',
      });
      audit(req, 'payment-account.create', row);
      return accountView(row);
    }
    if (rid) {
      const row = find('paymentAccounts', uuid(rid));
      if (action === 'bindings' && !extra && method === 'POST') {
        only(body, []);
        fail('支付渠道尚未配置，未执行账户绑定', 503);
      }
      if (!action && method === 'PATCH') {
        only(body, ['accountName', 'credentialRef']);
        const changes: Record<string, any> = {};
        if (body.accountName !== undefined)
          changes.accountName = str(body.accountName, '账户名称');
        if (body.credentialRef !== undefined)
          changes.credentialSecretRef =
            body.credentialRef === null
              ? null
              : str(body.credentialRef, '凭据引用', 255);
        Object.assign(row, changes, { updatedAt: now() });
        audit(req, 'payment-account.update', row);
        return accountView(row);
      }
    }
  }
  if (storeRules) {
    const storeId = storeScope(actor, uuid(rid)).id;
    if (method === 'GET')
      return page(
        rows('settlementRules').filter((r) => r.storeId === storeId),
        query,
      );
    if (method === 'POST') {
      only(body, [
        'cycleUnit',
        'cycleValue',
        'effectiveFrom',
        'effectiveTo',
        'items',
      ]);
      const data = ruleData(body);
      const version =
        Math.max(
          0,
          ...rows('settlementRules')
            .filter((r) => r.storeId === storeId)
            .map((r) => r.version),
        ) + 1;
      const row = insert('settlementRules', {
        storeId,
        version,
        ...data,
        status: 'draft',
      });
      audit(req, 'settlement-rule.create', row);
      return row;
    }
  }
  if (resource === 'settlement-rules' && rid && !action && method === 'PATCH') {
    const row = find('settlementRules', uuid(rid));
    only(body, [
      'cycleUnit',
      'cycleValue',
      'effectiveFrom',
      'effectiveTo',
      'items',
      'status',
    ]);
    if (row.status !== 'draft') fail('已启用规则不可修改，请新建版本', 409);
    const data = ruleData({ ...row, ...body });
    const status =
      body.status === undefined
        ? row.status
        : choice(body.status, ['draft', 'active']);
    if (status === 'active') {
      if (
        data.items.some(
          (i) =>
            find('paymentAccounts', i.paymentAccountId).bindingStatus !==
            'bound',
        )
      )
        fail('只有已通过渠道绑定的账户可以启用分账');
      if (
        rows('settlementRules').some(
          (r) =>
            r.id !== row.id &&
            r.storeId === row.storeId &&
            r.status === 'active' &&
            overlaps(r, data),
        )
      )
        fail('已启用规则有效期重叠', 409);
    }
    Object.assign(row, data, { status, updatedAt: now() });
    audit(req, 'settlement-rule.update', row);
    return row;
  }
  if (resource === 'settlements') {
    const view = (row: Row) => ({
      ...row,
      storeId: find('orders', row.orderId).storeId,
      storeName: find('stores', find('orders', row.orderId).storeId).name,
      orderNo: find('orders', row.orderId).orderNo,
    });
    if (!rid && method === 'GET')
      return page(
        rows('settlements').map((r) => view(r)),
        query,
        'dueAt',
      );
    if (rid && !action && method === 'GET') {
      const row = view(find('settlements', uuid(rid)));
      return {
        ...row,
        items: rows('settlementItems')
          .filter((i) => i.settlementId === rid)
          .map((i) => ({
            ...i,
            accountName: find('paymentAccounts', i.paymentAccountId)
              .accountName,
            accountMasked: find('paymentAccounts', i.paymentAccountId)
              .accountMasked,
          })),
      };
    }
  }
  fail('接口不存在', 404);
}
