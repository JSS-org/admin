import type { ResourcePageProps } from '#/views/gym/types';

const columns: ResourcePageProps['columns'] = [
  { title: '门店', dataIndex: 'storeName' },
  { title: '员工', dataIndex: 'employeeName' },
  { title: '模板', dataIndex: 'templateName' },
  { title: '版本', dataIndex: 'templateVersion' },
  { title: '生效', dataIndex: 'effectiveFrom' },
  { title: '失效', dataIndex: 'effectiveTo' },
];
export { columns };
