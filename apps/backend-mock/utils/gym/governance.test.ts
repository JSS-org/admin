import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, insert, seedId } from './core';
import { governance } from './governance';
import { reset } from './state';
function call(username: string, method: string, path: string, body = {}, key?: string) {
  return governance({
    actor: authenticate(login(username, '123456').accessToken),
    method,
    path,
    body,
    query: {},
    key,
  });
}
beforeEach(reset);
describe('contract and approval management', () => {
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
