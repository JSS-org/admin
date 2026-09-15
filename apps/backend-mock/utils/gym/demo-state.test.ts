import { beforeEach, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { fileContents, find, rows, seedId } from './core';
import { coupons } from './coupons';
import { seedDemo } from './demo-state';
import { payroll } from './payroll';
import { reset } from './state';

beforeEach(() => {
  reset();
  seedDemo();
});
it('provides paginated, linked member, payment, booking and media scenarios', () => {
  expect(rows('members').length).toBeGreaterThan(20);
  for (const card of rows('memberCards')) {
    expect(find('members', card.memberId)).toBeDefined();
    expect(find('orderItems', card.orderItemId)).toBeDefined();
  }
  for (const booking of rows('bookings')) {
    const session = find('courseSessions', booking.sessionId);
    expect(session.storeId).toBe(booking.storeId);
  }
  expect(
    rows('bookings')
      .filter((booking) => booking.status === 'confirmed')
      .every((booking) => find('courseSessions', booking.sessionId).status === 'scheduled'),
  ).toBe(true);
  for (const file of rows('files')) expect(fileContents.get(file.id)?.length).toBe(file.byteSize);
  expect(rows('refunds').length).toBeGreaterThan(0);
  const count = rows('members').length;
  seedDemo();
  expect(rows('members')).toHaveLength(count);
});
it('uses real quota and payroll calculations while retaining store boundaries', () => {
  const actor = authenticate(login('store1', '123456').accessToken);
  const result = coupons({ actor, method: 'GET', path: '/member-coupons', body: {}, query: {} });
  expect(result.items.length).toBeGreaterThan(0);
  expect(result.items.every((row: any) => row.storeId === seedId(1))).toBe(true);
  expect(rows('couponRecipients').some((recipient) => recipient.status === 'failed')).toBe(true);
  const run = rows('payrollRuns').find((row) => row.storeId === seedId(1));
  if (!run) throw new Error('Expected store payroll');
  const detail = payroll({ actor, method: 'GET', path: `/payrolls/${run.id}`, body: {}, query: {} });
  expect(detail.items.length).toBeGreaterThan(1);
  expect(detail.items.every((row: any) => row.calculationSnapshot.template)).toBe(true);
});
