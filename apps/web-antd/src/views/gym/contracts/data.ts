import type { Field } from '#/views/gym/types';

const isTemplate = false;

const title = '合同记录';

const fields: Field[] = [];

const columns = [
  { title: '合同号', dataIndex: 'contractNo' },
  { title: '门店', dataIndex: 'storeName' },
  { title: '会员', dataIndex: 'memberName' },
  { title: '状态', dataIndex: 'status' },
  { title: '应签时间', dataIndex: 'dueAt' },
  { title: '签署时间', dataIndex: 'signedAt' },
];
export { columns, fields, isTemplate, title };
