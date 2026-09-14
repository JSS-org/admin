import type { GymRow } from '#/api/gym';
import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '体测记录',
  code: 'measurements:write',
  fields: [
    { key: 'storeId', label: '门店', source: 'stores', type: 'select', required: true, immutable: true },
    { key: 'memberId', label: '会员', source: 'members', type: 'select', required: true, immutable: true },
    { key: 'measuredAt', label: '体测时间', type: 'datetime', required: true, immutable: true },
    { key: 'heightCm', label: '身高（cm）', type: 'number', precision: 2 },
    { key: 'weightKg', label: '体重（kg）', type: 'number', precision: 2 },
    { key: 'bodyFatPercent', label: '体脂率（%）', type: 'number', precision: 2, max: 100 },
    { key: 'muscleMassKg', label: '肌肉量（kg）', type: 'number', precision: 2 },
    { key: 'note', label: '备注', type: 'textarea' },
  ],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '会员', dataIndex: 'memberName' },
    { title: '体测时间', dataIndex: 'measuredAt' },
    { title: '身高', dataIndex: 'heightCm' },
    { title: '体重', dataIndex: 'weightKg' },
    { title: '体脂率', dataIndex: 'bodyFatPercent' },
    { title: '肌肉量', dataIndex: 'muscleMassKg' },
  ],
};

function initial(row: GymRow) {
  const data = { ...row };
  for (const key of ['startsAt', 'endsAt', 'measuredAt'])
    if (data[key]) {
      const time = new Date(data[key]);
      data[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    }
  return data;
}

function prepare(values: Record<string, any>) {
  const result = { ...values };
  for (const key of ['startsAt', 'endsAt', 'measuredAt'])
    if (result[key]) result[key] = new Date(result[key]).toISOString();
  return result;
}
export { config, initial, prepare };
