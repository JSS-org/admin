import type { GymRow } from '#/api/gym';
import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '课程产品',
  code: 'courses:write',
  fields: [
    { key: 'storeId', label: '门店', source: 'stores', type: 'select', required: true, immutable: true },
    { key: 'name', label: '课程名称', required: true },
    { key: 'description', label: '介绍', type: 'textarea' },
    { key: 'sessionCount', label: '课次', type: 'number', required: true, default: 1 },
    { key: 'durationMinutes', label: '时长（分钟）', type: 'number', required: true, default: 60, batch: true },
    { key: 'price', label: '价格（元）', type: 'money', required: true, default: '0.00', batch: true },
  ],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '课程', dataIndex: 'name' },
    { title: '类型', dataIndex: 'kind' },
    { title: '课次', dataIndex: 'sessionCount' },
    { title: '时长', dataIndex: 'durationMinutes' },
    { title: '价格', dataIndex: 'price' },
    { title: '状态', dataIndex: 'status' },
  ],
};

function editable(row: GymRow) {
  return row.kind === 'group';
}
export { config, editable };
