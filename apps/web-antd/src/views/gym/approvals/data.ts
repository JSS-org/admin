import type { Field } from '#/views/gym/types';

const isTemplate = false;

const title = '审批记录';

const fields: Field[] = [];

const columns = [
  { title: '申请', dataIndex: 'title' },
  { title: '门店', dataIndex: 'storeName' },
  { title: '业务', dataIndex: 'businessType' },
  { title: '状态', dataIndex: 'status' },
  { title: '当前步骤', dataIndex: 'currentStep' },
  { title: '申请时间', dataIndex: 'submittedAt' },
];
export { columns, fields, isTemplate, title };
