import type { GymRow } from '#/api/gym';
import type { ResourceDefinition } from '#/views/gym/types';

const config: ResourceDefinition = {
  title: '积分兑换商品',
  code: 'points:manage',
  fields: [
    { key: 'name', label: '名称', type: 'text', required: true, immutable: false },
    {
      key: 'kind',
      label: '商品类型',
      type: 'select',
      options: [
        { label: '会员卡', value: 'card' },
        { label: '课程', value: 'course' },
        { label: '周边', value: 'merchandise' },
      ],
      default: 'card',
      required: true,
      immutable: true,
    },
    {
      key: 'cardTemplateId',
      label: '卡种',
      type: 'select',
      source: 'card-templates',
      required: false,
      immutable: true,
    },
    {
      key: 'courseProductId',
      label: '课程',
      type: 'select',
      source: 'course-products',
      required: false,
      immutable: true,
    },
    { key: 'pointsPrice', label: '兑换所需积分', type: 'number', required: true, immutable: false },
    { key: 'stock', label: '库存（空为不限）', type: 'number', immutable: false },
  ],
  columns: [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'kind' },
    { title: '兑换积分', dataIndex: 'pointsPrice' },
    { title: '库存', dataIndex: 'stock' },
    { title: '状态', dataIndex: 'status' },
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
