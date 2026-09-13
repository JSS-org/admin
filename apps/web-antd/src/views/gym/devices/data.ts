import type { Field } from '#/views/gym/types';

const title = '智能设备';

const code = 'devices:write';

const fields: Field[] = [
  { key: 'storeId', label: '门店', type: 'select', source: 'stores', required: true, immutable: true },
  { key: 'name', label: '名称', required: true },
  {
    key: 'type',
    label: '类型',
    type: 'select',
    required: true,
    immutable: true,
    default: 'door',
    options: [
      { label: '门禁', value: 'door' },
      { label: '柜子', value: 'locker' },
      { label: '摄像头', value: 'camera' },
      { label: '人脸设备', value: 'face_reader' },
    ],
  },
  { key: 'provider', label: '厂商（mock为开发模拟设备）', required: true, immutable: true, default: 'mock' },
  { key: 'deviceUid', label: '设备唯一编号', required: true, immutable: true },
  { key: 'location', label: '安装位置' },
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
  { title: '名称', dataIndex: 'name' },
  { title: '类型', dataIndex: 'type' },
  { title: '设备编号', dataIndex: 'deviceUid' },
  { title: '在线', dataIndex: 'online' },
  { title: '最近在线时间', dataIndex: 'lastSeenAt' },
  { title: '状态', dataIndex: 'status' },
];
export { code, columns, fields, title };
