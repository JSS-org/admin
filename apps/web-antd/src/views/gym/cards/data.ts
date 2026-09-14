import type { Field, ResourcePageProps } from '#/views/gym/types';

const fields: Field[] = [
  { key: 'name', label: '卡种名称', required: true },
  {
    key: 'kind',
    label: '类型',
    type: 'select',
    required: true,
    default: 'period',
    options: [
      { label: '期限卡', value: 'period' },
      { label: '次卡', value: 'count' },
    ],
  },
  {
    key: 'durationDays',
    label: '有效天数',
    required: true,
    min: 1,
    visibleWhen: (values) => values.kind === 'period',
    type: 'number',
    default: 30,
  },
  {
    key: 'includedUses',
    label: '包含次数',
    type: 'number',
    default: 10,
    min: 1,
    required: true,
    visibleWhen: (values) => values.kind === 'count',
  },
  { key: 'price', label: '售价（元）', type: 'money', required: true, default: '0.00', batch: true },
  { key: 'memberPrefix', label: '通卡会员前缀' },
  {
    key: 'accessScope',
    label: '适用范围',
    type: 'select',
    default: 'all',
    required: true,
    options: [
      { label: '所有门店', value: 'all' },
      { label: '指定门店', value: 'selected' },
    ],
  },
  {
    key: 'storeIds',
    label: '适用门店',
    required: true,
    visibleWhen: (values) => values.accessScope === 'selected',
    type: 'multi',
    source: 'stores',
    default: [],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    default: 'draft',
    options: [
      { label: '草稿', value: 'draft' },
      { label: '发布', value: 'published' },
      { label: '停用', value: 'inactive' },
    ],
  },
];

const columns: ResourcePageProps['columns'] = [
  { title: '名称', dataIndex: 'name' },
  { title: '版本', dataIndex: 'version' },
  { title: '类型', dataIndex: 'kind' },
  { title: '售价', dataIndex: 'price' },
  { title: '范围', dataIndex: 'accessScope' },
  { title: '状态', dataIndex: 'status' },
];
export { columns, fields };
