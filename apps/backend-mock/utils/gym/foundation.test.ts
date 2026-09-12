import type { Request, Row } from './core';

import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login, refresh, revoke } from './auth';
import { find, insert, seedId } from './core';
import { foundation } from './foundation';
import { reset } from './state';

function request(username: string, method: string, path: string, body = {}, query = {}) {
  const actor = authenticate(login(username, '123456').accessToken);
  return foundation({ actor, method, path, body, query } as Request) as any;
}
beforeEach(reset);
describe('management authentication and scope', () => {
  it('expires the old refresh session and revokes logout', () => {
    const session = login('hq', '123456');
    const next = refresh(session.refreshToken);
    expect(() => authenticate(session.accessToken)).toThrow('登录已过期');
    expect(() => refresh(session.refreshToken)).toThrow('登录已过期');
    expect(authenticate(next.accessToken).scopeType).toBe('hq');
    revoke(next.accessToken);
    expect(() => authenticate(next.accessToken)).toThrow('登录已过期');
  });
  it('filters list and denies foreign details and writes', () => {
    expect(request('store1', 'GET', '/stores').items.map((r: Row) => r.id)).toEqual([seedId(1)]);
    expect(() => request('store1', 'GET', `/stores/${seedId(2)}`)).toThrow('门店不可访问');
    expect(() => request('store1', 'PATCH', `/stores/${seedId(1)}`, { name: '越权' })).toThrow('权限');
    expect(() => request('store1', 'GET', `/members/${seedId(106)}`)).toThrow('会员不可访问');
    expect(() => request('store1', 'GET', '/members', {}, { storeId: seedId(2) })).toThrow('门店不可访问');
  });
  it('does not combine permissions from different store assignments', () => {
    const role = insert('roles', {
      code: 'reader2',
      scopeType: 'store',
      status: 'active',
      permissionCodes: ['stores:read'],
    });
    const account = find('accounts', seedId(31));
    account.assignments.push({ roleId: role.id, storeId: seedId(2) });
    expect(request('store1', 'GET', '/stores').items).toHaveLength(2);
    expect(() =>
      request('store1', 'POST', '/members', {
        storeId: seedId(2),
        phone: '13988889999',
        name: '越权',
      }),
    ).toThrow('门店不可访问');
  });
  it('protects the last headquarters administrator', () => {
    expect(() => request('hq', 'PATCH', `/accounts/${seedId(30)}`, { status: 'inactive' })).toThrow('至少保留');
    expect(() =>
      request('hq', 'PUT', `/accounts/${seedId(30)}/roles`, {
        assignments: [],
      }),
    ).toThrow('至少保留');
    expect(() => request('hq', 'PATCH', `/roles/${seedId(10)}`, { status: 'inactive' })).toThrow('至少保留');
  });
});
describe('foundation workflows', () => {
  it('persists edits and validates fields instead of mass assignment', () => {
    request('hq', 'PATCH', `/stores/${seedId(1)}`, { name: '新名称' });
    expect(request('store1', 'GET', `/stores/${seedId(1)}`).name).toBe('新名称');
    expect(() => request('hq', 'PATCH', `/stores/${seedId(1)}`, { areaSqm: '-1' })).toThrow('面积');
    expect(() => request('hq', 'PATCH', `/stores/${seedId(1)}`, { createdBy: 'other' })).toThrow('不允许修改');
  });
  it('creates a member and lists them only in the correct store', () => {
    const member = request('store1', 'POST', '/members', {
      storeId: seedId(1),
      phone: '13988889999',
      name: '新会员',
    });
    expect(request('store1', 'GET', '/members', {}, { keyword: '13988889999' }).total).toBe(1);
    expect(request('store2', 'GET', '/members', {}, { keyword: '13988889999' }).total).toBe(0);
    expect(() =>
      request('store1', 'PATCH', `/members/${member.id}`, {
        phone: '13988889998',
      }),
    ).toThrow('不允许修改');
  });
  it('preserves selected-store rights in new card versions and sold cards', () => {
    const version = request('hq', 'POST', `/card-templates/${seedId(41)}/versions`);
    expect(version.storeIds).toEqual([seedId(1)]);
    expect(version.version).toBe(2);
    expect(version.status).toBe('draft');
    expect(() =>
      request('hq', 'PATCH', `/card-templates/${seedId(40)}`, {
        price: '1.00',
      }),
    ).toThrow('新版本');
    const card = request('store1', 'GET', `/members/${seedId(101)}/cards`).items[0];
    expect(card.name).toBe('全国通用月卡');
    expect(card.templateSnapshot).toBeUndefined();
  });
  it('rejects invalid dates and invalid pagination', () => {
    expect(() => request('hq', 'GET', '/members', {}, { date: '2026-02-30' })).toThrow('有效日期');
    expect(() => request('hq', 'GET', '/members', {}, { pageSize: '1000' })).toThrow('每页条数');
  });
});
