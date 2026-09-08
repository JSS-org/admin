import { find, insert, now, rows, seedId } from './core';
export function seedSales() {
  for (let i = 1; i <= 2; i++) {
    const storeId = seedId(i);
    const cardTemplateId = seedId(40);
    insert('salesSettings', {
      id: seedId(600 + i),
      storeId,
      kind: 'online-sales-settings',
      enabled: true,
      contractRequired: true,
      offers: [{ cardTemplateId, salePrice: '199.00', enabled: true }],
    });
    insert('salesSettings', {
      id: seedId(610 + i),
      storeId,
      kind: 'subscription-settings',
      items: [
        {
          id: seedId(620 + i),
          cardTemplateId,
          price: '199.00',
          billingDay: null,
          renewalNoticeDays: 3,
          graceDays: 3,
          enabled: true,
        },
      ],
    });
    insert('salesSettings', {
      id: seedId(630 + i),
      storeId,
      kind: 'verification-settings',
      enabled: true,
      requireCheckin: true,
      supportedChannels: ['miniapp', 'app'],
    });
    const memberId = seedId(i === 1 ? 101 : 106);
    insert('subscriptions', {
      id: seedId(640 + i),
      memberId,
      storeId,
      settingId: seedId(620 + i),
      memberCardId: seedId(i === 1 ? 201 : 206),
      provider: 'mock',
      externalAgreementId: `MOCK-SUB-${i}`,
      status: 'active',
      signedAt: now(),
      nextChargeAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      termsSnapshot: { price: '199.00', renewalNoticeDays: 3 },
    });
    insert('subscriptionCycles', {
      id: seedId(650 + i),
      agreementId: seedId(640 + i),
      periodStart: now(),
      periodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      amount: '199.00',
      status: 'paid',
      chargedAt: now(),
    });
    insert('verifications', {
      id: seedId(660 + i),
      storeId,
      memberId,
      type: 'member_card',
      memberCardId: seedId(i === 1 ? 201 : 206),
      sourceKey: `seed-verification-${i}`,
      channel: 'miniapp',
      status: 'succeeded',
      verifiedAt: now(),
    });
  }
  for (const card of rows('memberCards')) {
    const n = Number(card.id.slice(-3)) - 200;
    const storeId = card.issuedStoreId;
    const orderId = seedId(700 + n);
    const itemId = seedId(710 + n);
    insert('orders', {
      id: orderId,
      orderNo: `MOCK-ORDER-${n}`,
      memberId: card.memberId,
      storeId,
      channel: 'miniapp',
      status: 'paid',
      currency: 'CNY',
      totalAmount: '199.00',
      discountAmount: '0.00',
      payableAmount: '199.00',
      paidAmount: '199.00',
      refundedAmount: '0.00',
      orderedAt: now(),
      paidAt: now(),
    });
    insert('orderItems', {
      id: itemId,
      orderId,
      productType: 'card',
      cardTemplateId: card.cardTemplateId,
      productNameSnapshot: card.name,
      quantity: 1,
      unitPrice: '199.00',
      discountAmount: '0.00',
      payableAmount: '199.00',
      productSnapshot: card.templateSnapshot,
    });
    insert('payments', {
      id: seedId(720 + n),
      orderId,
      provider: 'mock',
      merchantId: 'MOCK-MERCHANT',
      providerTransactionId: `MOCK-PAY-${n}`,
      attemptNo: 1,
      amount: '199.00',
      status: 'succeeded',
      paidAt: now(),
    });
    insert('performanceAllocations', {
      id: seedId(730 + n),
      orderItemId: itemId,
      employeeId: seedId(storeId === seedId(1) ? 21 : 22),
      storeId,
      shareRatio: '1.000000',
      amount: '199.00',
    });
    card.orderItemId = itemId;
  }
  for (let i = 1; i <= 2; i++) {
    const pack = find('memberCoursePacks', seedId(330 + i));
    const orderId = seedId(740 + i);
    const itemId = seedId(750 + i);
    insert('orders', {
      id: orderId,
      orderNo: `MOCK-PT-${i}`,
      memberId: pack.memberId,
      storeId: pack.storeId,
      channel: 'app',
      status: 'paid',
      currency: 'CNY',
      totalAmount: '2000.00',
      discountAmount: '0.00',
      payableAmount: '2000.00',
      paidAmount: '2000.00',
      refundedAmount: '0.00',
      orderedAt: now(),
      paidAt: now(),
    });
    insert('orderItems', {
      id: itemId,
      orderId,
      productType: 'course',
      courseProductId: pack.courseProductId,
      productNameSnapshot: pack.name,
      quantity: 1,
      unitPrice: '2000.00',
      discountAmount: '0.00',
      payableAmount: '2000.00',
      productSnapshot: pack.productSnapshot,
    });
    insert('payments', {
      id: seedId(760 + i),
      orderId,
      provider: 'mock',
      merchantId: 'MOCK-MERCHANT',
      providerTransactionId: `MOCK-PT-PAY-${i}`,
      attemptNo: 1,
      amount: '2000.00',
      status: 'succeeded',
      paidAt: now(),
    });
    insert('performanceAllocations', {
      id: seedId(770 + i),
      orderItemId: itemId,
      employeeId: seedId(20 + i),
      storeId: pack.storeId,
      shareRatio: '1.000000',
      amount: '2000.00',
    });
    pack.orderItemId = itemId;
    insert('cardUsage', {
      id: seedId(780 + i),
      memberCardId: seedId(i === 1 ? 201 : 206),
      storeId: seedId(i),
      checkinId: seedId(370 + i),
      deltaUses: 0,
      sourceKey: `seed-usage-${i}`,
      occurredAt: now(),
    });
  }
}
