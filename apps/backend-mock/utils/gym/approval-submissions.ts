import type { Request, Row } from './core';

import {
  allowed,
  choice,
  fail,
  find,
  insert,
  memberScope,
  money,
  now,
  only,
  rows,
  storeScope,
  str,
  uuid,
} from './core';
import { fileAccess } from './files';

const businessTypes = ['card_opening', 'contract', 'price_change', 'other_configured'];

export function approvalOptions(req: Request) {
  allowed(req.actor, 'approvals:create');
  return {
    templates: rows('approvalTemplates')
      .filter((row) => row.status === 'published')
      .map((row) => ({
        id: row.id,
        name: row.name,
        businessType: row.businessType,
        version: row.version,
      })),
  };
}

export function createApproval(req: Request) {
  const { actor, body } = req;
  allowed(actor, 'approvals:create');
  only(body, [
    'businessType',
    'templateId',
    'storeId',
    'sourceType',
    'sourceId',
    'memberId',
    'cardTemplateId',
    'title',
    'reason',
    'requestedPrice',
    'attachmentIds',
  ]);
  const storeId = uuid(body.storeId, '门店');
  storeScope(actor, storeId);
  const businessType = choice(body.businessType, businessTypes, '审批类型');
  const requestKey = str(req.key, 'Idempotency-Key', 128);
  const fingerprint = JSON.stringify(
    Object.keys(body)
      .toSorted()
      .map((key) => [key, body[key]]),
  );
  const previous = rows('approvals').find((row) => row.createdBy === actor.id && row.requestKey === requestKey);
  if (previous) {
    if (previous.fingerprint !== fingerprint) fail('幂等键已用于其他审批内容', 409);
    return previous;
  }
  const applicant = find('employees', find('accounts', actor.id).employeeId);
  if (applicant.status !== 'active') fail('申请人必须是有效员工');
  const template = find('approvalTemplates', uuid(body.templateId, '审批模板'));
  if (template.status !== 'published' || template.businessType !== businessType) fail('请选择该业务已发布的审批模板');
  const title = str(body.title, '申请事项', 255);
  const snapshot: Record<string, any> = { reason: str(body.reason, '申请原因', 2000) };
  const sourceType = body.sourceType
    ? choice(
        body.sourceType,
        ['members', 'card-templates', 'orders', 'subscriptions', 'contracts', 'course-products'],
        '关联业务',
      )
    : undefined;
  const sourceId = sourceType ? uuid(body.sourceId, '关联记录') : undefined;
  if (!sourceType && body.sourceId) fail('请指定关联业务');
  let memberId = body.memberId ? uuid(body.memberId, '会员') : undefined;
  let cardTemplateId = body.cardTemplateId ? uuid(body.cardTemplateId, '会员卡模板') : undefined;
  if (businessType !== 'card_opening' && (memberId || cardTemplateId)) fail('该审批类型无需填写会员卡信息');
  // Check each business permission with an independent scope, preserving approval scope.
  const businessAccess = (code: string) => {
    const scopedActor = { ...actor };
    allowed(scopedActor, code);
    storeScope(scopedActor, storeId);
    return scopedActor;
  };
  if (businessType === 'card_opening') {
    if (sourceType && !['card-templates', 'members', 'orders'].includes(sourceType)) fail('开卡审批关联业务不匹配');
    if (sourceType === 'members') memberId = sourceId;
    if (sourceType === 'card-templates') cardTemplateId = sourceId;
    if (sourceType === 'orders') {
      businessAccess('sales:read');
      if (!sourceId) fail('请选择关联记录');
      const order = find('orders', sourceId);
      if (order.storeId !== storeId) fail('关联订单不属于该门店', 404);
      if (['cancelled', 'refunded'].includes(order.status)) fail('该订单不能发起开卡审批');
      const items = rows('orderItems').filter((item) => item.orderId === order.id && item.productType === 'card');
      const item = items[0];
      if (items.length !== 1 || !item) fail('请选择包含单一会员卡的订单');
      memberId = order.memberId;
      cardTemplateId = item.cardTemplateId;
      snapshot.orderNo = order.orderNo;
      snapshot.amount = order.payableAmount;
    }
    const member = memberScope(businessAccess('members:read'), uuid(memberId, '会员'), storeId);
    businessAccess('cards:read');
    const card = find('cardTemplates', uuid(cardTemplateId, '会员卡模板'));
    if (card.status !== 'published' || (card.accessScope !== 'all' && !card.storeIds?.includes(storeId)))
      fail('该会员卡未发布或不适用于此门店');
    Object.assign(snapshot, {
      memberName: member.name,
      memberPhone: member.phone,
      cardName: card.name,
      cardType: card.kind,
      amount: snapshot.amount ?? card.price,
    });
  } else if (businessType === 'contract') {
    if (!sourceType || !sourceId || !['contracts', 'subscriptions'].includes(sourceType))
      fail('请选择签约合同或包月协议');
    businessAccess(sourceType === 'contracts' ? 'contracts:read' : 'sales:read');
    const source = find(sourceType, sourceId);
    if (source.storeId !== storeId) fail('关联记录不属于该门店', 404);
    if (source.status === 'cancelled') fail('已取消的记录不能发起签约审批');
    memberId = source.memberId;
    const member = memberScope(businessAccess('members:read'), uuid(memberId, '会员'), storeId);
    Object.assign(snapshot, {
      memberName: member.name,
      memberPhone: member.phone,
      contractNo: source.contractNo ?? source.externalAgreementId,
    });
    snapshot.contractName =
      sourceType === 'contracts' ? find('contractTemplates', source.templateId).name : '连续包月协议';
  } else if (businessType === 'price_change') {
    if (sourceType !== 'course-products' || !sourceId) fail('请选择改价课程');
    businessAccess('courses:read');
    const product = find('courseProducts', sourceId);
    if (product.storeId !== storeId) fail('课程不属于该门店', 404);
    if (product.status !== 'active') fail('仅可申请启用课程改价');
    Object.assign(snapshot, {
      courseName: product.name,
      originalPrice: product.price,
      requestedPrice: money(body.requestedPrice, '申请价格'),
    });
  } else if (sourceType || memberId || cardTemplateId) fail('其他审批无需关联业务记录');

  const attachmentIds = body.attachmentIds ?? [];
  if (
    !Array.isArray(attachmentIds) ||
    attachmentIds.length > 10 ||
    new Set(attachmentIds).size !== attachmentIds.length
  )
    fail('附件最多10个，且不能重复');
  const attachments = attachmentIds.map((fileId) => {
    const file = find('files', uuid(fileId, '附件'));
    fileAccess({ ...actor }, file);
    if (
      file.status !== 'active' ||
      !['approval', 'contract', 'image'].includes(file.category) ||
      !['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimeType)
    )
      fail('附件必须是有效的PDF或图片');
    if (!Number.isFinite(file.byteSize) || file.byteSize < 0 || file.byteSize > 20 * 1024 * 1024)
      fail('单个附件不能超过20 MB');
    if (file.storeId !== storeId) fail('附件不属于申请门店', 404);
    return { id: file.id, originalName: file.originalName, mimeType: file.mimeType, byteSize: file.byteSize };
  });
  if (businessType === 'contract' && attachments.length === 0) fail('签约审批请附上合同或协议');
  if (!Array.isArray(template.steps) || template.steps.length === 0) fail('模板未配置审批人');
  const approvers = template.steps.map((step: Row, index: number) => {
    if (step.stepNo !== index + 1 || !!step.approverEmployeeId === !!step.approverRoleId) fail('审批模板步骤无效');
    const accounts = rows('accounts').filter(
      (account) =>
        account.status === 'active' &&
        account.employeeId &&
        (!step.approverEmployeeId || account.employeeId === step.approverEmployeeId) &&
        find('employees', account.employeeId).status === 'active' &&
        account.assignments.some((assignment: Row) => {
          const role = find('roles', assignment.roleId);
          return (
            (!step.approverRoleId || role.id === step.approverRoleId) &&
            role.scopeType === 'hq' &&
            role.status === 'active' &&
            role.permissionCodes.includes('approvals:decide')
          );
        }),
    );
    if (accounts.length !== 1) fail('模板审批人不可用，请联系总部调整模板');
    const account = accounts[0];
    if (!account) fail('模板审批人不可用，请联系总部调整模板');
    return { stepNo: index + 1, approverEmployeeId: account.employeeId };
  });
  const businessKey = JSON.stringify(
    businessType === 'card_opening'
      ? [businessType, storeId, memberId, cardTemplateId]
      : [businessType, storeId, sourceType ?? '', sourceId ?? ''],
  );
  if (
    businessType !== 'other_configured' &&
    rows('approvals').some((row) => row.businessKey === businessKey && row.status === 'pending')
  )
    fail('该业务已有待处理审批，请勿重复提交', 409);
  const approval = insert('approvals', {
    templateId: template.id,
    storeId,
    memberId,
    cardTemplateId,
    sourceType,
    sourceId,
    businessType,
    businessKey,
    title,
    applicantEmployeeId: applicant.id,
    requestSnapshot: { ...snapshot, templateSteps: structuredClone(approvers) },
    attachments,
    status: 'pending',
    currentStep: 1,
    submittedAt: now(),
    createdBy: actor.id,
    requestKey,
    fingerprint,
  });
  approvers.forEach((step) =>
    insert('approvalTasks', { instanceId: approval.id, ...step, status: step.stepNo === 1 ? 'pending' : 'waiting' }),
  );
  return approval;
}
