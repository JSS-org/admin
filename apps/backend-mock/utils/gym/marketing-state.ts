import { insert, now, seedId } from './core';
export function seedMarketing() {
  const expiresAt = new Date(Date.now() + 90 * 86_400_000).toISOString();
  insert('couponTemplates', {
    id: seedId(800),
    name: '新人满100减20元',
    kind: 'amount',
    discountAmount: '20.00',
    discountRate: null,
    minimumSpend: '100.00',
    startsAt: now(),
    expiresAt,
    totalLimit: 10_000,
    allocatedCount: 0,
    issuedCount: 0,
    perMemberLimit: 1,
    scope: 'all',
    storeIds: [],
    status: 'active',
    applicableProductType: 'all',
  });
  for (const [n, eventType, name] of [
    [1, 'checkin', '运动打卡积分'],
    [2, 'consumption', '消费积分'],
    [3, 'invitation', '邀请积分'],
  ] as const)
    insert('pointRules', {
      id: seedId(810 + n),
      ruleKey: seedId(810 + n),
      version: 1,
      name,
      eventType,
      thresholdAmount: eventType === 'consumption' ? '10.00' : null,
      points: 10,
      dailyLimit: 100,
      effectiveFrom: now(),
      status: 'active',
    });
  insert('pointProducts', {
    id: seedId(820),
    name: '积分兑换月卡',
    kind: 'card',
    cardTemplateId: seedId(40),
    pointsPrice: 1000,
    stock: 100,
    status: 'active',
  });
  insert('pointAccounts', {
    id: seedId(830),
    memberId: seedId(101),
    balance: 10,
  });
  insert('pointLedger', {
    id: seedId(840),
    memberId: seedId(101),
    storeId: seedId(1),
    ruleId: seedId(811),
    delta: 10,
    balanceAfter: 10,
    eventType: 'checkin',
    sourceKey: 'seed-points-1',
    occurredAt: now(),
  });
}
