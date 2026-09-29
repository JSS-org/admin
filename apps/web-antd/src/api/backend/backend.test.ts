import { expect, it } from 'vitest';

import { fromYudaoPage, toYudaoPageParams } from './gym-adapter';
import { deriveGymRoles, toGymCode, toGymPermissionCodes, toSystemCode, toYudaoCode } from './permissions';

it('maps vben page params to yudao pageNo/pageSize', () => {
  expect(toYudaoPageParams({ page: 2, pageSize: 50, storeId: 's1' })).toEqual({
    pageNo: 2,
    pageSize: 50,
    storeId: 's1',
  });
  expect(toYudaoPageParams()).toEqual({});
});

it('normalizes yudao list responses into the shared GymPage shape', () => {
  expect(fromYudaoPage({ list: [{ id: '1' }], total: 1 }, 3, 20)).toEqual({
    items: [{ id: '1' }],
    total: 1,
    page: 3,
    pageSize: 20,
  });
  expect(fromYudaoPage(undefined, 1, 10)).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
});

it('translates yudao system permission codes into business permission codes', () => {
  expect(toGymCode('system:user:query')).toBe('employees:read');
  expect(toGymCode('system:role:update')).toBe('roles:write');
  // gym module codes: strip the `gym:` prefix
  expect(toGymCode('gym:members:write')).toBe('members:write');
  // custom gym permissions without a prefix are passed through untouched
  expect(toGymCode('members:write')).toBe('members:write');
  expect(toGymPermissionCodes(['system:user:query', 'gym:members:read', 'members:read'])).toEqual([
    'employees:read',
    'members:read',
  ]);
});

it('maps business permission codes back to backend codes', () => {
  expect(toYudaoCode('roles:write')).toBe('gym:roles:write');
  expect(toYudaoCode('members:write')).toBe('gym:members:write');
  expect(toSystemCode('roles:write')).toBe('system:role:update');
});

it('derives hq/store scope from yudao roles and permissions', () => {
  expect(deriveGymRoles(['super_admin'], [])).toEqual(['hq']);
  expect(deriveGymRoles([], ['system:role:update'])).toEqual(['hq']);
  expect(deriveGymRoles(['store_manager'], ['members:read'])).toEqual(['store']);
});
