import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'GymHome',
    path: '/gym/home',
    component: () => import('#/views/gym/home/index.vue'),
    meta: { title: '首页', icon: 'lucide:house', order: -1, affixTab: true, authority: ['hq', 'store'] },
  },
  {
    name: 'GymGroup-store-management',
    path: '/gym/store-management',
    meta: { title: '门店管理', icon: 'lucide:building-2', order: 0, authority: ['hq', 'store'] },
    children: [
      {
        name: 'GymStores',
        path: '/gym/stores',
        component: () => import('#/views/gym/stores/index.vue'),
        meta: { title: '门店资料', authority: ['hq', 'store'], order: 0 },
      },
      {
        name: 'Gym-checkins',
        path: '/gym/checkins',
        component: () => import('#/views/gym/checkins/index.vue'),
        meta: { title: '签到记录', authority: ['hq', 'store'], order: 1, hideInMenu: false },
      },
      {
        name: 'Gym-qr-codes',
        path: '/gym/qr-codes',
        component: () => import('#/views/gym/qr-codes/index.vue'),
        meta: { title: '小程序 / App 码', authority: ['hq', 'store'], order: 2, hideInMenu: true },
      },
      {
        name: 'Gym-reviews',
        path: '/gym/reviews',
        component: () => import('#/views/gym/reviews/index.vue'),
        meta: { title: '门店评价', authority: ['hq', 'store'], order: 3, hideInMenu: true },
      },
    ],
  },
  {
    name: 'GymGroup-staff',
    path: '/gym/staff',
    meta: { title: '员工管理', icon: 'lucide:contact-round', order: 1, authority: ['hq', 'store'] },
    children: [
      {
        name: 'GymEmployees',
        path: '/gym/employees',
        component: () => import('#/views/gym/employees/index.vue'),
        meta: { title: '员工资料', authority: ['hq', 'store'], order: 0 },
      },
      {
        name: 'GymRoles',
        path: '/gym/roles',
        component: () => import('#/views/gym/roles/index.vue'),
        meta: { title: '角色权限', authority: ['hq'], hideInMenu: true, order: 1 },
      },
      {
        name: 'Gym-salary-templates',
        path: '/gym/salary-templates',
        component: () => import('#/views/gym/salary-templates/index.vue'),
        meta: { title: '薪资模板', authority: ['hq'], order: 2 },
      },
      {
        name: 'Gym-employee-salary-assignments',
        path: '/gym/employee-salary-assignments',
        component: () => import('#/views/gym/employee-salary-assignments/index.vue'),
        meta: { title: '员工薪资关联', authority: ['hq', 'store'], order: 3, hideInMenu: true },
      },
      {
        name: 'Gym-payrolls',
        path: '/gym/payrolls',
        component: () => import('#/views/gym/payrolls/index.vue'),
        meta: { title: '门店工资表', authority: ['hq', 'store'], order: 4, hideInMenu: true },
      },
    ],
  },
  {
    name: 'GymGroup-membership',
    path: '/gym/membership',
    meta: { title: '会员管理', icon: 'lucide:users', order: 2, authority: ['hq', 'store'] },
    children: [
      {
        name: 'GymMembers',
        path: '/gym/members',
        component: () => import('#/views/gym/members/index.vue'),
        meta: { title: '会员资料', authority: ['hq', 'store'], order: 0 },
      },
      {
        name: 'Gym-body-measurements',
        path: '/gym/body-measurements',
        component: () => import('#/views/gym/body-measurements/index.vue'),
        meta: { title: '体测记录', authority: ['hq', 'store'], order: 1, hideInMenu: false },
      },
      {
        name: 'Gym-blacklists',
        path: '/gym/blacklists',
        component: () => import('#/views/gym/blacklists/index.vue'),
        meta: { title: '黑名单', authority: ['hq'], order: 2 },
      },
    ],
  },
  {
    name: 'GymGroup-membership-cards',
    path: '/gym/membership-cards',
    meta: { title: '会员卡管理', icon: 'lucide:credit-card', order: 3, authority: ['hq', 'store'] },
    children: [
      {
        name: 'GymCards',
        path: '/gym/cards',
        component: () => import('#/views/gym/cards/index.vue'),
        meta: { title: '会员卡模板', authority: ['hq', 'store'], order: 0 },
      },
      {
        name: 'Gym-settings',
        path: '/gym/settings',
        component: () => import('#/views/gym/settings/index.vue'),
        meta: { title: '售卡与核销设置', authority: ['hq'], order: 1 },
      },
      {
        name: 'Gym-self-service-card-orders',
        path: '/gym/self-service-card-orders',
        component: () => import('#/views/gym/self-service-card-orders/index.vue'),
        meta: { title: '自主办卡记录', authority: ['hq', 'store'], order: 2 },
      },
      {
        name: 'Gym-subscriptions',
        path: '/gym/subscriptions',
        component: () => import('#/views/gym/subscriptions/index.vue'),
        meta: { title: '连续包月记录', authority: ['hq', 'store'], order: 3 },
      },
      {
        name: 'Gym-verifications',
        path: '/gym/verifications',
        component: () => import('#/views/gym/verifications/index.vue'),
        meta: { title: '自助核销记录', authority: ['hq', 'store'], order: 4 },
      },
    ],
  },
  {
    name: 'GymGroup-training',
    path: '/gym/training',
    meta: { title: '课程管理', icon: 'lucide:calendar-days', order: 4, authority: ['hq', 'store'] },
    children: [
      {
        name: 'Gym-course-products',
        path: '/gym/course-products',
        component: () => import('#/views/gym/course-products/index.vue'),
        meta: { title: '课程产品', authority: ['hq', 'store'], order: 0, hideInMenu: false },
      },
      {
        name: 'Gym-course-sessions',
        path: '/gym/course-sessions',
        component: () => import('#/views/gym/course-sessions/index.vue'),
        meta: { title: '课程安排', authority: ['hq', 'store'], order: 1, hideInMenu: false },
      },
      {
        name: 'Gym-bookings',
        path: '/gym/bookings',
        component: () => import('#/views/gym/bookings/index.vue'),
        meta: { title: '预约管理', authority: ['hq', 'store'], order: 2, hideInMenu: false },
      },
      {
        name: 'Gym-lesson-records',
        path: '/gym/lesson-records',
        component: () => import('#/views/gym/lesson-records/index.vue'),
        meta: { title: '上课记录', authority: ['hq', 'store'], order: 3, hideInMenu: false },
      },
    ],
  },
  {
    name: 'GymGroup-contract-management',
    path: '/gym/contract-management',
    meta: { title: '合同管理', icon: 'lucide:file-text', order: 5, authority: ['hq', 'store'] },
    children: [
      {
        name: 'Gym-contract-templates',
        path: '/gym/contract-templates',
        component: () => import('#/views/gym/contract-templates/index.vue'),
        meta: { title: '合同模板', authority: ['hq'], order: 0 },
      },
      {
        name: 'Gym-contracts',
        path: '/gym/contracts',
        component: () => import('#/views/gym/contracts/index.vue'),
        meta: { title: '合同记录', authority: ['hq', 'store'], order: 1 },
      },
    ],
  },
  {
    name: 'GymGroup-approval-management',
    path: '/gym/approval-management',
    meta: { title: '审批管理', icon: 'lucide:file-check', order: 6, authority: ['hq', 'store'], hideInMenu: true },
    children: [
      {
        name: 'Gym-approval-templates',
        path: '/gym/approval-templates',
        component: () => import('#/views/gym/approval-templates/index.vue'),
        meta: { title: '审批模板', authority: ['hq'], order: 0 },
      },
      {
        name: 'Gym-approvals',
        path: '/gym/approvals',
        component: () => import('#/views/gym/approvals/index.vue'),
        meta: { title: '审批记录', authority: ['hq', 'store'], order: 1 },
      },
    ],
  },
  {
    name: 'GymGroup-hardware',
    path: '/gym/hardware',
    meta: { title: '设备管理', icon: 'lucide:door-open', order: 7, authority: ['hq', 'store'] },
    children: [
      {
        name: 'Gym-devices',
        path: '/gym/devices',
        component: () => import('#/views/gym/devices/index.vue'),
        meta: { title: '智能设备', authority: ['hq', 'store'], order: 0 },
      },
      {
        name: 'Gym-equipment',
        path: '/gym/equipment',
        component: () => import('#/views/gym/equipment/index.vue'),
        meta: { title: '器械教学', authority: ['hq', 'store'], order: 1 },
      },
    ],
  },
  {
    name: 'GymGroup-coupons',
    path: '/gym/coupons',
    meta: { title: '优惠券管理', icon: 'lucide:ticket', order: 8, authority: ['hq', 'store'] },
    children: [
      {
        name: 'Gym-coupon-templates',
        path: '/gym/coupon-templates',
        component: () => import('#/views/gym/coupon-templates/index.vue'),
        meta: { title: '优惠券模板', authority: ['hq', 'store'], order: 0 },
      },
      {
        name: 'Gym-coupon-store-quotas',
        path: '/gym/coupon-store-quotas',
        component: () => import('#/views/gym/coupon-store-quotas/index.vue'),
        meta: { title: '优惠券额度管理', authority: ['hq', 'store'], order: 1 },
      },
      {
        name: 'Gym-coupon-quota-batches',
        path: '/gym/coupon-quota-batches',
        component: () => import('#/views/gym/coupon-quota-batches/index.vue'),
        meta: { title: '一键维护：门店额度', authority: ['hq'], order: 2, hideInMenu: true },
      },
      {
        name: 'Gym-coupon-batches',
        path: '/gym/coupon-batches',
        component: () => import('#/views/gym/coupon-batches/index.vue'),
        meta: { title: '批量发券', authority: ['hq', 'store'], order: 3 },
      },
      {
        name: 'Gym-coupon-quota-ledger',
        path: '/gym/coupon-quota-ledger',
        component: () => import('#/views/gym/coupon-quota-ledger/index.vue'),
        meta: { title: '券额度流水', authority: ['hq', 'store'], order: 4, hideInMenu: true },
      },
      {
        name: 'Gym-member-coupons',
        path: '/gym/member-coupons',
        component: () => import('#/views/gym/member-coupons/index.vue'),
        meta: { title: '会员优惠券', authority: ['hq', 'store'], order: 5 },
      },
      {
        name: 'Gym-gift-code-batches',
        path: '/gym/gift-code-batches',
        component: () => import('#/views/gym/gift-code-batches/index.vue'),
        meta: { title: '礼品码生成', authority: ['hq'], order: 6 },
      },
    ],
  },
  {
    name: 'GymGroup-points',
    path: '/gym/points',
    meta: { title: '积分管理', icon: 'lucide:coins', order: 9, authority: ['hq'] },
    children: [
      {
        name: 'Gym-point-rules',
        path: '/gym/point-rules',
        component: () => import('#/views/gym/point-rules/index.vue'),
        meta: { title: '积分规则', authority: ['hq'], order: 0 },
      },
      {
        name: 'Gym-point-products',
        path: '/gym/point-products',
        component: () => import('#/views/gym/point-products/index.vue'),
        meta: { title: '积分兑换', authority: ['hq'], order: 1 },
      },
      {
        name: 'Gym-point-ledger',
        path: '/gym/point-ledger',
        component: () => import('#/views/gym/point-ledger/index.vue'),
        meta: { title: '积分流水', authority: ['hq'], order: 2 },
      },
      {
        name: 'Gym-point-redemptions',
        path: '/gym/point-redemptions',
        component: () => import('#/views/gym/point-redemptions/index.vue'),
        meta: { title: '兑换记录', authority: ['hq'], order: 3 },
      },
    ],
  },
  {
    name: 'GymGroup-communications',
    path: '/gym/communications',
    meta: {
      title: '消息管理',
      icon: 'lucide:messages-square',
      order: 10,
      authority: ['hq', 'store'],
      hideInMenu: true,
    },
    children: [
      {
        name: 'Gym-message-batches',
        path: '/gym/message-batches',
        component: () => import('#/views/gym/message-batches/index.vue'),
        meta: { title: '私信与批量通知', authority: ['hq', 'store'], order: 0 },
      },
      {
        name: 'Gym-feedback',
        path: '/gym/feedback',
        component: () => import('#/views/gym/feedback/index.vue'),
        meta: { title: '匿名反馈', authority: ['hq', 'store'], order: 1, hideInMenu: false },
      },
    ],
  },
  {
    name: 'GymGroup-content',
    path: '/gym/content',
    meta: { title: '内容管理', icon: 'lucide:megaphone', order: 11, authority: ['hq'] },
    children: [
      {
        name: 'Gym-client-settings',
        path: '/gym/client-settings',
        component: () => import('#/views/gym/client-settings/index.vue'),
        meta: { title: '展示配置', authority: ['hq'], order: 0, hideInMenu: false },
      },
      {
        name: 'Gym-activities',
        path: '/gym/activities',
        component: () => import('#/views/gym/activities/index.vue'),
        meta: { title: '门店活动', authority: ['hq'], order: 1, hideInMenu: false },
      },
    ],
  },
  {
    name: 'GymGroup-franchise',
    path: '/gym/franchise',
    meta: { title: '加盟管理', icon: 'lucide:handshake', order: 12, authority: ['hq'], hideInMenu: true },
    children: [
      {
        name: 'Gym-franchise-brand',
        path: '/gym/franchise-brand',
        component: () => import('#/views/gym/franchise-brand/index.vue'),
        meta: { title: '加盟品牌与模型', authority: ['hq'], order: 0, hideInMenu: false },
      },
      {
        name: 'Gym-franchise-inquiries',
        path: '/gym/franchise-inquiries',
        component: () => import('#/views/gym/franchise-inquiries/index.vue'),
        meta: { title: '加盟咨询', authority: ['hq'], order: 1, hideInMenu: false },
      },
    ],
  },
  {
    name: 'GymGroup-finance',
    path: '/gym/finance',
    meta: { title: '财务管理', icon: 'lucide:wallet', order: 13, authority: ['hq'] },
    children: [
      {
        name: 'Gym-payment-accounts',
        path: '/gym/payment-accounts',
        component: () => import('#/views/gym/payment-accounts/index.vue'),
        meta: { title: '收款账户', authority: ['hq'], order: 0 },
      },
      {
        name: 'Gym-settlement-rules',
        path: '/gym/settlement-rules',
        component: () => import('#/views/gym/settlement-rules/index.vue'),
        meta: { title: '分账规则', authority: ['hq'], order: 1 },
      },
      {
        name: 'Gym-settlements',
        path: '/gym/settlements',
        component: () => import('#/views/gym/settlements/index.vue'),
        meta: { title: '分账结算记录', authority: ['hq'], order: 2 },
      },
    ],
  },
  {
    name: 'GymGroup-reports',
    path: '/gym/reports',
    meta: { title: '统计报表', icon: 'lucide:chart-no-axes-combined', order: 14, authority: ['hq', 'store'] },
    children: [
      {
        name: 'Gym-reports/performance',
        path: '/gym/reports/performance',
        component: () => import('#/views/gym/reports/performance/index.vue'),
        meta: { title: '门店与员工业绩', authority: ['hq', 'store'], order: 0 },
      },
      {
        name: 'Gym-reports/members',
        path: '/gym/reports/members',
        component: () => import('#/views/gym/reports/members/index.vue'),
        meta: { title: '会员汇总', authority: ['hq', 'store'], order: 1 },
      },
      {
        name: 'Gym-reports/member-cards',
        path: '/gym/reports/member-cards',
        component: () => import('#/views/gym/reports/member-cards/index.vue'),
        meta: { title: '会员卡报表', authority: ['hq', 'store'], order: 2 },
      },
    ],
  },
];
export default routes;
