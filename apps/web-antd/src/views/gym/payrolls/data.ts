import type { ResourcePageProps } from '#/views/gym/types';

const itemColumns = [
  { title: '员工', dataIndex: 'employeeName' },
  { title: '底薪', dataIndex: 'baseSalary' },
  { title: '卡销售提成', dataIndex: 'cardCommission' },
  { title: '私教提成', dataIndex: 'ptCommission' },
  { title: '消课提成', dataIndex: 'lessonCommission' },
  { title: '加项', dataIndex: 'allowances' },
  { title: '扣项', dataIndex: 'deductions' },
  { title: '应发', dataIndex: 'grossAmount' },
  { title: '实发', dataIndex: 'netAmount' },
  { title: '明细', key: 'action' },
];

const columns: ResourcePageProps['columns'] = [
  { title: '门店', dataIndex: 'storeName' },
  { title: '月份', dataIndex: 'month' },
  { title: '员工数', dataIndex: 'employeeCount' },
  { title: '实发合计', dataIndex: 'netAmount' },
  { title: '状态', dataIndex: 'status' },
  { title: '计算时间', dataIndex: 'calculatedAt' },
  { title: '确认时间', dataIndex: 'confirmedAt' },
];
export { columns, itemColumns };
