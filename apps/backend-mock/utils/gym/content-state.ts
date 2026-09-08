import { insert, now, seedId } from './core';
export function seedContent() {
  insert('clientSettings', {
    id: seedId(850),
    storeId: null,
    platform: 'miniapp',
    systemName: '健身门店',
    welcomeText: '欢迎来到门店',
    customerService: '请联系门店客服',
    enabled: true,
    blocks: [
      {
        blockType: 'text',
        title: '门店服务',
        body: '力量训练、团课和私教',
        sortOrder: 0,
        enabled: true,
      },
    ],
  });
  const startsAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  insert('activities', {
    id: seedId(860),
    name: '周末训练体验（示例）',
    description: '体验门店团体课程',
    storeIds: [seedId(1), seedId(2)],
    registrationStartsAt: now(),
    registrationEndsAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + 3_600_000).toISOString(),
    capacity: 30,
    status: 'published',
    createdBy: seedId(30),
  });
  insert('activityRegistrations', {
    id: seedId(861),
    activityId: seedId(860),
    storeId: seedId(1),
    memberId: seedId(101),
    status: 'registered',
    registeredAt: now(),
  });
  insert('franchiseBrand', {
    id: seedId(870),
    name: '健身门店品牌',
    introduction: '连锁健身门店加盟资料（开发示例）',
    contactPhone: '02112345678',
    status: 'draft',
    models: [
      {
        modelCode: 'small',
        name: '小型门店',
        description: '社区店',
        areaSqm: '300.00',
        fileIds: [],
      },
      {
        modelCode: 'standard',
        name: '标准门店',
        description: '标准综合店',
        areaSqm: '800.00',
        fileIds: [],
      },
      {
        modelCode: 'flagship',
        name: '旗舰门店',
        description: '大型综合店',
        areaSqm: '1500.00',
        fileIds: [],
      },
    ],
  });
  insert('franchiseInquiries', {
    id: seedId(871),
    brandId: seedId(870),
    contactName: '示例咨询人',
    phone: '13800000009',
    preferredCity: '上海',
    message: '咨询标准门店加盟',
    source: 'miniapp',
    status: 'new',
    receivedAt: now(),
  });
  for (let i = 1; i <= 2; i++) {
    insert('reviews', {
      id: seedId(880 + i),
      storeId: seedId(i),
      memberId: seedId(i === 1 ? 101 : 106),
      platform: 'miniapp',
      rating: 4,
      content: '器械使用方便（示例评价）',
      anonymous: i === 1,
      submittedAt: now(),
    });
    insert('feedback', {
      id: seedId(890 + i),
      storeId: seedId(i),
      platform: 'app',
      content: '希望增加晚间课程（匿名示例）',
      category: '课程建议',
      status: 'new',
      submittedAt: now(),
    });
  }
}
