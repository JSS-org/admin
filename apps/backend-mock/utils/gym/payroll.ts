import type { Request, Row } from './core';

import {
  allowed,
  audit,
  choice,
  date,
  decorate,
  fail,
  find,
  id,
  insert,
  money,
  now,
  only,
  page,
  range,
  rows,
  scopeRows,
  storeScope,
  str,
  tables,
  uuid,
} from './core';
import { marketingHQ } from './coupons';
import { amount, cents, saleFacts } from './sales';
import { effectiveDates, overlaps, ratio } from './settlement';

const labels: Record<string, string> = {
  card_sales: '会员卡销售提成',
  pt_sales: '私教销售提成',
  lessons: '消课提成',
  allowance: '固定加项',
  deduction: '固定扣项',
};
function templateData(body: Record<string, any>) {
  const name = str(body.name, '模板名称');
  const baseSalary = money(body.baseSalary, '底薪');
  const dates = effectiveDates(body);
  if (!Array.isArray(body.rules) || body.rules.length > 100) fail('规则须为列表，最多100项');
  const rules = body.rules.map((r: Row, index: number) => {
    only(r, ['component', 'calculationType', 'rate', 'unitAmount', 'fixedAmount', 'lowerBound', 'upperBound']);
    const component = choice(r.component, Object.keys(labels), '工资组成');
    const expected =
      (
        {
          allowance: 'fixed',
          deduction: 'fixed',
          lessons: 'per_unit',
        } as Record<string, string>
      )[component] ?? 'rate';
    const calculationType = choice(r.calculationType, [expected], '计算方式');
    const result: Row = {
      id: id(),
      component,
      calculationType,
      sortOrder: index,
    };
    if (expected === 'fixed') result.fixedAmount = money(r.fixedAmount);
    if (expected === 'per_unit') result.unitAmount = money(r.unitAmount);
    if (expected === 'rate') {
      result.rate = (ratio(r.rate) / 1_000_000).toFixed(6);
      result.lowerBound = r.lowerBound === undefined || r.lowerBound === null ? null : money(r.lowerBound);
      result.upperBound = r.upperBound === undefined || r.upperBound === null ? null : money(r.upperBound);
      if (result.upperBound !== null && cents(result.upperBound) <= cents(result.lowerBound ?? 0))
        fail('提成区间上限须大于下限');
    } else if (
      (r.lowerBound !== undefined && r.lowerBound !== null) ||
      (r.upperBound !== undefined && r.upperBound !== null)
    )
      fail('仅销售提成支持金额区间');
    return result;
  });
  for (const component of ['card_sales', 'pt_sales', 'lessons']) {
    const selected = rules.filter((r) => r.component === component);
    for (let a = 0; a < selected.length; a++)
      for (let b = a + 1; b < selected.length; b++) {
        const x = selected[a];
        const y = selected[b];
        if (
          x &&
          y &&
          (component === 'lessons' ||
            (Number(x.lowerBound ?? 0) < Number(y.upperBound ?? Infinity) &&
              Number(y.lowerBound ?? 0) < Number(x.upperBound ?? Infinity)))
        )
          fail('同类提成区间不可重复或重叠');
      }
  }
  return { name, baseSalary, ...dates, rules };
}
function assignmentView(row: Row) {
  return {
    ...decorate(row),
    employeeName: find('employees', row.employeeId).name,
    templateName: find('salaryTemplates', row.templateId).name,
    templateVersion: find('salaryTemplates', row.templateId).version,
  };
}
function monthBounds(month: unknown) {
  const value = str(month, '月份', 7);
  range({ month: value });
  const [y = 0, m = 0] = value.split('-').map(Number);
  return {
    month: value,
    from: `${value}-01`,
    to: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10),
  };
}
function calculate(req: Request, storeId: string, month: string): Row[] {
  const period = monthBounds(month);
  const [from, to] = range({ month });
  const staff = rows('employees').filter((employee) =>
    (employee.storeAssignments ?? []).some(
      (a: Row) =>
        a.storeId === storeId && (a.joinedOn ?? employee.hiredOn) < period.to && (!a.leftOn || a.leftOn >= period.from),
    ),
  );
  if (staff.length === 0) fail('本月没有可计算工资的员工');
  const facts = saleFacts(req.actor, { storeId, month });
  return staff.map((employee) => {
    const assignments = rows('employeeSalaryAssignments').filter(
      (a) =>
        a.employeeId === employee.id &&
        a.storeId === storeId &&
        overlaps(a, { effectiveFrom: period.from, effectiveTo: period.to }),
    );
    const assignment = assignments[0];
    if (
      assignments.length !== 1 ||
      !assignment ||
      assignment.effectiveFrom > period.from ||
      (assignment.effectiveTo && assignment.effectiveTo < period.to)
    )
      fail(`${employee.name}缺少覆盖整月的唯一薪资模板，未修改原工资`);
    const template = find('salaryTemplates', assignment.templateId);
    if (
      template.status !== 'published' ||
      template.effectiveFrom > period.from ||
      (template.effectiveTo && template.effectiveTo < period.to)
    )
      fail(`${employee.name}的模板版本未发布或有效期未覆盖整月`);
    const sales = facts.flatMap((fact) =>
      rows('performanceAllocations')
        .filter((a) => a.orderItemId === fact.itemId && a.employeeId === employee.id)
        .map((allocation) => ({
          ...fact,
          allocationId: allocation.id,
          cents: (fact.cents * BigInt(ratio(allocation.shareRatio))) / 1_000_000n,
        })),
    );
    const lessons = rows('lessonRecords').filter(
      (r) =>
        r.storeId === storeId &&
        r.coachId === employee.id &&
        r.status === 'confirmed' &&
        Date.parse(r.confirmedAt) >= from &&
        Date.parse(r.confirmedAt) < to,
    );
    const components = template.rules.map((rule: Row) => {
      let value = 0n;
      let basis = 0n;
      let quantity: null | number = null;
      let source: Record<string, any>[] = [];
      if (rule.calculationType === 'fixed') value = cents(rule.fixedAmount);
      if (rule.calculationType === 'per_unit') {
        quantity = lessons.reduce((sum, r) => sum + r.sessionUnits, 0);
        value = cents(rule.unitAmount) * BigInt(quantity ?? 0);
        source = lessons.map((r) => ({
          lessonRecordId: r.id,
          sessionUnits: r.sessionUnits,
          confirmedAt: r.confirmedAt,
        }));
      }
      if (rule.calculationType === 'rate') {
        const selected = sales.filter((f) =>
          rule.component === 'card_sales'
            ? f.productType === 'card'
            : f.productType === 'course' && find('courseProducts', f.courseProductId ?? '').kind === 'personal',
        );
        basis = selected.reduce((sum, f) => sum + f.cents, 0n);
        let taxable = basis;
        if (rule.upperBound !== null) taxable = taxable < cents(rule.upperBound) ? taxable : cents(rule.upperBound);
        if (rule.lowerBound !== null) taxable -= cents(rule.lowerBound);
        if ((rule.lowerBound !== null || rule.upperBound !== null) && taxable < 0n) taxable = 0n;
        value = (taxable * BigInt(ratio(rule.rate))) / 1_000_000n;
        source = selected.map((f) => ({
          orderId: f.orderId,
          orderItemId: f.itemId,
          allocationId: f.allocationId,
          amount: amount(f.cents),
          occurredAt: f.occurredAt,
        }));
      }
      return {
        id: id(),
        ruleId: rule.id,
        type: rule.component,
        label: labels[rule.component],
        basisAmount: amount(basis),
        basisQuantity: quantity,
        rate: rule.rate ?? null,
        amount: amount(value),
        sourceSnapshot: { rule: structuredClone(rule), sources: source },
      };
    });
    const sum = (component: string): bigint =>
      components
        .filter((c: Row) => c.type === component)
        .reduce((total: bigint, c: Row) => total + signedCents(c.amount), 0n);
    const gross = cents(template.baseSalary) + sum('card_sales') + sum('pt_sales') + sum('lessons') + sum('allowance');
    return {
      id: id(),
      employeeId: employee.id,
      employeeName: employee.name,
      templateId: template.id,
      baseSalary: template.baseSalary,
      cardCommission: amount(sum('card_sales')),
      ptCommission: amount(sum('pt_sales')),
      lessonCommission: amount(sum('lessons')),
      allowances: amount(sum('allowance')),
      deductions: amount(sum('deduction')),
      grossAmount: amount(gross),
      netAmount: amount(gross - sum('deduction')),
      components,
      calculationSnapshot: {
        month,
        assignment: structuredClone(assignment),
        template: structuredClone(template),
        basis: '整月底薪与固定加扣项；销售按收款/退款发生时间及业绩分配；消课按已确认课时；提成按分截断',
      },
    };
  });
}
function signedCents(value: string) {
  return value.startsWith('-') ? -cents(value.slice(1)) : cents(value);
}
function runView(row: Row, details = false) {
  const items = rows('payrollItems').filter((i) => i.runId === row.id);
  return {
    ...decorate(row),
    month: row.periodMonth.slice(0, 7),
    employeeCount: items.length,
    netAmount: amount(items.reduce((sum, i) => sum + signedCents(i.netAmount), 0n)),
    ...(details ? { items } : {}),
  };
}
export function payroll(req: Request): any {
  const { actor, body, query, method } = req;
  const [resource, rid, action, itemId, extra] = req.path.split('/').filter(Boolean);
  if (!['employee-salary-assignments', 'payrolls', 'salary-templates'].includes(resource ?? '')) return undefined;
  if (resource === 'salary-templates') {
    marketingHQ(req, 'payroll:templates');
    if (!rid && method === 'GET') return page(rows('salaryTemplates'), query);
    if ((!rid || (action === 'versions' && !itemId)) && method === 'POST') {
      only(body, ['name', 'baseSalary', 'effectiveFrom', 'effectiveTo', 'rules']);
      const previous = rid ? find('salaryTemplates', uuid(rid)) : undefined;
      const data = templateData(body);
      const templateKey = previous?.templateKey ?? id();
      const version =
        Math.max(
          0,
          ...rows('salaryTemplates')
            .filter((r) => r.templateKey === templateKey)
            .map((r) => r.version),
        ) + 1;
      return insert('salaryTemplates', {
        templateKey,
        version,
        ...data,
        status: 'draft',
      });
    }
    if (rid && !action) {
      const row = find('salaryTemplates', uuid(rid));
      if (method === 'GET') return row;
      if (method === 'PATCH') {
        only(body, ['name', 'baseSalary', 'effectiveFrom', 'effectiveTo', 'rules', 'status']);
        if (row.status !== 'draft') fail('已发布薪资模板不可修改，请创建新版本', 409);
        const source = {
          ...row,
          ...body,
          rules: body.rules ?? row.rules.map(({ id: _id, sortOrder: _sort, ...r }: Row) => r),
        };
        const data = templateData(source);
        const status = body.status === undefined ? row.status : choice(body.status, ['draft', 'published']);
        Object.assign(row, data, { status, updatedAt: now() });
        audit(req, 'salary-template.update', row);
        return row;
      }
    }
  }
  if (resource === 'employee-salary-assignments') {
    method === 'GET' ? allowed(actor, 'payroll:read') : marketingHQ(req, 'payroll:templates');
    if (query.storeId) storeScope(actor, uuid(query.storeId));
    if (rid && !action && method === 'GET') {
      const row = find('employeeSalaryAssignments', uuid(rid));
      storeScope(actor, row.storeId);
      return assignmentView(row);
    }
    if (!rid && method === 'GET') {
      const effectiveOn = query.effectiveOn ? date(query.effectiveOn, '生效日期') : null;
      return page(
        scopeRows(actor, rows('employeeSalaryAssignments'))
          .filter(
            (a) =>
              (!query.employeeId || a.employeeId === uuid(query.employeeId)) &&
              (!effectiveOn || (a.effectiveFrom <= effectiveOn && (!a.effectiveTo || a.effectiveTo > effectiveOn))),
          )
          .map((r) => assignmentView(r)),
        query,
      );
    }
    if ((!rid && method === 'POST') || (rid && !action && method === 'PATCH')) {
      const existing = rid ? find('employeeSalaryAssignments', uuid(rid)) : undefined;
      only(body, existing ? ['effectiveTo'] : ['employeeId', 'storeId', 'templateId', 'effectiveFrom', 'effectiveTo']);
      const input = { ...existing, ...body };
      const storeId = storeScope(actor, uuid(input.storeId)).id;
      const employee = find('employees', uuid(input.employeeId));
      if (!employee.storeIds.includes(storeId)) fail('员工不属于目标门店');
      const template = find('salaryTemplates', uuid(input.templateId));
      if (template.status !== 'published') fail('须选择已发布薪资模板');
      const dates = effectiveDates(input);
      if (
        dates.effectiveFrom < template.effectiveFrom ||
        (template.effectiveTo && (!dates.effectiveTo || dates.effectiveTo > template.effectiveTo))
      )
        fail('薪资关联须在模板有效期内');
      if (
        rows('employeeSalaryAssignments').some(
          (a) => a.id !== existing?.id && a.employeeId === employee.id && a.storeId === storeId && overlaps(a, dates),
        )
      )
        fail('员工在该门店的薪资有效期重叠', 409);
      if (
        existing &&
        rows('payrollItems').some(
          (i) =>
            i.calculationSnapshot.assignment.id === existing.id &&
            find('payrollRuns', i.runId).status === 'confirmed' &&
            dates.effectiveTo &&
            dates.effectiveTo < monthBounds(i.calculationSnapshot.month).to,
        )
      )
        fail('不可缩短已确认工资使用的有效期', 409);
      const data = {
        employeeId: employee.id,
        storeId,
        templateId: template.id,
        ...dates,
      };
      const row = existing
        ? Object.assign(existing, data, { updatedAt: now() })
        : insert('employeeSalaryAssignments', data);
      audit(req, 'salary-assignment.save', row);
      return assignmentView(row);
    }
  }
  if (resource === 'payrolls') {
    allowed(
      actor,
      ({ GET: 'payroll:read', PATCH: 'payroll:confirm' } as Record<string, string>)[method] ?? 'payroll:calculate',
    );
    if (query.storeId) storeScope(actor, uuid(query.storeId));
    if (!rid && method === 'GET') {
      if (query.month) monthBounds(query.month);
      return page(
        scopeRows(actor, rows('payrollRuns'))
          .filter((r) => !query.month || r.periodMonth.slice(0, 7) === query.month)
          .map((r) => runView(r)),
        { ...query, month: undefined },
      );
    }
    const existing = rid ? find('payrollRuns', uuid(rid)) : undefined;
    if (existing) storeScope(actor, existing.storeId);
    if (existing && method === 'GET') {
      if (!action) return runView(existing, true);
      if (action === 'items' && itemId && !extra) {
        const item = find('payrollItems', uuid(itemId));
        if (item.runId !== existing.id) fail('工资明细不存在', 404);
        return item;
      }
    }
    if (existing && !action && method === 'PATCH') {
      only(body, ['status']);
      choice(body.status, ['confirmed']);
      if (existing.status !== 'calculated') fail('只有已全部计算的工资可以确认', 409);
      Object.assign(existing, {
        status: 'confirmed',
        confirmedAt: now(),
        confirmedBy: actor.id,
      });
      audit(req, 'payroll.confirm', existing);
      return runView(existing, true);
    }
    if (method === 'POST' && (!rid || (action === 'calculations' && !itemId))) {
      only(body, existing ? [] : ['storeId', 'month']);
      const storeId = storeScope(actor, existing?.storeId ?? uuid(body.storeId)).id;
      const period = monthBounds(existing ? existing.periodMonth.slice(0, 7) : body.month);
      const previous =
        existing ?? rows('payrollRuns').find((r) => r.storeId === storeId && r.periodMonth === period.from);
      if (previous && !existing) return runView(previous, true);
      if (previous?.status === 'confirmed') fail('已确认工资不能重算', 409);
      const items = calculate(req, storeId, period.month);
      const run =
        previous ??
        insert('payrollRuns', {
          storeId,
          periodMonth: period.from,
          status: 'draft',
        });
      tables.payrollItems = rows('payrollItems').filter((i) => i.runId !== run.id);
      for (const item of items) insert('payrollItems', { ...item, runId: run.id });
      Object.assign(run, {
        status: 'calculated',
        calculatedBy: actor.id,
        calculatedAt: now(),
      });
      audit(req, 'payroll.calculate', run);
      return runView(run, true);
    }
  }
  fail('接口不存在', 404);
}
