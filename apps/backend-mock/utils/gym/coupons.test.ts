import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, insert, rows, seedId } from './core';
import { coupons } from './coupons';
import { marketing } from './marketing';
import { reset } from './state';
function call(username: string, method: string, path: string, body = {}, key?: string) {
  const req = {
    actor: authenticate(login(username, '123456').accessToken),
    method,
    path,
    body,
    query: {},
    key,
  };
  return coupons(req) ?? marketing(req);
}
function allocate(quantity = 10) {
  return call(
    'hq',
    'POST',
    '/coupon-quota-batches',
    {
      templateId: seedId(800),
      targetMode: 'allEligible',
      quantityPerStore: quantity,
    },
    'allocation',
  );
}
beforeEach(reset);
describe('coupon quotas and bulk management', () => {
  it('snapshots all eligible stores and replays allocation without double credit', () => {
    const first = allocate();
    expect(first.totalQuantity).toBe(20);
    expect(rows('memberCoupons')).toHaveLength(0);
    insert('stores', { name: '后加入店', status: 'active' });
    expect(allocate().id).toBe(first.id);
    expect(rows('couponQuotas')).toHaveLength(2);
    expect(find('couponTemplates', seedId(800)).allocatedCount).toBe(20);
    expect(() => allocate(11)).toThrow('幂等键');
  });
  it('fails insufficient total allocation and mixed unauthorized targets before mutation', () => {
    find('couponTemplates', seedId(800)).totalLimit = 1;
    expect(() => allocate()).toThrow('总额不足');
    expect(rows('couponQuotas')).toHaveLength(0);
    find('couponTemplates', seedId(800)).totalLimit = 10_000;
    allocate();
    expect(() =>
      call(
        'store1',
        'POST',
        '/coupon-batches',
        {
          templateId: seedId(800),
          targets: [
            { storeId: seedId(1), memberId: seedId(101) },
            { storeId: seedId(2), memberId: seedId(106) },
          ],
        },
        'bad',
      ),
    ).toThrow('不可访问');
    expect(rows('couponBatches')).toHaveLength(0);
    expect(rows('couponQuotas').every((q) => q.reservedCount === 0 && q.issuedCount === 0)).toBe(true);
  });
  it('consumes only successful recipients, releases personal limit failures, and hides foreign targets', () => {
    allocate();
    const body = {
      templateId: seedId(800),
      targets: [
        { storeId: seedId(1), memberId: seedId(101) },
        { storeId: seedId(2), memberId: seedId(106) },
      ],
    };
    const first = call('hq', 'POST', '/coupon-batches', body, 'issue');
    expect(first.successCount).toBe(2);
    expect(call('hq', 'POST', '/coupon-batches', body, 'issue').id).toBe(first.id);
    expect(rows('memberCoupons')).toHaveLength(2);
    expect(call('store1', 'GET', `/coupon-batches/${first.id}`).recipientCount).toBe(1);
    expect(call('hq', 'POST', '/coupon-batches', body, 'again').failureCount).toBe(2);
    expect(rows('couponQuotas').every((q) => q.reservedCount === 0 && q.issuedCount === 1)).toBe(true);
    expect(call('store1', 'GET', '/member-coupons').total).toBe(1);
  });
  it('returns full gift codes only on first generation and refuses future-client redemption', () => {
    const body = {
      name: '积分礼品',
      rewardType: 'points',
      pointAmount: 100,
      count: 2,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
    const first = call('hq', 'POST', '/gift-code-batches', body, 'gift');
    expect(first.plainCodes).toHaveLength(2);
    expect(call('hq', 'POST', '/gift-code-batches', body, 'gift').plainCodes).toBeUndefined();
    const detail = call('hq', 'GET', `/gift-code-batches/${first.id}`);
    expect(detail.codes[0].codeDigest).toBeUndefined();
    expect(detail.codes[0].codeMasked).toMatch(/^\*{4}/);
    expect(
      coupons({
        actor: authenticate(login('hq', '123456').accessToken),
        method: 'POST',
        path: '/gift-redemptions',
        body: {},
        query: {},
      }),
    ).toBeUndefined();
  });
  it('does not invent successful delivery or read receipts for mock private messages', () => {
    const data = call(
      'store1',
      'POST',
      '/message-batches',
      {
        kind: 'private',
        storeId: seedId(1),
        memberIds: [seedId(101)],
        channel: 'miniapp',
        content: '到期提醒',
      },
      'message',
    );
    expect(data.status).toBe('failed');
    expect(data.recipients[0].readStatus).toBe('unknown');
    expect(() => call('store1', 'GET', '/point-rules')).toThrow('权限');
  });
});
