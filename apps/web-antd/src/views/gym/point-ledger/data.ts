import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '积分流水',
  fields: [],
  columns: [
    { title: '会员', dataIndex: 'memberName' },
    { title: '门店', dataIndex: 'storeName' },
    { title: '事件', dataIndex: 'eventType' },
    { title: '变动积分', dataIndex: 'delta' },
    { title: '变动后余额', dataIndex: 'balanceAfter' },
    { title: '时间', dataIndex: 'occurredAt' },
  ],
};

export { config };
