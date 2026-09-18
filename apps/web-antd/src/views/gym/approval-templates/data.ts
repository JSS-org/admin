import type { GymRow } from '#/api/gym';
import type { Field } from '#/views/gym/types';

import { approvalBusinessTypes } from '../approvals/options';

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
    default: 'card_opening',
    options: approvalBusinessTypes,
  },
  {
    key: 'approverEmployeeIds',
    label: '审批员工',
    type: 'multi',
    source: 'employees',
    required: true,
  },
];

const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: '审批类型', dataIndex: 'businessType' },
  { title: '版本', dataIndex: 'version' },
  { title: '状态', dataIndex: 'status' },
];

function prepare(values: Record<string, any>) {
  const { approverEmployeeIds = [], ...data } = values;
  return {
    ...data,
    steps: approverEmployeeIds.map((approverEmployeeId: string, index: number) => ({
      stepNo: index + 1,
      approverEmployeeId,
    })),
  };
}

function initial(row: GymRow) {
  return {
    ...row,
    approverEmployeeIds: row.steps?.map((s: GymRow) => s.approverEmployeeId).filter(Boolean) ?? [],
  };
}
export { columns, fields, initial, isTemplate, prepare, title, writeCode };
