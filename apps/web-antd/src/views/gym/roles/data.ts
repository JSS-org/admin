import type { Field, ResourcePageProps } from '#/views/gym/types';

const fields: Field[] = [
  { key: 'code', label: '角色编码', required: true, immutable: true },
  { key: 'name', label: '名称', required: true },
  {
    key: 'scopeType',
    label: '范围',
    type: 'select',
    required: true,
    immutable: true,
    default: 'store',
    options: [
      { label: '总部', value: 'hq' },
      { label: '门店', value: 'store' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    default: 'active',
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'inactive' },
    ],
  },
];

const columns: ResourcePageProps['columns'] = [
  { title: '编码', dataIndex: 'code' },
  { title: '名称', dataIndex: 'name' },
  { title: '范围', dataIndex: 'scopeType' },
  { title: '状态', dataIndex: 'status' },
];
export { columns, fields };
