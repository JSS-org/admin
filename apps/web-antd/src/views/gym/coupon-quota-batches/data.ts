import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '一键维护：批量分配门店额度',
  fields: [],
  columns: [
    { title: '批次', dataIndex: 'id' },
    { title: '目标店数', dataIndex: 'targetCount' },
    { title: '每店张数', dataIndex: 'quantityPerStore' },
    { title: '总张数', dataIndex: 'totalQuantity' },
    { title: '成功门店', dataIndex: 'successCount' },
    { title: '状态', dataIndex: 'status' },
    { title: '完成时间', dataIndex: 'completedAt' },
  ],
};

const canCreateBatch = 'coupons:allocate';
export { canCreateBatch, config };
