const labels: Record<string, string> = {
  card_sales: '会员卡销售提成',
  pt_sales: '私教销售提成',
  lessons: '消课提成',
  allowance: '固定加项',
  deduction: '固定扣项',
};

const templateColumns = [
  { title: '模板', dataIndex: 'name' },
  { title: '版本', dataIndex: 'version' },
  { title: '底薪', dataIndex: 'baseSalary' },
  { title: '生效', dataIndex: 'effectiveFrom' },
  { title: '失效', dataIndex: 'effectiveTo' },
  { title: '状态', dataIndex: 'status' },
];
export { labels, templateColumns };
