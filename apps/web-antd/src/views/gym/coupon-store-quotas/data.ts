import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '门店优惠券额度',
  fields: [],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '券模板', dataIndex: 'templateName' },
    { title: '分配张数', dataIndex: 'allocatedCount' },
    { title: '预占张数', dataIndex: 'reservedCount' },
    { title: '已发张数', dataIndex: 'issuedCount' },
    { title: '可发张数', dataIndex: 'availableCount' },
  ],
};

export { config };
