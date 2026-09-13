import type { GymRow } from '#/api/gym';
import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '优惠券模板',
  code: 'coupons:manage',
  fields: [
    { key: 'name', label: '名称', type: 'text', required: true },
    {
      key: 'kind',
      label: '优惠方式',
      type: 'select',
      options: [
        { label: '满减', value: 'amount' },
        { label: '折扣', value: 'rate' },
      ],
      default: 'amount',
      required: true,
    },
    { key: 'discountAmount', label: '满减金额（元）', type: 'text' },
    { key: 'discountRate', label: '折扣比例（如0.8为八折）', type: 'text' },
    { key: 'minimumSpend', label: '最低消费（元）', type: 'money', default: '0.00', required: true },
    { key: 'startsAt', label: '开始时间', type: 'datetime', required: true },
    { key: 'expiresAt', label: '过期时间', type: 'datetime', required: true },
    { key: 'totalLimit', label: '总发行张数上限（空为不限）', type: 'number' },
    { key: 'perMemberLimit', label: '每人最多领取张数', type: 'number', default: 1, required: true },
    {
      key: 'scope',
      label: '适用门店',
      type: 'select',
      options: [
        { label: '全部门店', value: 'all' },
        { label: '指定门店', value: 'selected' },
      ],
      default: 'all',
      required: true,
    },
    { key: 'storeIds', label: '指定门店', type: 'multi', source: 'stores' },
  ],
  columns: [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'kind' },
    { title: '开始', dataIndex: 'startsAt' },
    { title: '到期', dataIndex: 'expiresAt' },
    { title: '总限额', dataIndex: 'totalLimit' },
    { title: '已分配', dataIndex: 'allocatedCount' },
    { title: '已发放', dataIndex: 'issuedCount' },
    { title: '状态', dataIndex: 'status' },
  ],
};

function initial(row: GymRow) {
  const data = { ...row };
  for (const key of ['startsAt', 'expiresAt', 'effectiveFrom', 'effectiveTo'])
    if (data[key]) {
      const time = new Date(data[key]);
      data[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    }
  return data;
}

function editable(row: GymRow) {
  return row.allocatedCount === 0;
}
export { config, editable, initial };
