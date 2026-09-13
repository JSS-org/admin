import type { GymRow } from '#/api/gym';
import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '课程安排',
  code: 'courses:write',
  fields: [
    { key: 'storeId', label: '门店', source: 'stores', type: 'select', required: true, immutable: true },
    {
      key: 'courseProductId',
      label: '操课产品',
      source: 'course-products',
      type: 'select',
      required: true,
      immutable: true,
    },
    { key: 'coachId', label: '教练', source: 'coaches', type: 'select', required: true, immutable: true },
    { key: 'room', label: '场地' },
    { key: 'startsAt', label: '开始时间', type: 'datetime', required: true },
    { key: 'endsAt', label: '结束时间', type: 'datetime', required: true },
    { key: 'capacity', label: '容量', type: 'number', required: true, default: 20 },
  ],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '课程', dataIndex: 'courseName' },
    { title: '教练', dataIndex: 'coachName' },
    { title: '场地', dataIndex: 'room' },
    { title: '开始', dataIndex: 'startsAt' },
    { title: '结束', dataIndex: 'endsAt' },
    { title: '容量', dataIndex: 'capacity' },
    { title: '已预约', dataIndex: 'reservedCount' },
    { title: '状态', dataIndex: 'status' },
  ],
};

function editable(row: GymRow) {
  return row.status === 'scheduled';
}

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
export { config, editable, initial, prepare };
