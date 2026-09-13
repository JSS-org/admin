import type { Field } from '#/views/gym/types';

const isTemplate = true;

const title = '合同模板';

const writeCode = 'contracts:templates';

const fields: Field[] = [
  { key: 'name', label: '模板名称', required: true },
  {
    key: 'applicableType',
    label: '适用类型',
    type: 'select',
    required: true,
    default: 'card',
    options: [
      { label: '会员卡', value: 'card' },
      { label: '课程', value: 'course' },
    ],
  },
  { key: 'reminderDays', label: '提前提醒天数', type: 'number', required: true, default: 3 },
];

const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: '版本', dataIndex: 'version' },
  { title: '状态', dataIndex: 'status' },
];
export { columns, fields, isTemplate, title, writeCode };
