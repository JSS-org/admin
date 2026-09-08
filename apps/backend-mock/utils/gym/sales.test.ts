import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, insert, seedId } from './core';
import { sales } from './sales';
import { reset } from './state';
function call(
  username: string,
  method: string,
  path: string,
  body = {},
  query = {},
) {
  return sales({
    actor: authenticate(login(username, '123456').accessToken),
    method,
    path,
    body,
    query,
  });
}
beforeEach(reset);
describe('sales settings and reports', () => {
  it('validates published card scopes and leaves existing settings intact on error', () => {
    const path = `/stores/${seedId(2)}/online-sales-settings`;
    expect(() => call('store1', 'PUT', path, {})).toThrow('权限');
    expect(() =>
      call('hq', 'PUT', path, {
        enabled: true,
        contractRequired: true,
        offers: [
          { cardTemplateId: seedId(41), salePrice: '10.00', enabled: true },
        ],
      }),
    ).toThrow('不适用');
    expect(call('hq', 'GET', path).offers[0].salePrice).toBe('199.00');
    call('hq', 'PUT', path, {
      enabled: false,
      contractRequired: true,
      offers: [],
    });
    expect(call('hq', 'GET', path).enabled).toBe(false);
  });
  it('filters self service card orders and financial totals by store', () => {
    expect(call('store1', 'GET', '/self-service-card-orders').total).toBe(5);
    expect(() =>
      call('store1', 'GET', `/self-service-card-orders/${seedId(706)}`),
    ).toThrow('不可访问');
    expect(() =>
      call('hq', 'GET', `/self-service-card-orders/${seedId(741)}`),
    ).toThrow('不存在');
    const data = call('store1', 'GET', '/reports/performance');
    expect(data.summary.netAmount).toBe('2995.00');
    expect(data.items[0].ptAmount).toBe('2000.00');
    expect(data.items[0].averageEmployeeAmount).toBe('2995.00');
  });
  it('attributes a later refund to its own date and keeps earlier receipts unchanged', () => {
    find('payments', seedId(721)).paidAt = '2026-07-10T10:00:00+08:00';
    insert('refunds', {
      paymentTransactionId: seedId(721),
      amount: '49.00',
      status: 'succeeded',
      refundedAt: '2026-08-10T10:00:00+08:00',
    });
    expect(
      call('store1', 'GET', '/reports/performance', {}, { month: '2026-07' })
        .summary.netAmount,
    ).toBe('199.00');
    expect(
      call('store1', 'GET', '/reports/performance', {}, { month: '2026-08' })
        .summary.netAmount,
    ).toBe('-49.00');
  });
});
