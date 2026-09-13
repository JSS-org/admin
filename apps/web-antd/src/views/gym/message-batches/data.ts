import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '私信与批量通知',
  fields: [],
  columns: [
    { title: '标题', dataIndex: 'title' },
    { title: '类型', dataIndex: 'kind' },
    { title: '渠道', dataIndex: 'channel' },
    { title: '内容', dataIndex: 'content' },
    { title: '人数', dataIndex: 'recipientCount' },
    { title: '状态', dataIndex: 'status' },
    { title: '时间', dataIndex: 'createdAt' },
  ],
};

const canCreateBatch = 'messages:send';
export { canCreateBatch, config };
