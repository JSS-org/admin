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
