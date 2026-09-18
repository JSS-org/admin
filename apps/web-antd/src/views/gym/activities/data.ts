import type { GymRow } from '#/api/gym';
import type { Field } from '#/views/gym/types';

const title = '门店活动';

const fields: Field[] = [
  { key: 'name', label: '活动名称', required: true },
  { key: 'description', label: '活动介绍', type: 'textarea' },
  { key: 'storeIds', label: '活动门店', type: 'multi', source: 'stores', required: true },
  { key: 'registrationStartsAt', label: '报名开始', type: 'datetime', required: true },
  { key: 'registrationEndsAt', label: '报名结束', type: 'datetime', required: true },
  { key: 'startsAt', label: '活动开始', type: 'datetime', required: true },
  { key: 'endsAt', label: '活动结束', type: 'datetime', required: true },
  { key: 'capacity', label: '名额（空为不限）', type: 'number', batch: true },
];

const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: '门店', dataIndex: 'storeNames' },
  { title: '名额', dataIndex: 'capacity' },
  { title: '报名人数', dataIndex: 'registrationCount' },
  { title: '开始时间', dataIndex: 'startsAt' },
  { title: '状态', dataIndex: 'status' },
];

function prepare(values: Record<string, any>) {
  const result = { ...values };
  for (const key of ['registrationStartsAt', 'registrationEndsAt', 'startsAt', 'endsAt'])
    if (result[key]) result[key] = new Date(result[key]).toISOString();
  return result;
}

function initial(row: GymRow) {
  const result = { ...row };
  for (const key of ['registrationStartsAt', 'registrationEndsAt', 'startsAt', 'endsAt'])
    if (result[key]) {
      const time = new Date(result[key]);
      result[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    }
  return result;
}
export { columns, fields, initial, prepare, title };
