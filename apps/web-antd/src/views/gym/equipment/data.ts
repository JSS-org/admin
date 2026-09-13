import type { Field } from '#/views/gym/types';

const title = '器械教学';

const code = 'equipment:write';

const fields: Field[] = [
  { key: 'storeId', label: '门店', type: 'select', source: 'stores', required: true, immutable: true },
  { key: 'code', label: '器械编码', required: true, immutable: true },
  { key: 'name', label: '名称', required: true },
  { key: 'model', label: '型号' },
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

const columns = [
  { title: '门店', dataIndex: 'storeName' },
  { title: '编号', dataIndex: 'code' },
  { title: '名称', dataIndex: 'name' },
  { title: '型号', dataIndex: 'model' },
  { title: '状态', dataIndex: 'status' },
];
export { code, columns, fields, title };
