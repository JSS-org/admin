import { seedContent } from './content-state';
import {
  fileContents,
  find,
  insert,
  now,
  passwordHash,
  rows,
  seedId,
  tables,
} from './core';
import { seedDevices } from './devices-state';
import { seedGovernance } from './governance-state';
import { seedMarketing } from './marketing-state';
import { seedSales } from './sales-state';
import { seedSettlement } from './settlement-state';
import { seedTraining } from './training-state';

export const modules = {
  stores: ['read', 'write'],
  employees: ['read', 'write'],
  accounts: ['read', 'write'],
  roles: ['read', 'write'],
  members: ['read', 'write'],
  cards: ['read', 'write'],
  files: ['read', 'upload'],
  reports: ['read'],
  courses: ['read', 'write'],
  bookings: ['read', 'write'],
  checkins: ['read'],
  lessons: ['read'],
  measurements: ['read', 'write'],
  contracts: ['read', 'templates', 'remind'],
  approvals: ['read', 'templates', 'decide'],
  devices: ['read', 'write', 'command'],
  equipment: ['read', 'write'],
  blacklist: ['read', 'write'],
  sales: ['read', 'settings'],
  points: ['manage', 'read'],
  coupons: ['read', 'manage', 'issue', 'allocate'],
  gifts: ['manage'],
  messages: ['read', 'send'],
  content: ['manage'],
  activities: ['manage'],
  franchise: ['manage'],
  feedback: ['read'],
  settlement: ['manage', 'read'],
  payroll: ['templates', 'read', 'calculate', 'confirm'],
};
export const permissionCodes = Object.entries(modules).flatMap(
  ([name, actions]) => actions.map((action) => `${name}:${action}`),
);
export const storeCodes = [
  'stores:read',
  'employees:read',
  'members:read',
  'members:write',
  'cards:read',
  'files:read',
  'files:upload',
  'reports:read',
  'courses:read',
  'courses:write',
  'bookings:read',
  'bookings:write',
  'checkins:read',
  'lessons:read',
  'measurements:read',
  'measurements:write',
  'contracts:read',
  'contracts:remind',
  'approvals:read',
  'devices:read',
  'devices:command',
  'equipment:read',
  'sales:read',
  'coupons:read',
  'coupons:issue',
  'messages:read',
  'messages:send',
  'feedback:read',
  'payroll:read',
  'payroll:calculate',
  'payroll:confirm',
];

