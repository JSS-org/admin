import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    name: 'Gym',
    path: '/gym',
    meta: {
      title: '门店管理',
      icon: 'lucide:building-2',
      authority: ['hq', 'store'],
      order: 1,
    },
    children: [
      ...[
        ['client-settings', '展示配置', 'hq'],
        ['activities', '门店活动', 'hq'],
        ['franchise-brand', '加盟品牌与模型', 'hq'],
        ['franchise-inquiries', '加盟咨询', 'hq'],
        ['reviews', '门店评价', 'store'],
        ['feedback', '匿名反馈', 'store'],
      ].map(([resource = '', title = '', scope]) => ({
        name: `Gym-${resource}`,
        path: resource,
        component: () => import('#/views/gym/content.vue'),
        props: { resource },
        meta: {
          title,
          authority: scope === 'hq' ? ['hq'] : ['hq', 'store'],
          order: 60,
        },
      })),
      ...[
        ['coupon-templates', '优惠券模板', 'store'],
        ['coupon-store-quotas', '门店优惠券额度', 'store'],
        ['coupon-quota-batches', '一键维护：门店额度', 'hq'],
        ['coupon-batches', '批量发券', 'store'],
        ['coupon-quota-ledger', '券额度流水', 'store'],
        ['member-coupons', '会员优惠券', 'store'],
        ['gift-code-batches', '礼品码生成', 'hq'],
        ['message-batches', '私信与批量通知', 'store'],
        ['point-rules', '积分规则', 'hq'],
        ['point-products', '积分兑换商品', 'hq'],
        ['point-ledger', '积分流水', 'hq'],
        ['point-redemptions', '积分兑换记录', 'hq'],
      ].map(([resource = '', title = '', scope]) => ({
        name: `Gym-${resource}`,
        path: resource,
        component: () => import('#/views/gym/marketing.vue'),
        props: { resource },
        meta: {
          title,
          authority: scope === 'hq' ? ['hq'] : ['hq', 'store'],
          order: 50,
        },
      })),
      ...[
        ['settings', '售卡与核销设置', 'hq'],
        ['self-service-card-orders', '自主办卡记录', 'store'],
        ['subscriptions', '连续包月记录', 'store'],
        ['verifications', '自助核销记录', 'store'],
        ['reports/performance', '门店与员工业绩', 'store'],
        ['reports/members', '会员汇总', 'store'],
        ['reports/member-cards', '会员卡报表', 'store'],
      ].map(([resource = '', title = '', scope]) => ({
        name: `Gym-${resource}`,
        path: resource,
        component: () => import('#/views/gym/sales.vue'),
        props: { resource },
        meta: {
          title,
          authority: scope === 'hq' ? ['hq'] : ['hq', 'store'],
          order: 40,
        },
      })),
      ...[
        ['devices', '智能设备', 'store'],
        ['equipment', '器械教学', 'store'],
        ['blacklists', '全店黑名单', 'hq'],
      ].map(([resource = '', title = '', scope]) => ({
        name: `Gym-${resource}`,
        path: resource,
        component: () => import('#/views/gym/devices.vue'),
        props: { resource },
        meta: {
          title,
          authority: scope === 'hq' ? ['hq'] : ['hq', 'store'],
          order: 30,
        },
      })),
      ...[
        ['contract-templates', '合同模板', 'hq'],
        ['contracts', '合同记录', 'store'],
        ['approval-templates', '审批模板', 'hq'],
        ['approvals', '审批记录', 'store'],
      ].map(([resource = '', title = '', scope]) => ({
        name: `Gym-${resource}`,
        path: resource,
        component: () => import('#/views/gym/governance.vue'),
        props: { resource },
        meta: {
          title,
          authority: scope === 'hq' ? ['hq'] : ['hq', 'store'],
          order: 20,
        },
      })),
      ...[
        ['course-products', '课程产品'],
        ['course-sessions', '课程安排'],
        ['bookings', '预约管理'],
        ['checkins', '签到记录'],
        ['lesson-records', '上课记录'],
        ['body-measurements', '体测记录'],
        ['qr-codes', '小程序 / App 码'],
      ].map(([resource = '', title = '']) => ({
        name: `Gym-${resource}`,
        path: resource ?? '',
        component: () => import('#/views/gym/training.vue'),
        props: { resource },
        meta: { title, authority: ['hq', 'store'], order: 10 },
      })),
      {
        name: 'GymStores',
        path: 'stores',
        component: () => import('#/views/gym/stores.vue'),
        meta: { title: '门店资料', authority: ['hq', 'store'] },
      },
      {
        name: 'GymEmployees',
        path: 'employees',
        component: () => import('#/views/gym/employees.vue'),
        meta: { title: '员工与账号', authority: ['hq', 'store'] },
      },
      {
        name: 'GymRoles',
        path: 'roles',
        component: () => import('#/views/gym/roles.vue'),
        meta: { title: '角色权限', authority: ['hq'] },
      },
      {
        name: 'GymMembers',
        path: 'members',
        component: () => import('#/views/gym/members.vue'),
        meta: { title: '会员管理', authority: ['hq', 'store'] },
      },
      {
        name: 'GymCards',
        path: 'cards',
        component: () => import('#/views/gym/cards.vue'),
        meta: { title: '会员卡种', authority: ['hq', 'store'] },
      },
    ],
  },
];
export default routes;
