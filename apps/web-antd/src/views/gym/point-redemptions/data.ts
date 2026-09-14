import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '兑换记录',
  fields: [],
  columns: [
    { title: '会员', dataIndex: 'memberName' },
    { title: '门店', dataIndex: 'storeName' },
    { title: '数量', dataIndex: 'quantity' },
    { title: '消耗积分', dataIndex: 'pointsSpent' },
    { title: '状态', dataIndex: 'status' },
    { title: '时间', dataIndex: 'createdAt' },
  ],
};

export { config };
