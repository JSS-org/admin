import type { GymRow } from '#/api/gym';
import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '小程序 / App 码',
  code: 'courses:write',
  edit: false,
  fields: [
    { key: 'storeId', label: '门店', source: 'stores', type: 'select', required: true, immutable: true },
    {
      key: 'platform',
      label: '平台',
      type: 'select',
      required: true,
      default: 'miniapp',
      options: [
        { label: '小程序', value: 'miniapp' },
        { label: 'App', value: 'app' },
      ],
    },
    {
      key: 'sceneType',
      label: '场景',
      type: 'select',
      required: true,
      default: 'store',
      options: [
        { label: '门店', value: 'store' },
        { label: '课程', value: 'course' },
      ],
    },
    { key: 'sceneId', label: '课程（课程场景必选）', source: 'course-sessions', type: 'select' },
  ],
  columns: [
    { title: '门店', dataIndex: 'storeName' },
    { title: '平台', dataIndex: 'platform' },
    { title: '场景', dataIndex: 'sceneType' },
    { title: '状态', dataIndex: 'status' },
    { title: '创建时间', dataIndex: 'createdAt' },
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
  if (result.sceneType === 'store') Reflect.deleteProperty(result, 'sceneId');
  return result;
}
export { config, initial, prepare };
