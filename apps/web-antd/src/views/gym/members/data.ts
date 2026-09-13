import type { FilterField } from '#/views/gym/components/filter-bar.vue';
import type { Field, ResourcePageProps } from '#/views/gym/types';

const fields: Field[] = [
  {
    key: 'storeId',
    label: '建档门店',
    source: 'stores',
    type: 'select',
    required: true,
    immutable: true,
  },
  { key: 'phone', label: '手机号', required: true, immutable: true },
  { key: 'name', label: '姓名', required: true },
  { key: 'nickname', label: '昵称' },
  {
    key: 'gender',
    label: '性别',
    type: 'select',
    options: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
      { label: '未填写', value: 'unspecified' },
    ],
  },
  { key: 'birthday', label: '生日', type: 'date' },
];

const columns: ResourcePageProps['columns'] = [
  { title: '会员号', dataIndex: 'memberNo' },
  { title: '姓名', dataIndex: 'name' },
  { title: '手机号', dataIndex: 'phone' },
  { title: '门店', dataIndex: 'storeNames' },
  { title: '阶段', dataIndex: 'customerStage' },
  { title: '建档时间', dataIndex: 'registeredAt' },
];

const filterFields: FilterField[] = [
  {
    key: 'cardExpiresWithinDays',
    label: '会员卡到期',
    type: 'select',
    options: [
      { label: '7天内卡到期', value: 7 },
      { label: '30天内卡到期', value: 30 },
    ],
  },
  {
    key: 'courseExpiresWithinDays',
    label: '私教到期',
    type: 'select',
    options: [
      { label: '7天内课程到期', value: 7 },
      { label: '30天内课程到期', value: 30 },
    ],
  },
  {
    key: 'hasPersonalTraining',
    label: '私教会员',
    type: 'select',
    options: [{ label: '持有私教课程', value: 'true' }],
  },
];
export { columns, fields, filterFields };
