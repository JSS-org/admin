import type { Actor, Row } from './core';

import { randomBytes } from 'node:crypto';

import { checkPassword, fail, find, insert, now, rows, str } from './core';

import './state';

export function actorFor(account: Row): Actor {
  if (account.status !== 'active') fail('账号已停用', 401);
  if (account.employeeId && find('employees', account.employeeId).status !== 'active') fail('员工已离职或停用', 401);
  const assignments = account.assignments.filter((a: Row) => find('roles', a.roleId).status === 'active');
  const roles: Row[] = assignments.map((a: Row) => find('roles', a.roleId));
  const storePermissions: Record<string, string[]> = {};
  for (const a of assignments)
    if (a.storeId)
      storePermissions[a.storeId] = [
        ...new Set([...(storePermissions[a.storeId] ?? []), ...find('roles', a.roleId).permissionCodes]),
      ];
  return {
    id: account.id,
    username: account.username,
    realName: account.realName,
    roles: [...new Set(roles.map((r) => r.scopeType))],
    scopeType: roles.some((r) => r.scopeType === 'hq') ? 'hq' : 'store',
    storeIds: [...new Set(assignments.map((a: Row) => a.storeId).filter(Boolean))] as string[],
    codes: [...new Set(roles.flatMap((r) => r.permissionCodes))],
    globalCodes: [...new Set(roles.filter((r) => r.scopeType === 'hq').flatMap((r) => r.permissionCodes))],
    storePermissions,
  };
}
export function login(username: unknown, password: unknown) {
  const name = str(username, '用户名', 64);
  const secret = str(password, '密码', 128);
  const account = rows('accounts').find((a) => a.username === name);
  if (!account || !checkPassword(secret, account.passwordHash)) fail('用户名或密码错误', 401);
  actorFor(account);
  return newSession(account.id);
}
function newSession(accountId: string) {
  return insert('sessions', {
    accountId,
    accessToken: `gym_${randomBytes(32).toString('hex')}`,
    refreshToken: `gym_refresh_${randomBytes(32).toString('hex')}`,
    expiresAt: Date.now() + 3_600_000,
    refreshExpiresAt: Date.now() + 86_400_000,
    revokedAt: null,
  });
}
export function authenticate(token: string): Actor {
  const session = rows('sessions').find((s) => s.accessToken === token && !s.revokedAt && s.expiresAt > Date.now());
  if (!session) fail('登录已过期，请重新登录', 401);
  return actorFor(find('accounts', session.accountId));
}
export function refresh(token: string) {
  const session = rows('sessions').find(
    (s) => s.refreshToken === token && !s.revokedAt && s.refreshExpiresAt > Date.now(),
  );
  if (!session) fail('登录已过期，请重新登录', 401);
  actorFor(find('accounts', session.accountId));
  session.revokedAt = now();
  return newSession(session.accountId);
}
export function revoke(token: string) {
  rows('sessions')
    .filter((s) => s.accessToken === token || s.refreshToken === token)
    .forEach((s) => {
      s.revokedAt = now();
    });
}
export function revokeAccount(accountId: string) {
  rows('sessions')
    .filter((s) => s.accountId === accountId)
    .forEach((s) => {
      s.revokedAt = now();
    });
}
export function userInfo(actor: Actor) {
  return {
    ...actor,
    userId: actor.id,
    avatar: '',
    desc: '开发环境 Mock 账号',
    homePath: '/gym/home',
    authorizedStores: rows('stores')
      .filter((s) => actor.scopeType === 'hq' || actor.storeIds.includes(s.id))
      .map((s) => ({ id: s.id, name: s.name })),
  };
}
