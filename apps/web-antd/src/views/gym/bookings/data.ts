import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '预约管理',
  code: 'bookings:write',
  create: false,
  edit: false,
  fields: [],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '会员', dataIndex: 'memberName' },
    { title: '课程', dataIndex: 'courseName' },
    { title: '上课时间', dataIndex: 'sessionStartsAt' },
    { title: '预约时间', dataIndex: 'bookedAt' },
    { title: '状态', dataIndex: 'status' },
    { title: '备注', dataIndex: 'note' },
  ],
};
export { config };
