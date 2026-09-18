import type { FilterField } from '#/views/gym/components/filter-bar.vue';
import type { Field } from '#/views/gym/types';

import { approvalBusinessTypes, approvalStatuses } from './options';

const title = '审批记录';

const fields: Field[] = [
  { key: 'businessType', label: '审批类型', options: approvalBusinessTypes },
  { key: 'status', label: '审批状态', options: approvalStatuses },
];

const filterFields: FilterField[] = [
  { key: 'businessType', label: '审批类型', type: 'select', options: approvalBusinessTypes },
  { key: 'status', label: '审批状态', type: 'select', options: approvalStatuses },
];

const columns = [
  { title: '申请事项', dataIndex: 'title' },
  { title: '审批类型', dataIndex: 'businessType' },
  { title: '门店', dataIndex: 'storeName' },
  { title: '申请人', dataIndex: 'applicantName' },
  { title: '当前审批人', dataIndex: 'approverName' },
  { title: '状态', dataIndex: 'status' },
  { title: '当前步骤', dataIndex: 'currentStep' },
  { title: '申请时间', dataIndex: 'submittedAt' },
];
export { columns, fields, filterFields, title };
