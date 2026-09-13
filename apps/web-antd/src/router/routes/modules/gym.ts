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
        ['salary-templates', '薪资模板', 'hq'],
        ['employee-salary-assignments', '员工薪资关联', 'store'],
        ['payrolls', '门店工资表', 'store'],
      ].map(([resource = '', title = '', scope]) => ({
        name: `Gym-${resource}`,
        path: resource,
        component: () => import('#/views/gym/payroll.vue'),
        props: { resource },
        meta: {
          title,
          authority: scope === 'hq' ? ['hq'] : ['hq', 'store'],
          order: 80,
        },
      })),
      ...[
        ['payment-accounts', '收款账户'],
        ['settlement-rules', '分账规则'],
        ['settlements', '分账结算记录'],
      ].map(([resource = '', title = '']) => ({
        name: `Gym-${resource}`,
        path: resource,
        component: () => import('#/views/gym/settlement.vue'),
        props: { resource },
        meta: { title, authority: ['hq'], order: 70 },
      })),
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
          hideInMenu: resource === 'reviews',
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
        ['blacklists', '黑名单', 'hq'],
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
        meta: { title, authority: ['hq', 'store'], order: 10, hideInMenu: resource === 'qr-codes' },
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
        meta: { title: '员工资料', authority: ['hq', 'store'] },
      },
      {
        name: 'GymRoles',
        path: 'roles',
        component: () => import('#/views/gym/roles.vue'),
        meta: { title: '角色权限', authority: ['hq'], hideInMenu: true },
      },
      {
        name: 'GymMembers',
        path: 'members',
        component: () => import('#/views/gym/members.vue'),
        meta: { title: '会员资料', authority: ['hq', 'store'] },
      },
      {
        name: 'GymCards',
        path: 'cards',
        component: () => import('#/views/gym/cards.vue'),
        meta: { title: '会员卡模板', authority: ['hq', 'store'] },
      },
    ],
  },
];
const pages = routes[0]?.children ?? [];
const groups: [string, string, string, string[]][] = [
  ['store-management', '门店管理', 'lucide:building-2', ['stores', 'checkins', 'qr-codes', 'reviews']],
  [
    'staff',
    '员工管理',
    'lucide:contact-round',
    ['employees', 'roles', 'salary-templates', 'employee-salary-assignments', 'payrolls'],
  ],
  ['membership', '会员管理', 'lucide:users', ['members', 'body-measurements', 'blacklists']],
  [
    'membership-cards',
    '会员卡管理',
    'lucide:credit-card',
    ['cards', 'settings', 'self-service-card-orders', 'subscriptions', 'verifications'],
  ],
  [
    'training',
    '课程管理',
    'lucide:calendar-days',
    ['course-products', 'course-sessions', 'bookings', 'lesson-records'],
  ],
  ['contract-management', '合同管理', 'lucide:file-text', ['contract-templates', 'contracts']],
  ['approval-management', '审批管理', 'lucide:file-check', ['approval-templates', 'approvals']],
  ['hardware', '设备管理', 'lucide:door-open', ['devices', 'equipment']],
  [
    'coupons',
    '优惠券管理',
    'lucide:ticket',
    [
      'coupon-templates',
      'coupon-store-quotas',
      'coupon-quota-batches',
      'coupon-batches',
      'coupon-quota-ledger',
      'member-coupons',
      'gift-code-batches',
    ],
  ],
  ['points', '积分管理', 'lucide:coins', ['point-rules', 'point-products', 'point-ledger', 'point-redemptions']],
  ['communications', '消息管理', 'lucide:messages-square', ['message-batches', 'feedback']],
  ['content', '内容管理', 'lucide:megaphone', ['client-settings', 'activities']],
  ['franchise', '加盟管理', 'lucide:handshake', ['franchise-brand', 'franchise-inquiries']],
  ['finance', '财务管理', 'lucide:wallet', ['payment-accounts', 'settlement-rules', 'settlements']],
  [
    'reports',
    '统计报表',
    'lucide:chart-no-axes-combined',
    ['reports/performance', 'reports/members', 'reports/member-cards'],
  ],
];
const groupedRoutes: RouteRecordRaw[] = groups.map(([key, title, icon, paths], order): RouteRecordRaw => ({
  name: `GymGroup-${key}`,
  path: `/gym/${key}`,
  meta: {
    title,
    icon,
    order,
    authority: paths.some((path) => pages.find((page) => page.path === path)?.meta?.authority?.includes('store'))
      ? ['hq', 'store']
      : ['hq'],
  },
  children: paths.flatMap<RouteRecordRaw>((path, index) => {
    const page = pages.find((page) => page.path === path);
    return page
      ? [
          {
            ...page,
            path: `/gym/${path}`,
            meta: {
              ...page.meta,
              title: page.meta?.title ?? path,
              order: index,
            },
          },
        ]
      : [];
  }),
}));
const homeRoute: RouteRecordRaw = {
  name: 'GymHome',
  path: '/gym/home',
  component: () => import('#/views/gym/home.vue'),
  meta: {
    title: '首页',
    icon: 'lucide:house',
    order: -1,
    affixTab: true,
    authority: ['hq', 'store'],
  },
};

export default [homeRoute, ...groupedRoutes];
