import type { Ref } from 'vue';

import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { computed, onScopeDispose, ref, watch } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '../../../api/gym';

export function usePage(page: Readonly<Ref<null | ResourcePageHandle>>) {
  const visible = ref(false);
  const members = ref<GymRow[]>([]);
  const sessions = ref<GymRow[]>([]);
  const rights = ref<
    {
      label: string;
      value: string;
      type: string;
    }[]
  >([]);
  const sessionId = ref<string>();
  const memberId = ref<string>();
  const rightId = ref<string>();
  const note = ref('');
  const saving = ref(false);
  const sessionsLoading = ref(false);
  const membersLoading = ref(false);
  const rightsLoading = ref(false);
  const optionsError = ref(false);
  const cancellingIds = ref<string[]>([]);
  let sessionRequest = 0;
  let memberRequest = 0;
  let rightRequest = 0;
  const canSubmit = computed(
    () =>
      !!sessionId.value &&
      !!memberId.value &&
      rights.value.some((right) => right.value === rightId.value) &&
      !sessionsLoading.value &&
      !membersLoading.value &&
      !rightsLoading.value &&
      !optionsError.value,
  );

  function invalidateRequests() {
    sessionRequest++;
    memberRequest++;
    rightRequest++;
    sessionsLoading.value = false;
    membersLoading.value = false;
    rightsLoading.value = false;
  }
  watch(
    visible,
    (open) => {
      if (!open) invalidateRequests();
    },
    { flush: 'sync' },
  );
  onScopeDispose(invalidateRequests);

  async function openBooking() {
    if (saving.value) return;
    invalidateRequests();
    const request = ++sessionRequest;
    sessions.value = [];
    sessionId.value = undefined;
    memberId.value = undefined;
    rightId.value = undefined;
    rights.value = [];
    members.value = [];
    note.value = '';
    visible.value = true;
    optionsError.value = false;
    sessionsLoading.value = true;
    try {
      const rows = await gymApi.listAll('course-sessions', {
        status: 'scheduled',
        from: new Date().toISOString(),
      });
      if (request === sessionRequest)
        sessions.value = rows.toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    } catch {
      if (request === sessionRequest) optionsError.value = true;
    } finally {
      if (request === sessionRequest) sessionsLoading.value = false;
    }
  }
  async function changeSession() {
    const request = ++memberRequest;
    rightRequest++;
    rightsLoading.value = false;
    optionsError.value = false;
    memberId.value = undefined;
    rightId.value = undefined;
    rights.value = [];
    members.value = [];
    const session = sessions.value.find((s) => s.id === sessionId.value);
    membersLoading.value = !!session;
    if (!session) return;
    try {
      const rows = await gymApi.listAll('members', { storeId: session.storeId });
      if (request === memberRequest) members.value = rows;
    } catch {
      if (request === memberRequest) optionsError.value = true;
    } finally {
      if (request === memberRequest) membersLoading.value = false;
    }
  }
  async function changeMember() {
    const request = ++rightRequest;
    optionsError.value = false;
    rights.value = [];
    rightId.value = undefined;
    rightsLoading.value = false;
    if (!memberId.value || membersLoading.value) return;
    const session = sessions.value.find((s) => s.id === sessionId.value);
    if (!session) return;
    rightsLoading.value = true;
    try {
      const [cards, packs] = await Promise.all([
        gymApi.listAll(`members/${memberId.value}/cards`),
        gymApi.listAll(`members/${memberId.value}/course-packs`),
      ]);
      if (request !== rightRequest) return;
      const validDuringSession = (row: GymRow) =>
        row.status === 'active' &&
        (!row.startsAt || Date.parse(row.startsAt) <= Date.parse(session.startsAt)) &&
        (!row.expiresAt || Date.parse(row.expiresAt) > Date.parse(session.endsAt));
      rights.value = [
        ...cards
          .filter(
            (c) =>
              validDuringSession(c) &&
              (c.accessScope === 'all' || c.storeIds?.includes(session.storeId)) &&
              (c.remainingUses === null || c.remainingUses === undefined || c.remainingUses > 0),
          )
          .map((c) => ({
            label: `${c.name} ${c.cardNo}`,
            value: c.id,
            type: 'memberCardId',
          })),
        ...packs
          .filter(
            (p) =>
              validDuringSession(p) &&
              p.storeId === session.storeId &&
              p.courseProductId === session.courseProductId &&
              p.remainingSessions - p.reservedSessions > 0,
          )
          .map((p) => ({
            label: `${p.name} 可约${p.remainingSessions - p.reservedSessions}次`,
            value: p.id,
            type: 'memberCoursePackId',
          })),
      ];
      if (rights.value.length === 1) rightId.value = rights.value[0]?.value;
    } catch {
      if (request === rightRequest) optionsError.value = true;
    } finally {
      if (request === rightRequest) rightsLoading.value = false;
    }
  }
  async function saveBooking() {
    if (saving.value) return;
    const right = rights.value.find((r) => r.value === rightId.value);
    if (!canSubmit.value || !right) {
      message.error('请选择课程、会员和预约权益');
      return;
    }
    saving.value = true;
    try {
      await gymApi.post('bookings', {
        sessionId: sessionId.value,
        memberId: memberId.value,
        [right.type]: right.value,
        note: note.value,
      });
      message.success('预约成功');
      visible.value = false;
      await page.value?.load();
    } finally {
      saving.value = false;
    }
  }
  async function cancel(row: GymRow) {
    if (cancellingIds.value.includes(row.id)) return;
    cancellingIds.value.push(row.id);
    try {
      await gymApi.patch(`bookings/${row.id}`, { status: 'cancelled' });
      message.success('已取消');
      await page.value?.load();
    } finally {
      cancellingIds.value = cancellingIds.value.filter((id) => id !== row.id);
    }
  }
  return {
    visible,
    members,
    sessions,
    rights,
    sessionId,
    memberId,
    rightId,
    note,
    saving,
    sessionsLoading,
    membersLoading,
    rightsLoading,
    optionsError,
    canSubmit,
    cancellingIds,
    openBooking,
    changeSession,
    changeMember,
    saveBooking,
    cancel,
  };
}
