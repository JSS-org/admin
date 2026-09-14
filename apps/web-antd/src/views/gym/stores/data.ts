import type { Field, ResourcePageProps } from '#/views/gym/types';

const fields: Field[] = [
  { key: 'code', label: '门店编码', required: true },
  { key: 'name', label: '门店名称', required: true },
  { key: 'description', label: '简介', type: 'textarea', default: '' },
  {
    key: 'areaSqm',
    label: '面积（平方米）',
    type: 'money',
    required: true,
    default: '0.00',
  },
  { key: 'features', label: '特色项目', type: 'tags', default: [] },
  { key: 'address', label: '详细地址', required: true },
  { key: 'longitude', label: '经度', type: 'number', min: -180, max: 180, precision: 7 },
  { key: 'latitude', label: '纬度', type: 'number', min: -90, max: 90, precision: 7 },
  { key: 'servicePhone', label: '客服电话' },
  { key: 'serviceWechat', label: '客服微信' },
  {
    key: 'opens',
    label: '开始营业',
    type: 'time',
    default: '06:00',
    required: true,
  },
  {
    key: 'closes',
    label: '结束营业',
    type: 'time',
    default: '23:00',
    required: true,
  },
  {
    key: 'status',
    batch: true,
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
  { title: '面积', dataIndex: 'areaSqm' },
  { title: '地址', dataIndex: 'address' },
  { title: '客服', dataIndex: 'servicePhone' },
  { title: '状态', dataIndex: 'status' },
];
export { columns, fields };
