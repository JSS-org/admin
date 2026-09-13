import type { ResourcePageProps } from '#/views/gym/types';

const columns: ResourcePageProps['columns'] = [
  { title: '门店', dataIndex: 'storeName' },
  { title: '订单', dataIndex: 'orderNo' },
  { title: '分账基数', dataIndex: 'baseAmount' },
  { title: '应到账时间', dataIndex: 'dueAt' },
  { title: '状态', dataIndex: 'status' },
];
export { columns };
