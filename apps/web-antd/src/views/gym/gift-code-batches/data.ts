import type { GymRow } from '#/api/gym';
import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '礼品码生成',
  code: 'gifts:manage',
  editable: false,
  fields: [
    { key: 'name', label: '批次名称', type: 'text', required: true },
    {
      key: 'rewardType',
      label: '礼品类型',
      type: 'select',
      options: [
        { label: '会员卡', value: 'card' },
        { label: '课程', value: 'course' },
        { label: '积分', value: 'points' },
      ],
      default: 'card',
      required: true,
    },
    {
      key: 'cardTemplateId',
      label: '会员卡',
      type: 'select',
      source: 'card-templates',
      required: true,
      visibleWhen: (values) => values.rewardType === 'card',
    },
    {
      key: 'courseProductId',
      label: '课程',
      type: 'select',
      source: 'course-products',
      required: true,
      visibleWhen: (values) => values.rewardType === 'course',
    },
    {
      key: 'pointAmount',
      label: '积分数',
      type: 'number',
      min: 1,
      required: true,
      visibleWhen: (values) => values.rewardType === 'points',
    },
    { key: 'count', label: '生成数量', type: 'number', required: true, default: 10 },
    { key: 'expiresAt', label: '过期时间', type: 'datetime', required: true },
  ],
  columns: [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'rewardType' },
    { title: '数量', dataIndex: 'count' },
    { title: '到期', dataIndex: 'expiresAt' },
  ],
};

function prepare(values: Record<string, any>) {
  const data = { ...values };
  for (const key of ['startsAt', 'expiresAt', 'effectiveFrom', 'effectiveTo'])
    if (data[key]) data[key] = new Date(data[key]).toISOString();
  const kind = data.rewardType ?? data.kind;
  for (const key of ['cardTemplateId', 'courseProductId', 'pointAmount'])
    if (
      key !==
      (
        {
          card: 'cardTemplateId',
          course: 'courseProductId',
          points: 'pointAmount',
        } as Record<string, string>
      )[kind]
    )
      Reflect.deleteProperty(data, key);
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

export { config, initial, prepare };
