import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, insert, rows, seedId } from './core';
import { governance } from './governance';
import { reset } from './state';

function call(username: string, method: string, path: string, body = {}, key = 'request-1') {
  return governance({ actor: authenticate(login(username, '123456').accessToken), method, path, body, query: {}, key });
}
function card(overrides = {}) {
  return {
    businessType: 'card_opening',
    templateId: seedId(15_001),
    storeId: seedId(1),
    memberId: seedId(101),
    cardTemplateId: seedId(40),
    title: '开卡申请',
    reason: '新会员办理月卡',
    attachmentIds: [],
    ...overrides,
  };
}
function contract(overrides = {}) {
  return {
    businessType: 'contract',
    templateId: seedId(15_002),
    storeId: seedId(1),
    sourceType: 'contracts',
    sourceId: seedId(431),
    title: '签约申请',
    reason: '请审核合同',
    attachmentIds: [seedId(402)],
    ...overrides,
  };
}

beforeEach(reset);
describe('approval submission workflow', () => {
  it('exposes only published template choices to submitters without template administration rights', () => {
    find('approvalTemplates', seedId(420)).status = 'draft';
    const options = call('store1', 'GET', '/approval-options');
    expect(options.templates).toHaveLength(2);
    expect(options.templates[0]).not.toHaveProperty('steps');
    expect(() => call('store1', 'GET', '/approval-templates')).toThrow('权限');
  });
  it('takes server-owned snapshots and creates ordered tasks that can be processed in place', () => {
    find('approvalTemplates', seedId(15_001)).steps.push({ stepNo: 2, approverEmployeeId: seedId(23) });
    const result = call('store1', 'POST', '/approvals', card());
    expect(result.applicantEmployeeId).toBe(seedId(21));
    expect(result.requestSnapshot).toMatchObject({ cardName: '全国通用月卡', amount: '199.00', cardType: 'period' });
    const detail = call('hq', 'GET', `/approvals/${result.id}`);
    expect(detail.tasks.map((task: any) => task.status)).toEqual(['pending', 'waiting']);
    find('cardTemplates', seedId(40)).price = '999.00';
    find('approvalTemplates', seedId(15_001)).steps = [];
    expect(result.requestSnapshot.amount).toBe('199.00');
    const next = call('hq', 'POST', `/approvals/${result.id}/decisions`, { decision: 'approve', comment: '初审通过' });
    expect(next).toMatchObject({ currentStep: 2, canDecide: true });
    expect(next.tasks[0].approverName).toBe('总部审批员');
    const done = call('hq', 'POST', `/approvals/${result.id}/decisions`, { decision: 'reject', comment: '材料不符' });
    expect(done).toMatchObject({ status: 'rejected', canDecide: false });
  });
  it('deduplicates retries and equivalent requests from different entry points', () => {
    const body = card();
    const first = call('store1', 'POST', '/approvals', body);
    expect(call('store1', 'POST', '/approvals', body).id).toBe(first.id);
    expect(() => call('store1', 'POST', '/approvals', card({ reason: '修改原因' }))).toThrow('幂等键');
    expect(() =>
      call('store1', 'POST', '/approvals', card({ sourceType: 'members', sourceId: seedId(101) }), 'request-2'),
    ).toThrow('已有待处理审批');
    expect(rows('approvalTasks').filter((task) => task.instanceId === first.id)).toHaveLength(1);
  });
  it('supports order, membership card, subscription and course entry points', () => {
    const order = rows('orders').find((item) => item.storeId === seedId(1));
    if (!order) throw new Error('missing order');
    expect(
      call('store1', 'POST', '/approvals', card({ sourceType: 'orders', sourceId: order.id })).requestSnapshot.orderNo,
    ).toBe(order.orderNo);
    expect(
      call('store1', 'POST', '/approvals', card({ sourceType: 'card-templates', sourceId: seedId(41) }), 'card-2')
        .cardTemplateId,
    ).toBe(seedId(41));
    expect(
      call(
        'store1',
        'POST',
        '/approvals',
        contract({ sourceType: 'subscriptions', sourceId: seedId(641) }),
        'subscription',
      ).requestSnapshot.contractName,
    ).toBe('连续包月协议');
    const price = call(
      'store1',
      'POST',
      '/approvals',
      {
        businessType: 'price_change',
        storeId: seedId(1),
        templateId: seedId(420),
        sourceType: 'course-products',
        sourceId: seedId(321),
        title: '课程改价',
        reason: '活动优惠',
        requestedPrice: '1800.00',
      },
      'price',
    );
    expect(price.requestSnapshot).toMatchObject({ originalPrice: '2000.00', requestedPrice: '1800.00' });
  });
  it('requires a contract attachment and preserves its metadata through review', () => {
    expect(() => call('store1', 'POST', '/approvals', contract({ attachmentIds: [] }))).toThrow('附上合同');
    const row = call('store1', 'POST', '/approvals', contract());
    expect(row.attachments[0]).toMatchObject({ id: seedId(402), mimeType: 'application/pdf' });
    find('files', seedId(402)).originalName = 'renamed.pdf';
    expect(call('hq', 'GET', `/approvals/${row.id}`).attachments[0].originalName).toBe('mock-contract.pdf');
  });
  it('rejects cross-store references, tampered data and invalid templates without partial tasks', () => {
    const initialTasks = rows('approvalTasks').length;
    expect(() => call('store1', 'POST', '/approvals', card({ storeId: seedId(2) }))).toThrow('不可访问');
    expect(() => call('store1', 'POST', '/approvals', card({ memberId: seedId(106) }))).toThrow('会员不属于');
    expect(() => call('store1', 'POST', '/approvals', contract({ sourceId: seedId(432) }))).toThrow('不属于');
    expect(() => call('store1', 'POST', '/approvals', contract({ attachmentIds: [seedId(403)] }))).toThrow('不可访问');
    expect(() => call('store1', 'POST', '/approvals', card({ applicantEmployeeId: seedId(23) }))).toThrow('不允许');
    expect(() => call('store1', 'POST', '/approvals', card({ templateId: seedId(420) }))).toThrow('已发布');
    find('approvalTemplates', seedId(15_001)).status = 'inactive';
    expect(() => call('store1', 'POST', '/approvals', card())).toThrow('已发布');
    expect(rows('approvalTasks')).toHaveLength(initialTasks);
  });
  it('rejects unavailable approvers and invalid attachment collections', () => {
    expect(() => call('store1', 'POST', '/approvals', contract({ attachmentIds: [seedId(402), seedId(402)] }))).toThrow(
      '不能重复',
    );
    const file = insert('files', { storeId: seedId(1), category: 'approval', mimeType: 'video/mp4', status: 'active' });
    expect(() => call('store1', 'POST', '/approvals', contract({ attachmentIds: [file.id] }))).toThrow('PDF或图片');
    find('employees', seedId(23)).status = 'inactive';
    expect(() => call('store1', 'POST', '/approvals', card())).toThrow('审批人不可用');
  });
  it('checks submit permission separately from read and decision permissions', () => {
    find('roles', seedId(11)).permissionCodes = find('roles', seedId(11)).permissionCodes.filter(
      (code: string) => code !== 'approvals:create',
    );
    expect(() => call('store1', 'POST', '/approvals', card())).toThrow('权限');
    expect(() => call('store1', 'GET', '/approval-options')).toThrow('权限');
    expect(call('store1', 'GET', '/approvals').total).toBeGreaterThan(0);
  });
});
