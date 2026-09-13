import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '会员优惠券',
  fields: [],
  columns: [
    { title: '会员', dataIndex: 'memberName' },
    { title: '发行门店', dataIndex: 'storeName' },
    { title: '优惠券', dataIndex: 'templateName' },
    { title: '券号', dataIndex: 'couponNo' },
    { title: '状态', dataIndex: 'status' },
    { title: '到期', dataIndex: 'expiresAt' },
  ],
};

export { config };
