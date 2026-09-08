import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { content } from './content';
import { find, seedId } from './core';
import { reset } from './state';
function call(
  username: string,
  method: string,
  path: string,
  body = {},
  query = {},
) {
  return content({
    actor: authenticate(login(username, '123456').accessToken),
    method,
    path,
    body,
    query,
  });
}
beforeEach(reset);
describe('content and feedback management', () => {
  it('hides anonymous identities and restricts store feedback', () => {
    const row = call('store1', 'GET', '/reviews').items[0];
    expect(row.memberId).toBeUndefined();
    expect(row.memberName).toBeUndefined();
    find('feedback', seedId(891)).deviceUid = 'private-device';
    expect(
      call('store1', 'GET', '/feedback').items[0].deviceUid,
    ).toBeUndefined();
    expect(call('store1', 'GET', '/reports/feedback').reviewCount).toBe(1);
    expect(() =>
      call('store1', 'GET', '/feedback', {}, { storeId: seedId(2) }),
    ).toThrow('不可访问');
  });
  it('rejects unsafe content links and stores valid HQ settings', () => {
    const data = {
      platform: 'miniapp',
      systemName: '新展示名',
      enabled: true,
      blocks: [
        { blockType: 'link', linkUrl: 'javascript:alert(1)', enabled: true },
      ],
    };
    expect(() => call('hq', 'PUT', '/client-settings', data)).toThrow('HTTP');
    call('hq', 'PUT', '/client-settings', {
      ...data,
      blocks: [{ blockType: 'text', body: '营业介绍', enabled: true }],
    });
    expect(call('hq', 'GET', '/client-settings').systemName).toBe('新展示名');
    expect(() => call('store1', 'PUT', '/client-settings', data)).toThrow(
      '权限',
    );
  });
  it('preserves activity registrations when capacity changes and validates franchise publishing', () => {
    expect(() =>
      call('hq', 'PATCH', `/activities/${seedId(860)}`, { capacity: 0 }),
    ).toThrow('已报名');
    call('hq', 'PATCH', `/activities/${seedId(860)}`, { status: 'cancelled' });
    expect(find('activityRegistrations', seedId(861)).status).toBe('cancelled');
    expect(() =>
      call('hq', 'PUT', '/franchise-brand', {
        name: '品牌',
        introduction: '介绍',
        contactPhone: '02112345678',
        status: 'published',
        models: [],
      }),
    ).toThrow('三种');
  });
});