export function reset() {
  fileContents.clear();
  for (const key of Object.keys(tables)) Reflect.deleteProperty(tables, key);
  permissionCodes.forEach((code, i) =>
    insert('permissions', {
      id: seedId(1000 + i),
      code,
      name: permissionName(code),
      scopes: storeCodes.includes(code) ? ['hq', 'store'] : ['hq'],
      module: code.split(':')[0],
    }),
  );
  insert('roles', {
    id: seedId(10),
    code: 'hq',
    name: '总部管理员',
    scopeType: 'hq',
    status: 'active',
    permissionCodes,
  });
  insert('roles', {
    id: seedId(11),
    code: 'store',
    name: '门店管理员',
    scopeType: 'store',
    status: 'active',
    permissionCodes: storeCodes,
  });
  for (let i = 1; i <= 2; i++) {
    insert('stores', {
      id: seedId(i),
      code: `SH00${i}`,
      name: `上海${i === 1 ? '一' : '二'}店`,
      description: '健身门店',
      areaSqm: '800.00',
      features: ['力量训练', '操课'],
      address: `上海市示例路${i}号`,
      longitude: '121.4737000',
      latitude: '31.2304000',
      servicePhone: '02112345678',
      serviceWechat: `gym${i}`,
      businessHours: { opens: '06:00', closes: '23:00' },
      status: 'active',
      media: [],
    });
    insert('employees', {
      id: seedId(20 + i),
      employeeNo: `E00${i}`,
      name: `店长${i}`,
      phone: `1380000000${i}`,
      jobTitle: '店长',
      hiredOn: '2026-01-01',
      status: 'active',
      storeIds: [seedId(i)],
      storeAssignments: [
        {
          storeId: seedId(i),
          isPrimary: true,
          isManager: true,
          joinedOn: '2026-01-01',
        },
      ],
    });
  }
  const hash = passwordHash('123456');
  insert('accounts', {
    id: seedId(30),
    username: 'hq',
    realName: '总部管理员',
    passwordHash: hash,
    status: 'active',
    assignments: [{ roleId: seedId(10) }],
  });
  for (let i = 1; i <= 2; i++)
    insert('accounts', {
      id: seedId(30 + i),
      username: `store${i}`,
      realName: `店长${i}`,
      employeeId: seedId(20 + i),
      passwordHash: hash,
      status: 'active',
      assignments: [{ roleId: seedId(11), storeId: seedId(i) }],
    });
  insert('cardTemplates', {
    id: seedId(40),
    templateKey: seedId(40),
    version: 1,
    name: '全国通用月卡',
    kind: 'period',
    durationDays: 30,
    price: '199.00',
    memberPrefix: '通卡',
    accessScope: 'all',
    storeIds: [],
    status: 'published',
  });
  insert('cardTemplates', {
    id: seedId(41),
    templateKey: seedId(41),
    version: 1,
    name: '十次卡',
    kind: 'count',
    includedUses: 10,
    price: '299.00',
    memberPrefix: '次卡',
    accessScope: 'selected',
    storeIds: [seedId(1)],
    status: 'published',
  });
  for (let i = 1; i <= 8; i++) {
    const storeId = seedId(i <= 5 ? 1 : 2);
    const member = insert('members', {
      id: seedId(100 + i),
      memberNo: `M${String(i).padStart(5, '0')}`,
      phone: `1390000000${i}`,
      name: `会员${i}`,
      gender: i % 2 ? 'male' : 'female',
      nickname: '',
      customerStage: i <= 6 ? 'member' : 'lead',
      registeredStoreId: storeId,
      source: 'web',
      status: 'active',
      registeredAt: now(),
    });
    insert('memberStores', {
      memberId: member.id,
      storeId,
      joinedAt: now(),
      status: 'active',
    });
    if (i <= 6)
      insert('memberCards', {
        id: seedId(200 + i),
        memberId: member.id,
        cardTemplateId: seedId(40),
        issuedStoreId: storeId,
        storeId,
        cardNo: `CARD${i}`,
        name: '全国通用月卡',
        displayPrefix: `${find('stores', storeId).name}通卡`,
        startsAt: now(),
        expiresAt: new Date(Date.now() + (i + 1) * 86_400_000).toISOString(),
        status: 'active',
        accessScope: 'all',
        storeIds: [],
        templateSnapshot: { ...find('cardTemplates', seedId(40)) },
      });
  }
  seedTraining();
  seedGovernance();
  seedDevices();
  seedSales();
  seedMarketing();
  seedContent();
  seedSettlement();
}
if (rows('stores').length === 0) reset();

function permissionName(code: string) {
  const names: Record<string, string> = {
    stores: '门店',
    employees: '员工',
    accounts: '账号',
    roles: '角色权限',
    members: '会员',
    cards: '卡种',
    files: '文件',
    reports: '报表',
    courses: '课程',
    bookings: '预约',
    checkins: '签到',
    lessons: '上课记录',
    measurements: '体测',
    contracts: '合同',
    approvals: '审批',
    devices: '设备',
    equipment: '器械教学',
    blacklist: '黑名单',
    sales: '售卡记录',
    points: '积分',
    coupons: '优惠券',
    gifts: '礼品码',
    messages: '消息',
    content: '展示内容',
    activities: '活动',
    franchise: '加盟',
    feedback: '评价反馈',
    settlement: '收款分账',
    payroll: '工资',
  };
  const actions: Record<string, string> = {
    read: '查看',
    write: '编辑',
    upload: '上传',
    templates: '模板设置',
    remind: '提醒',
    decide: '审批处理',
    command: '远程操作',
    settings: '设置',
    manage: '管理',
    issue: '发放',
    allocate: '分配额度',
    send: '发送',
    calculate: '计算',
    confirm: '确认',
  };
  const [module = '', action = ''] = code.split(':');
  return `${names[module] ?? module} · ${actions[action] ?? action}`;
}
