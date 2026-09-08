import type { Request } from './core';

import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { find, insert, seedId } from './core';
import { reset } from './state';
import { training } from './training';

function request(
  method: string,
  path: string,
  body = {},
  username = 'store1',
  query = {},
) {
  const actor = authenticate(login(username, '123456').accessToken);
  return training({ actor, method, path, body, query } as Request);
}
const booking = {
  sessionId: seedId(341),
  memberId: seedId(101),
  memberCardId: seedId(201),
};
beforeEach(reset);
describe('training management', () => {
  it('enforces capacity and duplicate booking, then releases cancelled places', () => {
    find('courseSessions', seedId(341)).capacity = 1;
    const result = request('POST', '/bookings', booking);
    expect(() => request('POST', '/bookings', booking)).toThrow('已预约');
    const next = {
      ...booking,
      memberId: seedId(102),
      memberCardId: seedId(202),
    };
    expect(() => request('POST', '/bookings', next)).toThrow('名额已满');
    request('PATCH', `/bookings/${result.id}`, { status: 'cancelled' });
    expect(request('POST', '/bookings', next).status).toBe('confirmed');
    expect(() =>
      request('PATCH', `/bookings/${seedId(361)}`, { status: 'cancelled' }),
    ).toThrow('待上课');
  });
  it('reserves course rights and cancellation releases exactly once', () => {
    const pack = insert('memberCoursePacks', {
      memberId: seedId(101),
      storeId: seedId(1),
      courseProductId: seedId(311),
      status: 'active',
      totalSessions: 1,
      remainingSessions: 1,
      reservedSessions: 0,
      startsAt: new Date().toISOString(),
    });
    const result = request('POST', '/bookings', {
      sessionId: seedId(341),
      memberId: seedId(101),
      memberCoursePackId: pack.id,
    });
    expect(pack.reservedSessions).toBe(1);
    expect(() =>
      request('PATCH', `/course-sessions/${seedId(341)}`, {
        startsAt: new Date(Date.now() + 4 * 86_400_000).toISOString(),
      }),
    ).toThrow('已有预约');
    request('PATCH', `/course-sessions/${seedId(341)}`, {
      status: 'cancelled',
    });
    expect(pack.reservedSessions).toBe(0);
    expect(() =>
      request('PATCH', `/bookings/${result.id}`, { status: 'cancelled' }),
    ).toThrow('待上课');
    expect(pack.reservedSessions).toBe(0);
  });
  it('rejects conflicting scheduling and foreign store references', () => {
    const session = find('courseSessions', seedId(341));
    const {
      storeId,
      courseProductId,
      coachId,
      startsAt,
      endsAt,
      capacity,
      room,
    } = session;
    expect(() =>
      request('POST', '/course-sessions', {
        storeId,
        courseProductId,
        coachId,
        startsAt,
        endsAt,
        capacity,
        room,
      }),
    ).toThrow('已有排课');
    expect(() => request('GET', `/course-sessions/${seedId(342)}`)).toThrow(
      '不可访问',
    );
    expect(() =>
      request('POST', '/bookings', {
        ...booking,
        memberId: seedId(106),
        memberCardId: seedId(206),
      }),
    ).toThrow('不属于');
    expect(request('GET', '/checkins').total).toBe(1);
    expect(request('GET', '/checkins/summary').members).toBe(1);
  });
  it('validates measurement values, immutable ownership and report ownership', () => {
    const body = {
      memberId: seedId(101),
      storeId: seedId(1),
      measuredAt: new Date().toISOString(),
      weightKg: '70.500',
    };
    expect(() =>
      request('POST', '/body-measurements', { ...body, bodyFatPercent: '101' }),
    ).toThrow('超出范围');
    const result = request('POST', '/body-measurements', body);
    request('PATCH', `/body-measurements/${result.id}`, { note: '已复查' });
    expect(request('GET', `/body-measurements/${result.id}`).note).toBe(
      '已复查',
    );
    expect(() =>
      request('PATCH', `/body-measurements/${result.id}`, {
        memberId: seedId(102),
      }),
    ).toThrow('不允许');
    const file = insert('files', {
      storeId: seedId(2),
      category: 'body_report',
    });
    expect(() =>
      request('PATCH', `/body-measurements/${result.id}`, {
        reportFileId: file.id,
      }),
    ).toThrow('不可访问');
  });
  it('does not expose future-client writes or fabricate channel codes', () => {
    expect(() => request('POST', '/lesson-records', {})).toThrow('权限');
    expect(() =>
      request('POST', '/qr-codes', {
        storeId: seedId(1),
        platform: 'miniapp',
        sceneType: 'store',
      }),
    ).toThrow('尚未配置');
    expect(() =>
      request('PATCH', `/course-products/${seedId(321)}`, {
        name: '改变私教产品',
      }),
    ).toThrow('仅可查看');
  });
});
