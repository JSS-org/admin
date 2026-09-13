import type { Field } from '#/views/gym/types';

const title = '门店评价';

const fields: Field[] = [];

const columns = [
  { title: '门店', dataIndex: 'storeName' },
  { title: '平台', dataIndex: 'platform' },
  { title: '评分', dataIndex: 'rating' },
  { title: '匿名', dataIndex: 'anonymous' },
  { title: '评价会员', dataIndex: 'memberName' },
  { title: '内容', dataIndex: 'content' },
  { title: '时间', dataIndex: 'submittedAt' },
];
export { columns, fields, title };
