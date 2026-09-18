import type { Field } from '#/views/gym/types';

const title = '全店黑名单';

const code = 'blacklist:write';

const fields: Field[] = [
  { key: 'memberId', label: '会员', type: 'select', source: 'members', required: true, immutable: true },
  {
    key: 'blockEntry',
    label: '禁止进入',
    type: 'select',
    options: [
      { label: '是', value: true },
      { label: '否', value: false },
    ],
    default: true,
    required: true,
  },
  {
    key: 'blockPurchase',
    label: '禁止购买',
    type: 'select',
    options: [
      { label: '是', value: true },
      { label: '否', value: false },
    ],
    default: true,
    required: true,
  },
  { key: 'reason', label: '原因', type: 'textarea' },
  { key: 'startsAt', label: '生效时间', type: 'datetime', required: true, immutable: true },
  { key: 'endsAt', label: '结束时间（留空长期有效）', type: 'datetime' },
];

const columns = [
  { title: '会员', dataIndex: 'memberName' },
  { title: '禁止进入', dataIndex: 'blockEntry' },
  { title: '禁止购买', dataIndex: 'blockPurchase' },
  { title: '原因', dataIndex: 'reason' },
  { title: '生效', dataIndex: 'startsAt' },
  { title: '结束', dataIndex: 'endsAt' },
  { title: '状态', dataIndex: 'status' },
];
export { code, columns, fields, title };
