import { insert, seedId } from './core';

export function seedPayroll() {
  insert('salaryTemplates', {
    id: seedId(920),
    templateKey: seedId(921),
    version: 1,
    name: '开发示例月薪模板',
    baseSalary: '4000.00',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    status: 'published',
    rules: [
      {
        id: seedId(922),
        component: 'card_sales',
        calculationType: 'rate',
        rate: '0.050000',
        lowerBound: null,
        upperBound: null,
        sortOrder: 0,
      },
      {
        id: seedId(923),
        component: 'pt_sales',
        calculationType: 'rate',
        rate: '0.100000',
        lowerBound: null,
        upperBound: null,
        sortOrder: 1,
      },
      {
        id: seedId(924),
        component: 'lessons',
        calculationType: 'per_unit',
        unitAmount: '50.00',
        sortOrder: 2,
      },
    ],
  });
  for (let i = 1; i <= 2; i++)
    insert('employeeSalaryAssignments', {
      id: seedId(924 + i),
      employeeId: seedId(20 + i),
      storeId: seedId(i),
      templateId: seedId(920),
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
    });
}
