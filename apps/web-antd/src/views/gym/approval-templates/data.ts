import type { GymRow } from '#/api/gym';
import type { Field } from '#/views/gym/types';

const isTemplate = true;

const title = '审批模板';

const writeCode = 'approvals:templates';

const fields: Field[] = [
  { key: 'name', label: '模板名称', required: true },
  {
    key: 'businessType',
    label: '业务类型',
    type: 'select',
    required: true,
    default: 'price_change',
    options: [
      { label: '改价', value: 'price_change' },
      { label: '合同', value: 'contract' },
      { label: '其他已配置审批', value: 'other_configured' },
    ],
  },
  {
    key: 'approverEmployeeIds',
    label: '审批员工（按选择顺序逐级审批）',
    type: 'multi',
    source: 'employees',
    required: true,
  },
];

const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: '版本', dataIndex: 'version' },
  { title: '状态', dataIndex: 'status' },
];

function prepare(values: Record<string, any>) {
  return values;
}

function initial(row: GymRow) {
  return {
    ...row,
    approverEmployeeIds: row.steps?.map((s: GymRow) => s.approverEmployeeId).filter(Boolean) ?? [],
  };
}
export { columns, fields, initial, isTemplate, prepare, title, writeCode };
