import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, insert, rows, seedId } from './core';
import { foundation } from './foundation';
import { reset } from './state';

beforeEach(reset);
function save(body: Record<string, any>, username = 'hq') {
  return foundation({
    actor: authenticate(login(username, '123456').accessToken),
    method: 'PATCH',
    path: `employees/${seedId(21)}`,
    body,
    query: {},
  });
}
const assignment = () => ({
  storeId: seedId(1),
  templateId: seedId(920),
  effectiveFrom: '2026-10-01',
  effectiveTo: null,
});
describe('employee profile and salary configuration', () => {
  const storeAssignments = () => [
    { storeId: seedId(1), isPrimary: false, isManager: true, joinedOn: '2026-01-01' },
    { storeId: seedId(2), isPrimary: true, isManager: false, joinedOn: '2026-09-18' },
  ];
  it('saves profile, store membership and salary for a newly selected store together', () => {
    save({
      jobTitle: '跨店教练',
      storeAssignments: storeAssignments(),
      salaryAssignment: { ...assignment(), storeId: seedId(2) },
    });
    const employee = find('employees', seedId(21));
    expect(employee.jobTitle).toBe('跨店教练');
    expect(employee.storeIds).toEqual([seedId(1), seedId(2)]);
    expect(employee.storeAssignments[0]).toMatchObject({ isManager: true, joinedOn: '2026-01-01' });
    expect(employee.storeAssignments[1].isPrimary).toBe(true);
    expect(
      rows('employeeSalaryAssignments').some((row) => row.employeeId === employee.id && row.storeId === seedId(2)),
    ).toBe(true);
  });
  it('does not save profile or salary changes when a removed store still has account authorization', () => {
    const employee = structuredClone(find('employees', seedId(21)));
    const salaries = structuredClone(rows('employeeSalaryAssignments'));
    expect(() =>
      save({ name: '不能保存', storeAssignments: [storeAssignments()[1]], salaryAssignment: assignment() }),
    ).toThrow('门店授权');
    expect(find('employees', seedId(21))).toEqual(employee);
    expect(rows('employeeSalaryAssignments')).toEqual(salaries);
  });
  it('rolls back new store membership when salary validation fails', () => {
    const employee = structuredClone(find('employees', seedId(21)));
    const salaries = structuredClone(rows('employeeSalaryAssignments'));
    const logs = structuredClone(rows('operationLogs'));
    expect(() =>
      save({
        jobTitle: '不能保存',
        storeAssignments: storeAssignments(),
        salaryAssignment: { ...assignment(), storeId: seedId(2), templateId: seedId(9999) },
      }),
    ).toThrow('记录不存在');
    expect(find('employees', seedId(21))).toEqual(employee);
    expect(rows('employeeSalaryAssignments')).toEqual(salaries);
    expect(rows('operationLogs')).toEqual(logs);
  });
  it('saves a profile and switches salary periods while retaining history', () => {
    save({ jobTitle: '高级教练', salaryAssignment: assignment() });
    expect(find('employees', seedId(21)).jobTitle).toBe('高级教练');
    expect(find('employees', seedId(21)).salaryAssignment).toBeUndefined();
    expect(find('employeeSalaryAssignments', seedId(925)).effectiveTo).toBe('2026-10-01');
    expect(rows('employeeSalaryAssignments').filter((row) => row.employeeId === seedId(21))).toHaveLength(2);
  });
  it('rolls back the old period and audit entries when the new template is invalid', () => {
    const original = structuredClone(rows('employeeSalaryAssignments'));
    const logs = structuredClone(rows('operationLogs'));
    const jobTitle = find('employees', seedId(21)).jobTitle;
    expect(() =>
      save({ jobTitle: '不能保存', salaryAssignment: { ...assignment(), templateId: seedId(9999) } }),
    ).toThrow('记录不存在');
    expect(rows('employeeSalaryAssignments')).toEqual(original);
    expect(rows('operationLogs')).toEqual(logs);
    expect(find('employees', seedId(21)).jobTitle).toBe(jobTitle);
  });
  it('requires independent salary permissions even when the actor can edit employees', () => {
    const role = insert('roles', {
      code: 'staff-only',
      scopeType: 'hq',
      status: 'active',
      permissionCodes: ['employees:read', 'employees:write'],
    });
    find('accounts', seedId(31)).assignments = [{ roleId: role.id }];
    expect(() => save({ jobTitle: '越权', salaryAssignment: assignment() }, 'store1')).toThrow('权限');
    expect(find('employeeSalaryAssignments', seedId(925)).effectiveTo).toBeNull();
    expect(find('employees', seedId(21)).jobTitle).toBe('店长');
  });
  it('rejects a repeated start date without duplicating assignments', () => {
    save({ salaryAssignment: assignment() });
    const original = structuredClone(rows('employeeSalaryAssignments'));
    expect(() => save({ salaryAssignment: assignment() })).toThrow('生效日期须晚于');
    expect(rows('employeeSalaryAssignments')).toEqual(original);
  });
  it('keeps salary history untouched when the profile itself is invalid', () => {
    const original = structuredClone(rows('employeeSalaryAssignments'));
    expect(() => save({ phone: 'invalid', salaryAssignment: assignment() })).toThrow('手机号');
    expect(rows('employeeSalaryAssignments')).toEqual(original);
  });
  it('protects confirmed payroll periods and prevents cross-store assignments', () => {
    const run = insert('payrollRuns', { status: 'confirmed', storeId: seedId(1) });
    insert('payrollItems', {
      runId: run.id,
      calculationSnapshot: { assignment: { id: seedId(925) }, month: '2026-10' },
    });
    expect(() => save({ salaryAssignment: assignment() })).toThrow('已确认工资');
    expect(find('employeeSalaryAssignments', seedId(925)).effectiveTo).toBeNull();
    expect(() => save({ salaryAssignment: { ...assignment(), storeId: seedId(2) } })).toThrow('不属于目标门店');
  });
});
