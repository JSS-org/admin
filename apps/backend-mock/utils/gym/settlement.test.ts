import { beforeEach, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, seedId } from './core';
import { settlement } from './settlement';
import { reset } from './state';
function call(username: string, method: string, path: string, body = {}) {
  return settlement({
    actor: authenticate(login(username, '123456').accessToken),
    method,
    path,
    body,
    query: {},
  });
}
beforeEach(reset);
it('masks account data and never fabricates channel bindings', () => {
  const account = call('hq', 'POST', '/payment-accounts', {
    provider: 'bank',
    merchantId: 'demo',
    accountName: '开发账户',
    accountDetails: { lastFour: '1234', credentialRef: 'secret/demo' },
  });
  expect(account.accountMasked).toBe('****1234');
  expect(account.credentialSecretRef).toBeUndefined();
  expect(() =>
    call('hq', 'POST', `/payment-accounts/${account.id}/bindings`),
  ).toThrow('尚未配置');
  expect(() => call('store1', 'GET', '/payment-accounts')).toThrow('权限');
});
it('validates ratios, bound accounts, effective overlap and immutable versions', () => {
  const account = call('hq', 'POST', '/payment-accounts', {
    provider: 'bank',
    merchantId: 'demo',
    accountName: '开发账户',
    accountDetails: { lastFour: '1234' },
  });
  const data = {
    cycleUnit: 'day',
    cycleValue: 1,
    effectiveFrom: '2026-01-01',
    items: [{ paymentAccountId: account.id, ratio: '0.9' }],
  };
  const path = `/stores/${seedId(1)}/settlement-rules`;
  expect(() => call('hq', 'POST', path, data)).toThrow('合计');
  data.items = [{ paymentAccountId: account.id, ratio: '1' }];
  const rule = call('hq', 'POST', path, data);
  expect(() =>
    call('hq', 'PATCH', `/settlement-rules/${rule.id}`, { status: 'active' }),
  ).toThrow('渠道绑定');
  find('paymentAccounts', account.id).bindingStatus = 'bound';
  call('hq', 'PATCH', `/settlement-rules/${rule.id}`, { status: 'active' });
  expect(() =>
    call('hq', 'PATCH', `/settlement-rules/${rule.id}`, { cycleValue: 2 }),
  ).toThrow('新建版本');
  const next = call('hq', 'POST', path, data);
  expect(() =>
    call('hq', 'PATCH', `/settlement-rules/${next.id}`, { status: 'active' }),
  ).toThrow('重叠');
});
