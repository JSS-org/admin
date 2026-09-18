import { beforeEach, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, insert, rows, seedId } from './core';
import { dashboard } from './dashboard';
import { reset } from './state';
beforeEach(reset);
function get(username = 'hq', query: Record<string, any> = {}) {
  return dashboard({
    actor: authenticate(login(username, '123456').accessToken),
    method: 'GET',
    path: '/reports/dashboard',
    body: {},
    query,
  });
}
it('scopes aggregate metrics and courses to the authorized store', () => {
  expect(get('hq').metrics.activeMembers).toBe(6);
  expect(get('store1').metrics.activeMembers).toBe(5);
  expect(get('store1').upcoming.every((row: any) => row.storeName === '上海一店')).toBe(true);
  expect(() => get('store1', { storeId: seedId(2) })).toThrow('不可访问');
  expect(get().trend).toHaveLength(7);
  expect(get('hq', { days: 30 }).trend).toHaveLength(30);
});
it('buckets receipts and refunds by their actual date, including empty days', () => {
  find('payments', seedId(721)).paidAt = '2026-07-01T23:59:00+08:00';
  insert('refunds', {
    paymentTransactionId: seedId(721),
    amount: '49.00',
    status: 'succeeded',
    refundedAt: '2026-07-02T00:01:00+08:00',
  });
  const data = get('store1', { date: '2026-07-07', days: 7 });
  expect(data.trend[0]).toMatchObject({ date: '2026-07-01', netAmount: '199.00' });
  expect(data.trend[1]).toMatchObject({ date: '2026-07-02', netAmount: '-49.00' });
  expect(data.trend[2].netAmount).toBe('0.00');
  expect(data.metrics.netAmount).toBe('150.00');
});
it('lists pending approvals that the current approver can decide', () => {
  const data = get('hq');
  expect(data.pendingApprovals).toHaveLength(5);
  expect(
    data.pendingApprovals.every((row: any) => row.title && row.businessType && row.storeName && row.submittedAt),
  ).toBe(true);
  expect(get('store1').pendingApprovals).toEqual([]);
});
it('does not double-count a member belonging to multiple stores', () => {
  const before = get().metrics.activeMembers;
  insert('memberStores', { memberId: seedId(101), storeId: seedId(2) });
  expect(get().metrics.activeMembers).toBe(before);
  rows('bookings').push({ id: 'booking', sessionId: seedId(341), status: 'confirmed' });
  expect(get().upcoming.find((row: any) => row.id === seedId(341)).reservedCount).toBe(1);
});
