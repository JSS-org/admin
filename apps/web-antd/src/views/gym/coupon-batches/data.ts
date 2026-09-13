import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '批量发券',
  fields: [],
  columns: [
    { title: '批次', dataIndex: 'id' },
    { title: '人数', dataIndex: 'recipientCount' },
    { title: '成功', dataIndex: 'successCount' },
    { title: '失败', dataIndex: 'failureCount' },
    { title: '状态', dataIndex: 'status' },
    { title: '时间', dataIndex: 'createdAt' },
  ],
};

const canCreateBatch = 'coupons:issue';
export { canCreateBatch, config };
