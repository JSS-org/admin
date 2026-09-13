import type { Ref } from 'vue';

import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

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
  async function openBooking() {
    sessions.value = await gymApi.listAll('course-sessions', {
      status: 'scheduled',
      from: new Date().toISOString(),
    });
    sessionId.value = undefined;
    memberId.value = undefined;
    rightId.value = undefined;
    rights.value = [];
    members.value = [];
    note.value = '';
    visible.value = true;
  }
  async function changeSession() {
    memberId.value = undefined;
    rightId.value = undefined;
    rights.value = [];
    const session = sessions.value.find((s) => s.id === sessionId.value);
    members.value = session ? await gymApi.listAll('members', { storeId: session.storeId }) : [];
  }
  async function changeMember() {
    rights.value = [];
    rightId.value = undefined;
    if (!memberId.value) return;
    const session = sessions.value.find((s) => s.id === sessionId.value);
    const [cards, packs] = await Promise.all([
      gymApi.listAll(`members/${memberId.value}/cards`),
      gymApi.listAll(`members/${memberId.value}/course-packs`),
    ]);
    rights.value = [
      ...cards
        .filter((c) => c.status === 'active' && (c.accessScope === 'all' || c.storeIds.includes(session?.storeId)))
        .map((c) => ({
          label: `${c.name} ${c.cardNo}`,
          value: c.id,
          type: 'memberCardId',
        })),
      ...packs
        .filter((p) => p.status === 'active' && p.courseProductId === session?.courseProductId)
        .map((p) => ({
          label: `${p.name} 可约${p.remainingSessions - p.reservedSessions}次`,
          value: p.id,
          type: 'memberCoursePackId',
        })),
    ];
  }
  async function saveBooking() {
    const right = rights.value.find((r) => r.value === rightId.value);
    if (!sessionId.value || !memberId.value || !right) {
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
    await gymApi.patch(`bookings/${row.id}`, { status: 'cancelled' });
    message.success('已取消');
    await page.value?.load();
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
    openBooking,
    changeSession,
    changeMember,
    saveBooking,
    cancel,
  };
}
