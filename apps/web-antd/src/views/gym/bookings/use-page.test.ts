import type { GymRow } from '../../../api/gym';

import { effectScope, ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePage } from './use-page';

const api = vi.hoisted(() => ({ listAll: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('../../../api/gym', () => ({ gymApi: api }));
vi.mock('ant-design-vue', () => ({ message: { success: vi.fn(), error: vi.fn() } }));
const scopes: ReturnType<typeof effectScope>[] = [];
function setup() {
  const scope = effectScope();
  scopes.push(scope);
  const page = scope.run(() => usePage(ref(null)));
  if (!page) throw new Error('Test scope did not initialize');
  return page;
}
function deferred() {
  let resolve!: (rows: GymRow[]) => void;
  const promise = new Promise<GymRow[]>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const session = {
  id: 's1',
  storeId: 'store1',
  courseProductId: 'course1',
  startsAt: '2030-01-01T10:00:00Z',
  endsAt: '2030-01-01T11:00:00Z',
};
beforeEach(() => vi.resetAllMocks());
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));

describe('booking workflow', () => {
  it('clears previous members immediately and ignores stale store results', async () => {
    const old = deferred();
    api.listAll.mockReturnValueOnce(old.promise).mockResolvedValueOnce([{ id: 'new-member' }]);
    const page = setup();
    page.sessions.value = [session, { ...session, id: 's2', storeId: 'store2' }];
    page.members.value = [{ id: 'previous-member' }];
    page.sessionId.value = 's1';
    const first = page.changeSession();
    expect(page.members.value).toEqual([]);
    page.sessionId.value = 's2';
    await page.changeSession();
    old.resolve([{ id: 'old-member' }]);
    await first;
    expect(page.members.value).toEqual([{ id: 'new-member' }]);
    expect(page.membersLoading.value).toBe(false);
  });

  it('does not restore old member rights after the course changes', async () => {
    const old = deferred();
    api.listAll.mockReturnValueOnce(old.promise).mockResolvedValue([]);
    const page = setup();
    page.sessions.value = [session];
    page.sessionId.value = 's1';
    page.memberId.value = 'm1';
    const first = page.changeMember();
    await page.changeSession();
    old.resolve([{ id: 'card', status: 'active', accessScope: 'all' }]);
    await first;
    expect(page.rights.value).toEqual([]);
    expect(page.rightId.value).toBeUndefined();
    expect(page.canSubmit.value).toBe(false);
  });

  it('filters unusable rights and selects the only eligible option', async () => {
    const card = { id: 'valid', status: 'active', accessScope: 'all' };
    const pack = {
      id: 'pack',
      status: 'active',
      storeId: 'store1',
      courseProductId: 'course1',
      remainingSessions: 2,
      reservedSessions: 2,
    };
    api.listAll
      .mockResolvedValueOnce([
        card,
        { ...card, id: 'expired', expiresAt: session.endsAt },
        { ...card, id: 'future', startsAt: session.endsAt },
        { ...card, id: 'empty', remainingUses: 0 },
        { ...card, id: 'other-store', accessScope: 'selected', storeIds: ['store2'] },
      ])
      .mockResolvedValueOnce([pack, { ...pack, id: 'wrong-store', storeId: 'store2', remainingSessions: 10 }]);
    const page = setup();
    page.sessions.value = [session];
    page.sessionId.value = 's1';
    page.memberId.value = 'm1';
    await page.changeMember();
    expect(page.rights.value.map((right) => right.value)).toEqual(['valid']);
    expect(page.rightId.value).toBe('valid');
    expect(page.canSubmit.value).toBe(true);
    let finish!: () => void;
    api.post.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const save = page.saveBooking();
    await page.saveBooking();
    expect(api.post).toHaveBeenCalledOnce();
    finish();
    await save;
  });

  it('reports failed option loading and ignores responses after closing', async () => {
    api.listAll.mockRejectedValueOnce(new Error('offline'));
    const page = setup();
    await page.openBooking();
    expect(page.optionsError.value).toBe(true);
    expect(page.sessionsLoading.value).toBe(false);
    const pending = deferred();
    api.listAll.mockReturnValueOnce(pending.promise);
    const opening = page.openBooking();
    page.visible.value = false;
    pending.resolve([session]);
    await opening;
    expect(page.sessions.value).toEqual([]);
    expect(page.visible.value).toBe(false);
  });
});
