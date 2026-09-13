import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '上课记录',
  create: false,
  edit: false,
  fields: [],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '会员', dataIndex: 'memberName' },
    { title: '教练', dataIndex: 'coachName' },
    { title: '确认时间', dataIndex: 'confirmedAt' },
    { title: '扣课次数', dataIndex: 'sessionUnits' },
    { title: '方式', dataIndex: 'method' },
    { title: '状态', dataIndex: 'status' },
  ],
};
export { config };
