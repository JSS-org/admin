import type { GymRow } from '#/api/gym';
import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '积分规则',
  code: 'points:manage',
  fields: [
    { key: 'name', label: '名称', type: 'text', required: true },
    {
      key: 'eventType',
      label: '事件',
      type: 'select',
      options: [
        { label: '运动打卡', value: 'checkin' },
        { label: '消费', value: 'consumption' },
        { label: '邀请', value: 'invitation' },
      ],
      default: 'checkin',
      required: true,
    },
    {
      key: 'thresholdAmount',
      label: '每消费多少元奖励一次',
      type: 'money',
      required: true,
      visibleWhen: (values) => values.eventType === 'consumption',
    },
    { key: 'points', label: '每次积分', type: 'number', required: true, default: 10, batch: true },
    { key: 'dailyLimit', label: '每天上限（空为不限）', type: 'number', batch: true },
    { key: 'effectiveFrom', label: '生效时间', type: 'datetime', required: true },
    { key: 'effectiveTo', label: '结束时间', type: 'datetime' },
  ],
  columns: [
    { title: '名称', dataIndex: 'name' },
    { title: '事件', dataIndex: 'eventType' },
    { title: '积分', dataIndex: 'points' },
    { title: '每日上限', dataIndex: 'dailyLimit' },
    { title: '版本', dataIndex: 'version' },
    { title: '状态', dataIndex: 'status' },
  ],
};

function prepare(values: Record<string, any>) {
  const data = { ...values };
  for (const key of ['startsAt', 'expiresAt', 'effectiveFrom', 'effectiveTo'])
    if (data[key]) data[key] = new Date(data[key]).toISOString();
  if (data.eventType !== 'consumption') Reflect.deleteProperty(data, 'thresholdAmount');
  return data;
}

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
  return row.status === 'draft';
}
export { config, editable, initial, prepare };
