import type { Actor, Request } from './core';

import { fileContents, find, insert, now, rows, seedId } from './core';
import { coupons } from './coupons';
import { examplePdf } from './governance-state';
import { marketing } from './marketing';
import { payroll } from './payroll';

/** Rich development scenarios. Unit tests can still reset to the small base fixture. */
export function seedDemo() {
  if (rows('members').some((row) => row.id === seedId(10_001))) return;
  const at = (days: number, hours = 0) => new Date(Date.now() + days * 86_400_000 + hours * 3_600_000).toISOString();
  const actor: Actor = {
    id: seedId(30),
    username: 'hq',
    realName: '总部管理员',
    roles: ['hq'],
    scopeType: 'hq',
    storeIds: [],
    codes: find('roles', seedId(10)).permissionCodes,
    globalCodes: find('roles', seedId(10)).permissionCodes,
    storePermissions: {},
  };
  const call = (
    handler: (request: Request) => any,
    method: string,
    path: string,
    body: Record<string, any>,
    key?: string,
  ) => handler({ actor: { ...actor }, method, path, body, query: {}, key });

  // Named staff cover single-store, cross-store, no-account and inactive cases.
  for (let i = 1; i <= 4; i++) {
    const storeId = seedId((i % 2) + 1);
    const storeIds = i === 3 ? [seedId(1), seedId(2)] : [storeId];
    const employee = insert('employees', {
      id: seedId(12_000 + i),
      employeeNo: `DEMO-E${i}`,
      name: ['林教练', '陈顾问', '周巡店', '离职示例'][i - 1],
      phone: `1381000000${i}`,
      jobTitle: i === 2 ? '会籍顾问' : '教练',
      hiredOn: '2026-01-01',
      status: i === 4 ? 'inactive' : 'active',
      storeIds,
      storeAssignments: storeIds.map((id, index) => ({
        storeId: id,
        isPrimary: index === 0,
        isManager: false,
        joinedOn: '2026-01-01',
      })),
    });
    for (const id of storeIds)
      insert('employeeSalaryAssignments', {
        employeeId: employee.id,
        storeId: id,
        templateId: seedId(920),
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
      });
  }
  insert('salaryTemplates', {
    ...find('salaryTemplates', seedId(920)),
    id: seedId(12_020),
    templateKey: seedId(12_020),
    name: '教练绩效方案（草稿）',
    status: 'draft',
    baseSalary: '5000.00',
  });
  insert('cardTemplates', {
    ...find('cardTemplates', seedId(40)),
    id: seedId(12_030),
    templateKey: seedId(12_030),
    name: '季度卡（草稿）',
    status: 'draft',
    durationDays: 90,
    price: '499.00',
  });

  for (let i = 1; i <= 24; i++) {
    const storeId = seedId((i % 2) + 1);
    const employeeId = seedId(20 + (i % 2) + 1);
    const memberId = seedId(10_000 + i);
    const cardId = seedId(10_100 + i);
    const orderId = seedId(10_200 + i);
    const itemId = seedId(10_300 + i);
    const paymentId = seedId(10_400 + i);
    const paidAt = at(-i);
    insert('members', {
      id: memberId,
      memberNo: `DEMO-M${String(i).padStart(3, '0')}`,
      phone: `1391000${String(i).padStart(4, '0')}`,
      name: `体验会员${String(i).padStart(2, '0')}`,
      gender: i % 2 ? 'female' : 'male',
      customerStage: i > 21 ? 'lead' : 'member',
      registeredStoreId: storeId,
      source: i % 2 ? 'miniapp' : 'app',
      status: i === 24 ? 'inactive' : 'active',
      registeredAt: at(-i - 5),
    });
    insert('memberStores', { memberId, storeId, joinedAt: at(-i - 5), status: 'active' });
    if (i > 21) continue;
    insert('memberCards', {
      id: cardId,
      memberId,
      cardTemplateId: seedId(40),
      issuedStoreId: storeId,
      storeId,
      cardNo: `DEMO-CARD-${i}`,
      name: '全国通用月卡',
      startsAt: at(-i),
      expiresAt: i === 21 ? at(-1) : at(30 - i),
      status: i === 21 ? 'expired' : 'active',
      accessScope: 'all',
      storeIds: [],
      templateSnapshot: { ...find('cardTemplates', seedId(40)) },
      orderItemId: itemId,
    });
    insert('orders', {
      id: orderId,
      orderNo: `DEMO-ORDER-${i}`,
      memberId,
      storeId,
      channel: i % 2 ? 'miniapp' : 'app',
      status: 'paid',
      currency: 'CNY',
      totalAmount: '199.00',
      discountAmount: '0.00',
      payableAmount: '199.00',
      paidAmount: '199.00',
      refundedAmount: i === 5 ? '49.00' : '0.00',
      orderedAt: paidAt,
      paidAt,
    });
    insert('orderItems', {
      id: itemId,
      orderId,
      productType: 'card',
      cardTemplateId: seedId(40),
      productNameSnapshot: '全国通用月卡',
      quantity: 1,
      unitPrice: '199.00',
      discountAmount: '0.00',
      payableAmount: '199.00',
      productSnapshot: { ...find('cardTemplates', seedId(40)) },
    });
    insert('payments', {
      id: paymentId,
      orderId,
      provider: 'mock',
      merchantId: 'MOCK-MERCHANT',
      providerTransactionId: `DEMO-PAY-${i}`,
      attemptNo: 1,
      amount: '199.00',
      status: 'succeeded',
      paidAt,
    });
    insert('performanceAllocations', {
      orderItemId: itemId,
      employeeId,
      storeId,
      shareRatio: '1.000000',
      amount: '199.00',
    });
    if (i === 5)
      insert('refunds', {
        paymentTransactionId: paymentId,
        orderId,
        orderItemId: itemId,
        amount: '49.00',
        status: 'succeeded',
        refundedAt: at(-2),
        reason: 'Mock 部分退款示例',
      });
    insert('checkins', {
      id: seedId(10_500 + i),
      memberId,
      storeId,
      memberCardId: cardId,
      enteredAt: at(-i + 1),
      exitedAt: at(-i + 1, 1),
      method: i % 2 ? 'qr' : 'face',
      status: 'succeeded',
      visitorType: 'member',
      sourceKey: `demo-checkin-${i}`,
    });
    insert('pointAccounts', { memberId, balance: i * 20 });
    insert('pointLedger', {
      memberId,
      storeId,
      ruleId: seedId(811),
      delta: i * 20,
      balanceAfter: i * 20,
      eventType: 'checkin',
      sourceKey: `demo-points-${i}`,
      occurredAt: at(-i + 1),
    });
  }

  for (let store = 1; store <= 2; store++) {
    const storeId = seedId(store);
    const memberId = seedId(store === 1 ? 10_002 : 10_001);
    const cardId = seedId(store === 1 ? 10_102 : 10_101);
    const cover = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480" viewBox="0 0 960 480"><rect width="960" height="480" fill="${store === 1 ? '#e4effc' : '#e7f4ec'}"/><rect x="100" y="140" width="760" height="160" rx="24" fill="#24476b"/><text x="480" y="235" text-anchor="middle" fill="white" font-size="36" font-family="sans-serif">MOCK GYM ${store} - TRAINING AREA</text><text x="480" y="390" text-anchor="middle" fill="#24476b" font-size="22" font-family="sans-serif">DEVELOPMENT SAMPLE</text></svg>`,
    );
    const file = insert('files', {
      id: seedId(13_000 + store),
      storeId,
      uploadedBy: seedId(30),
      originalName: `mock-gym-${store}.svg`,
      mimeType: 'image/svg+xml',
      byteSize: cover.length,
      category: 'image',
      status: 'active',
      storageKey: `demo-cover-${store}`,
    });
    fileContents.set(file.id, cover);
    find('stores', storeId).media = [{ fileId: file.id, isCover: true, sortOrder: 0 }];
    const pdf = examplePdf('REPORT');
    const report = insert('files', {
      id: seedId(13_010 + store),
      storeId,
      uploadedBy: seedId(30),
      originalName: `mock-report-${store}.pdf`,
      mimeType: 'application/pdf',
      byteSize: pdf.length,
      category: 'body_report',
      status: 'active',
      storageKey: `demo-report-${store}`,
    });
    fileContents.set(report.id, pdf);
    find('bodyMeasurements', seedId(390 + store)).reportFileId = report.id;
    insert('tutorials', {
      equipmentId: seedId(550 + store),
      fileId: file.id,
      title: '训练区域示意图',
      sortOrder: 0,
      status: 'active',
    });
    for (const platform of ['miniapp', 'app'])
      insert('clientSettings', {
        storeId,
        platform,
        systemName: `上海${store === 1 ? '一' : '二'}店`,
        enabled: true,
        coverFileId: file.id,
        welcomeText: '今天也要认真训练',
        customerService: '请联系门店前台',
        blocks: [],
        contentHtml: `<h2>本周课程推荐</h2><p>力量训练、团体课程与私教训练，按自己的节奏开始。</p><ul><li>团课提前预约</li><li>到店签到后开始训练</li></ul><img src="gym-file:${file.id}" alt="门店示意图"><p><a href="https://example.com">了解更多</a></p>`,
      });
    for (let n = 1; n <= 4; n++) {
      const session = insert('courseSessions', {
        id: seedId(13_100 + store * 10 + n),
        storeId,
        courseProductId: seedId(310 + store),
        coachId: seedId(20 + store),
        room: n % 2 ? '操课室 A' : '操课室 B',
        startsAt: at(n, store * 2),
        endsAt: at(n, store * 2 + 1),
        capacity: n === 4 ? 1 : 12,
        status: n === 3 ? 'cancelled' : 'scheduled',
      });
      insert('bookings', {
        memberId,
        storeId,
        sessionId: session.id,
        memberCardId: cardId,
        status: n === 3 ? 'cancelled' : 'confirmed',
        bookedAt: now(),
        source: 'miniapp',
        note: n === 4 ? '满员示例' : 'Mock 联动预约',
      });
    }
  }

  call(
    coupons,
    'POST',
    '/coupon-quota-batches',
    { templateId: seedId(800), targetMode: 'allEligible', quantityPerStore: 100 },
    'demo-allocate',
  );
  const targets = [1, 2, 3, 4].map((i) => ({ storeId: seedId((i % 2) + 1), memberId: seedId(10_000 + i) }));
  call(coupons, 'POST', '/coupon-batches', { templateId: seedId(800), targets }, 'demo-issue');
  call(
    coupons,
    'POST',
    '/coupon-batches',
    { templateId: seedId(800), targets: [targets[0], { storeId: seedId(2), memberId: seedId(10_005) }] },
    'demo-partial-issue',
  );
  call(
    coupons,
    'POST',
    '/gift-code-batches',
    { name: '训练打卡积分礼包（示例）', rewardType: 'points', pointAmount: 100, count: 5, expiresAt: at(60) },
    'demo-gift',
  );
  call(
    marketing,
    'POST',
    '/message-batches',
    {
      kind: 'bulk',
      channel: 'app',
      memberIds: targets.map((target) => target.memberId),
      title: '团课预约提醒（模拟）',
      content: '请提前安排本周训练。此记录仅用于开发演示，不会发送。',
    },
    'demo-message',
  );
  for (let store = 1; store <= 2; store++)
    call(payroll, 'POST', '/payrolls', { storeId: seedId(store), month: new Date().toISOString().slice(0, 7) });
}
