import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, rows, seedId } from './core';
import { devices } from './devices';
import { reset } from './state';
function call(
  username: string,
  method: string,
  path: string,
  body = {},
  key?: string,
) {
  return devices({
    actor: authenticate(login(username, '123456').accessToken),
    method,
    path,
    body,
    query: {},
    key,
  });
}
beforeEach(reset);
describe('devices and blacklist', () => {
  it('limits remote commands to authorized devices and their compartments', () => {
    expect(call('store1', 'GET', '/devices').total).toBe(2);
    expect(() =>
      call(
        'store1',
        'POST',
        `/devices/${seedId(502)}/commands`,
        { command: 'open_door', reason: '检查' },
        'a',
      ),
    ).toThrow('不可访问');
    expect(() =>
      call(
        'store1',
        'POST',
        `/devices/${seedId(511)}/commands`,
        { command: 'open_locker', compartmentId: seedId(541), reason: '检查' },
        'a',
      ),
    ).toThrow('不属于');
    expect(() =>
      call('store1', 'PATCH', `/devices/${seedId(501)}`, { name: '改名' }),
    ).toThrow('权限');
  });
  it('deduplicates command retries and distinguishes simulation from real failures', () => {
    const path = `/devices/${seedId(501)}/commands`;
    const first = call(
      'store1',
      'POST',
      path,
      { command: 'open_door', reason: '联调' },
      'same',
    );
    expect(first.simulated).toBe(true);
    expect(first.status).toBe('succeeded');
    expect(
      call(
        'store1',
        'POST',
        path,
        { command: 'open_door', reason: '联调' },
        'same',
      ).id,
    ).toBe(first.id);
    expect(rows('deviceCommands')).toHaveLength(1);
    expect(() =>
      call(
        'store1',
        'POST',
        path,
        { command: 'open_door', reason: '不同' },
        'same',
      ),
    ).toThrow('幂等键');
    find('devices', seedId(501)).provider = 'unconfigured';
    expect(
      call(
        'store1',
        'POST',
        path,
        { command: 'open_door', reason: '联调' },
        'new',
      ).status,
    ).toBe('failed');
  });
  it('preserves occupied and referenced compartments', () => {
    find('compartments', seedId(531)).currentMemberId = seedId(101);
    expect(() =>
      call('hq', 'PUT', `/devices/${seedId(511)}/compartments`, {
        compartments: [],
      }),
    ).toThrow('占用');
    expect(
      rows('compartments').filter((c) => c.deviceId === seedId(511)),
    ).toHaveLength(3);
  });
  it('validates blacklist restrictions and keeps a revocation record', () => {
    const data = {
      memberId: seedId(101),
      blockEntry: true,
      blockPurchase: false,
      reason: '测试限制',
      startsAt: new Date().toISOString(),
    };
    expect(() =>
      call('hq', 'POST', '/blacklists', { ...data, blockEntry: false }),
    ).toThrow('至少');
    const record = call('hq', 'POST', '/blacklists', data);
    expect(() => call('hq', 'POST', '/blacklists', data)).toThrow('已有');
    expect(
      call('hq', 'PATCH', `/blacklists/${record.id}`, { revoked: true }).status,
    ).toBe('revoked');
    expect(rows('operationLogs')).toHaveLength(2);
    expect(() => call('store1', 'GET', '/blacklists')).toThrow('权限');
  });
});
