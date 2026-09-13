import type { Field, ResourcePageProps } from '#/views/gym/types';

const fields: Field[] = [
  { key: 'employeeNo', label: '工号', required: true, immutable: true },
  { key: 'name', label: '姓名', required: true },
  { key: 'phone', label: '手机号', required: true },
  { key: 'jobTitle', label: '职位' },
  {
    key: 'hiredOn',
    label: '入职日期',
    type: 'date',
    required: true,
    default: new Date().toISOString().slice(0, 10),
  },
  {
    key: 'storeIds',
    label: '所属门店',
    type: 'multi',
    source: 'stores',
    required: true,
    immutable: true,
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    default: 'active',
    options: [
      { label: '在职', value: 'active' },
      { label: '停用/离职', value: 'inactive' },
    ],
  },
];

const columns: ResourcePageProps['columns'] = [
  { title: '工号', dataIndex: 'employeeNo' },
  { title: '姓名', dataIndex: 'name' },
  { title: '手机号', dataIndex: 'phone' },
  { title: '门店', dataIndex: 'storeIds' },
  { title: '账号', dataIndex: 'username' },
  { title: '状态', dataIndex: 'status' },
];
export { columns, fields };
