import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '签到记录',
  create: false,
  edit: false,
  fields: [],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '会员', dataIndex: 'memberName' },
    { title: '入场时间', dataIndex: 'enteredAt' },
    { title: '离场时间', dataIndex: 'exitedAt' },
    { title: '方式', dataIndex: 'method' },
    { title: '访客类型', dataIndex: 'visitorType' },
    { title: '状态', dataIndex: 'status' },
  ],
};
export { config };
