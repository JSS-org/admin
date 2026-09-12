import type { Request, Row } from './core';

import {
  allowed,
  choice,
  decorate,
  fail,
  find,
  id,
  insert,
  integer,
  now,
  only,
  page,
  rows,
  scopeRows,
  storeScope,
  str,
  uuid,
} from './core';

function headquarters(req: Request, code: string) {
  allowed(req.actor, code);
  if (!req.actor.globalCodes.includes(code)) fail('仅总部可管理模板或处理审批', 403);
}
function steps(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) fail('审批步骤应为1到20步');
  return value.map((item, index) => {
    only(item, ['stepNo', 'approverRoleId', 'approverEmployeeId']);
    if (integer(item.stepNo, '步骤', 1, 20) !== index + 1) fail('审批步骤必须从1连续排列');
    if (!!item.approverRoleId === !!item.approverEmployeeId) fail('每步请选择角色或指定员工其中一项');
    if (item.approverEmployeeId) {
      const employee = find('employees', uuid(item.approverEmployeeId));
      if (
        employee.status !== 'active' ||
        !rows('accounts').some(
          (a) =>
            a.employeeId === employee.id &&
            a.status === 'active' &&
            a.assignments.some((link: Row) => {
              const role = find('roles', link.roleId);
              return (
                role.scopeType === 'hq' && role.status === 'active' && role.permissionCodes.includes('approvals:decide')
              );
            }),
        )
      )
        fail('指定员工必须具有有效的总部审批权限');
    } else {
      const role = find('roles', uuid(item.approverRoleId));
      if (role.scopeType !== 'hq' || role.status !== 'active' || !role.permissionCodes.includes('approvals:decide'))
        fail('审批角色必须为有效的总部审批角色');
      const accounts = rows('accounts').filter(
        (a) =>
          a.status === 'active' &&
          a.employeeId &&
          find('employees', a.employeeId).status === 'active' &&
          a.assignments.some((link: Row) => link.roleId === role.id),
      );
      if (accounts.length !== 1) fail('每级须能解析为一位有效审批人，请直接指定员工');
    }
    return { ...item, stepNo: index + 1 };
  });
}
function contractTemplate(req: Request, data: Row) {
  data.name = str(data.name, '合同模板名称');
  data.applicableType = choice(data.applicableType, ['card', 'course'], '合同适用类型');
  data.reminderDays = integer(data.reminderDays, '提醒天数', 0, 365);
  const file = find('files', uuid(data.fileId, '模板文件'));
  if (file.storeId) storeScope(req.actor, file.storeId);
  if (file.mimeType !== 'application/pdf' || file.category !== 'contract' || file.status !== 'active')
    fail('合同模板必须为已上传的合同PDF');
}
export function governance(req: Request): any {
  const { actor, method, body, query } = req;
  const [resource = '', rid, action, extra] = req.path.split('/').filter(Boolean);
  if (!['approval-templates', 'approvals', 'contract-templates', 'contracts'].includes(resource)) return undefined;
  if (extra) fail('接口不存在', 404);
  if (rid) uuid(rid);
  if (resource.endsWith('-templates')) {
    const contract = resource === 'contract-templates';
    headquarters(req, contract ? 'contracts:templates' : 'approvals:templates');
    const table = contract ? 'contractTemplates' : 'approvalTemplates';
    const row = rid ? find(table, rid) : undefined;
    if (method === 'GET' && !action) return row ?? page(rows(table), query);
    const fields = contract ? ['name', 'fileId', 'applicableType', 'reminderDays'] : ['name', 'businessType', 'steps'];
    if (
      (!rid && method === 'POST') ||
      (row && action === 'versions' && method === 'POST') ||
      (row && !action && method === 'PATCH')
    ) {
      only(body, [...fields, ...(method === 'PATCH' ? ['status'] : [])]);
      if (row && method === 'PATCH' && row.status !== 'draft' && Object.keys(body).some((key) => key !== 'status'))
        fail('已发布模板必须创建新版本', 409);
      if (row && method === 'PATCH' && row.status !== 'draft' && body.status === 'draft')
        fail('已发布模板不能退回草稿', 409);
      const data = { status: 'draft', ...row, ...body } as Row;
      data.name = str(data.name, '模板名称');
      choice(data.status, ['draft', 'published', 'inactive']);
      if (contract) contractTemplate(req, data);
      else {
        data.businessType = choice(data.businessType, ['price_change', 'contract', 'other_configured'], '审批类型');
        data.steps = steps(data.steps);
      }
      if (method === 'PATCH' && row) return Object.assign(row, data, { updatedAt: now() });
      const key = row?.templateKey ?? id();
      const version =
        Math.max(
          0,
          ...rows(table)
            .filter((r) => r.templateKey === key)
            .map((r) => r.version),
        ) + 1;
      return insert(table, {
        ...data,
        id: id(),
        templateKey: key,
        version,
        status: 'draft',
        createdAt: now(),
        updatedAt: now(),
      });
    }
    fail('接口不存在', 404);
  }
  const contract = resource === 'contracts';
  const readCode = contract ? 'contracts:read' : 'approvals:read';
  const writeCode = contract ? 'contracts:remind' : 'approvals:decide';
  allowed(actor, method === 'GET' ? readCode : writeCode);
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  const table = contract ? 'contracts' : 'approvals';
  const row = rid ? find(table, rid) : undefined;
  if (row) storeScope(actor, row.storeId);
  if (method === 'GET' && !action) {
    if (row)
      return {
        ...decorate(row),
        ...(contract
          ? {
              events: rows('contractEvents').filter((e) => e.contractId === row.id),
            }
          : {
              tasks: rows('approvalTasks')
                .filter((t) => t.instanceId === row.id)
                .map((t) => ({
                  ...t,
                  approverName: find('employees', t.approverEmployeeId).name,
                })),
            }),
      };
    let data = scopeRows(actor, rows(table));
    if (query.businessType) data = data.filter((r) => r.businessType === query.businessType);
    if (query.overdue === 'true')
      data = data.filter(
        (r) => r.status !== 'signed' && r.status !== 'cancelled' && r.dueAt && Date.parse(r.dueAt) < Date.now(),
      );
    return page(
      data.map((r) => decorate(r)),
      query,
      contract ? 'sentAt' : 'submittedAt',
    );
  }
  if (contract && row && action === 'reminders') {
    if (method === 'GET')
      return page(
        rows('contractReminders').filter((r) => r.contractId === row.id),
        query,
      );
    if (method === 'POST') {
      only(body, ['channel', 'content']);
      choice(body.channel, ['sms', 'miniapp', 'app'], '提醒渠道');
      if (!['sent', 'unsigned', 'viewed'].includes(row.status)) fail('仅可提醒未签署合同', 409);
      const content = body.content ? str(body.content, '提醒内容', 1000) : '请完成合同签署';
      const requestKey = str(req.key, 'Idempotency-Key', 128);
      const previous = rows('contractReminders').find((r) => r.createdBy === actor.id && r.requestKey === requestKey);
      const fingerprint = JSON.stringify([row.id, body.channel, content]);
      if (previous) {
        if (previous.fingerprint !== fingerprint) fail('幂等键已用于不同的提醒内容', 409);
        return previous;
      }
      return insert('contractReminders', {
        contractId: row.id,
        storeId: row.storeId,
        createdBy: actor.id,
        requestKey,
        fingerprint,
        channel: body.channel,
        content,
        scheduledAt: now(),
        status: 'failed',
        failureReason: 'Mock尚未配置真实提醒渠道，未发送',
        simulated: true,
      });
    }
  }
  if (!contract && row && action === 'decisions' && method === 'POST') {
    headquarters(req, 'approvals:decide');
    only(body, ['decision', 'comment']);
    const decision = choice(body.decision, ['approve', 'reject'], '审批决定');
    const comment = str(body.comment, '审批意见', 2000);
    if (row.status !== 'pending') fail('审批已结束，不能重复处理', 409);
    const task = rows('approvalTasks').find(
      (t) => t.instanceId === row.id && t.stepNo === row.currentStep && t.status === 'pending',
    );
    const account = find('accounts', actor.id);
    if (!task || task.approverEmployeeId !== account.employeeId) fail('仅当前指定审批人可处理', 403);
    Object.assign(task, {
      status: decision === 'approve' ? 'approved' : 'rejected',
      decision,
      comment,
      decidedAt: now(),
    });
    const next = rows('approvalTasks').find((t) => t.instanceId === row.id && t.stepNo === row.currentStep + 1);
    if (decision === 'approve' && next) {
      next.status = 'pending';
      row.currentStep += 1;
    } else {
      row.status = decision === 'approve' ? 'approved' : 'rejected';
      row.completedAt = now();
      rows('approvalTasks')
        .filter((t) => t.instanceId === row.id && t.status === 'waiting')
        .forEach((t) => {
          t.status = 'cancelled';
        });
    }
    row.updatedAt = now();
    return {
      ...decorate(row),
      tasks: rows('approvalTasks').filter((t) => t.instanceId === row.id),
    };
  }
  fail('接口不存在', 404);
}
