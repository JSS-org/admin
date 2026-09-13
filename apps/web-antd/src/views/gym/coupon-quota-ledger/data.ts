import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '券额度流水',
  fields: [],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '动作', dataIndex: 'action' },
    { title: '分配变化', dataIndex: 'allocatedDelta' },
    { title: '预占变化', dataIndex: 'reservedDelta' },
    { title: '已发变化', dataIndex: 'issuedDelta' },
    { title: '时间', dataIndex: 'occurredAt' },
  ],
};

export { config };
