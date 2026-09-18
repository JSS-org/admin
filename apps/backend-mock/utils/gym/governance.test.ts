import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { fileContents, find, insert, rows, seedId } from './core';
import { fileAccess } from './files';
import { governance } from './governance';
import { reset } from './state';
function call(username: string, method: string, path: string, body = {}, key?: string, query = {}) {
  return governance({
    actor: authenticate(login(username, '123456').accessToken),
    method,
    path,
    body,
    query,
    key,
  });
}
beforeEach(reset);
describe('contract and approval management', () => {
  it.each(['approve', 'reject'])('allows %s without an approval comment', (decision) => {
    for (const comment of [undefined, null, '', '   ']) {
      reset();
      const body = comment === undefined ? { decision } : { decision, comment };
      const result = call('hq', 'POST', `/approvals/${seedId(451)}/decisions`, body);
      expect(result.status).toBe(decision === 'approve' ? 'approved' : 'rejected');
      expect(result.tasks[0].comment).toBe('');
    }
  });
  it.each([123, '字'.repeat(2001)])('rejects invalid optional comments without changing the approval', (comment) => {
    expect(() => call('hq', 'POST', `/approvals/${seedId(451)}/decisions`, { decision: 'approve', comment })).toThrow(
      '审批意见',
    );
    expect(find('approvals', seedId(451)).status).toBe('pending');
    expect(rows('approvalTasks').find((task) => task.instanceId === seedId(451))?.status).toBe('pending');
  });
  it('provides readable scoped PDF attachments for every sample approval type', () => {
    const actor = authenticate(login('store1', '123456').accessToken);
    const examples = rows('approvals').filter((row) => row.storeId === seedId(1));
    expect(examples.map((row) => row.businessType).toSorted((a, b) => String(a).localeCompare(String(b)))).toEqual([
      'card_opening',
      'contract',
      'price_change',
    ]);
    for (const example of examples) {
      expect(example.attachments.length).toBeGreaterThan(0);
      for (const attachment of example.attachments) {
        const file = find('files', attachment.id);
        expect(file.storeId).toBe(example.storeId);
        expect(() => fileAccess({ ...actor }, file)).not.toThrow();
        const bytes = fileContents.get(file.id);
        if (!bytes) throw new Error('missing file contents');
        expect(bytes.length).toBe(attachment.byteSize);
        expect(bytes.toString()).toContain('%PDF-1.4');
        expect(bytes.toString()).toContain('DEVELOPMENT ONLY');
        expect(bytes.toString()).toContain('%%EOF');
      }
    }
  });
  it.each(['card_opening', 'contract'])('filters and processes %s approvals within store scope', (businessType) => {
    const query = { businessType, status: 'pending' };
    const hq = call('hq', 'GET', '/approvals', {}, undefined, query);
    expect(hq.total).toBe(2);
    expect(hq.items.every((row: any) => row.businessType === businessType && row.canDecide)).toBe(true);
    const store = call('store1', 'GET', '/approvals', {}, undefined, query);
    expect(store.total).toBe(1);
    const row = store.items[0];
    expect(row.storeId).toBe(seedId(1));
    expect(row.canDecide).toBe(false);
    expect(row.applicantName).toBeTruthy();
    expect(row.approverName).toBe('总部审批员');
    expect(call('hq', 'GET', `/approvals/${row.id}`).requestSnapshot.memberName).toBeTruthy();
    expect(() => call('store2', 'GET', `/approvals/${row.id}`)).toThrow('不可访问');
    expect(() =>
      call('store1', 'POST', `/approvals/${row.id}/decisions`, { decision: 'approve', comment: '越权' }),
    ).toThrow('权限');
    expect(call('hq', 'POST', `/approvals/${row.id}/decisions`, { decision: 'approve', comment: '同意' }).status).toBe(
      'approved',
    );
    expect(call('hq', 'GET', '/approvals', {}, undefined, query).total).toBe(1);
    expect(call('hq', 'GET', `/approvals/${row.id}`).canDecide).toBe(false);
  });
  it('creates and filters card opening approval templates', () => {
    const template = call('hq', 'POST', '/approval-templates', {
      name: '开卡逐级审批',
      businessType: 'card_opening',
      steps: [{ stepNo: 1, approverEmployeeId: seedId(23) }],
    });
    expect(template.status).toBe('draft');
    const result = call('hq', 'GET', '/approval-templates', {}, undefined, { businessType: 'card_opening' });
    expect(result.total).toBe(2);
    expect(result.items.every((row: any) => row.businessType === 'card_opening')).toBe(true);
  });
  it('keeps published templates and in-flight application snapshots immutable', () => {
    expect(() =>
      call('hq', 'PATCH', `/contract-templates/${seedId(410)}`, {
        name: '覆盖',
      }),
    ).toThrow('新版本');
    const next = call('hq', 'POST', `/approval-templates/${seedId(420)}/versions`, { name: '新版审批' });
    expect(next.version).toBe(2);
    expect(find('approvals', seedId(451)).templateId).toBe(seedId(420));
    expect(() => call('store1', 'GET', '/approval-templates')).toThrow('权限');
    expect(() => call('store1', 'GET', `/contracts/${seedId(432)}`)).toThrow('不可访问');
  });
  it('only lets the assigned HQ approver advance the current step once', () => {
    const path = `/approvals/${seedId(451)}/decisions`;
    expect(() => call('store1', 'POST', path, { decision: 'approve', comment: '越权' })).toThrow('权限');
    insert('approvalTasks', {
      instanceId: seedId(451),
      stepNo: 2,
      approverEmployeeId: seedId(23),
      status: 'waiting',
    });
    expect(call('hq', 'POST', path, { decision: 'approve', comment: '一级通过' }).currentStep).toBe(2);
    expect(call('hq', 'POST', path, { decision: 'reject', comment: '二级拒绝' }).status).toBe('rejected');
    expect(() => call('hq', 'POST', path, { decision: 'approve', comment: '重复' })).toThrow('已结束');
  });
  it('records unsent reminders and handles identical retries without duplication', () => {
    const path = `/contracts/${seedId(431)}/reminders`;
    const first = call('store1', 'POST', path, { channel: 'sms' }, 'remind-1');
    expect(first.status).toBe('failed');
    expect(call('store1', 'POST', path, { channel: 'sms' }, 'remind-1').id).toBe(first.id);
    expect(() => call('store1', 'POST', path, { channel: 'app' }, 'remind-1')).toThrow('幂等键');
    find('contracts', seedId(431)).status = 'signed';
    expect(() => call('store1', 'POST', path, { channel: 'sms' }, 'remind-2')).toThrow('未签署');
  });
});
