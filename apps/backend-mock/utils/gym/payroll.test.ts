import { beforeEach, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, rows, seedId } from './core';
import { payroll } from './payroll';
import { reset } from './state';
function call(username: string, method: string, path: string, body = {}, query = {}) {
  return payroll({
    actor: authenticate(login(username, '123456').accessToken),
    method,
    path,
    body,
    query,
  });
}
beforeEach(reset);
it('calculates auditable payroll and freezes confirmed runs', () => {
  const month = new Date().toISOString().slice(0, 7);
  const run = call('store1', 'POST', '/payrolls', {
    storeId: seedId(1),
    month,
  });
  expect(run.status).toBe('calculated');
  expect(run.items[0].baseSalary).toBe('4000.00');
  expect(run.items[0].components).toHaveLength(3);
  expect(run.items[0].cardCommission).toBe('49.75');
  expect(run.items[0].ptCommission).toBe('200.00');
  expect(run.netAmount).toBe('4299.75');
  expect(call('store1', 'POST', '/payrolls', { storeId: seedId(1), month }).id).toBe(run.id);
  expect(() => call('store2', 'GET', `/payrolls/${run.id}`)).toThrow('不可访问');
  call('store1', 'PATCH', `/payrolls/${run.id}`, { status: 'confirmed' });
  expect(() => call('store1', 'POST', `/payrolls/${run.id}/calculations`)).toThrow('不能重算');
  expect(() =>
    call('hq', 'PATCH', `/employee-salary-assignments/${seedId(925)}`, {
      effectiveTo: `${month}-15`,
    }),
  ).toThrow('已确认');
});
it('preserves prior payroll if an employee is missing a valid template', () => {
  const month = new Date().toISOString().slice(0, 7);
  const run = call('hq', 'POST', '/payrolls', { storeId: seedId(1), month });
  const itemId = run.items[0].id;
  find('employeeSalaryAssignments', seedId(925)).effectiveTo = `${month}-15`;
  expect(() => call('hq', 'POST', `/payrolls/${run.id}/calculations`)).toThrow('整月');
  expect(call('hq', 'GET', `/payrolls/${run.id}`).items[0].id).toBe(itemId);
});
it('validates template rules and blocks overlapping employee assignments', () => {
  expect(() =>
    call('hq', 'POST', '/employee-salary-assignments', {
      employeeId: seedId(21),
      storeId: seedId(1),
      templateId: seedId(920),
      effectiveFrom: '2026-03-01',
    }),
  ).toThrow('重叠');
  const data = {
    name: '测试模板',
    baseSalary: '5000.00',
    effectiveFrom: '2026-01-01',
    rules: [{ component: 'card_sales', calculationType: 'rate', rate: '0.1' }],
  };
  const template = call('hq', 'POST', '/salary-templates', data);
  call('hq', 'PATCH', `/salary-templates/${template.id}`, {
    status: 'published',
  });
  expect(() =>
    call('hq', 'PATCH', `/salary-templates/${template.id}`, {
      baseSalary: '0',
    }),
  ).toThrow('新版本');
  expect(() => call('store1', 'GET', '/salary-templates')).toThrow('权限');
  expect(() =>
    call('hq', 'POST', '/salary-templates', {
      ...data,
      rules: [...data.rules, ...data.rules],
    }),
  ).toThrow('重叠');
});
it('includes refunds in their actual payroll month', () => {
  for (const row of rows('payments')) row.paidAt = '2026-09-15T10:00:00+08:00';
  const payment = find('payments', seedId(721));
  payment.paidAt = '2026-08-15T10:00:00+08:00';
  rows('refunds').push({
    id: seedId(2000),
    paymentTransactionId: payment.id,
    amount: '199.00',
    status: 'succeeded',
    refundedAt: '2026-09-01T10:00:00+08:00',
  });
  const august = call('hq', 'POST', '/payrolls', {
    storeId: seedId(1),
    month: '2026-08',
  });
  expect(august.items[0].cardCommission).toBe('9.95');
  const september = call('hq', 'POST', '/payrolls', {
    storeId: seedId(1),
    month: '2026-09',
  });
  expect(september.items[0].cardCommission).toBe('29.85');
});
