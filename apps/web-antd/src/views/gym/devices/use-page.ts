import type { Ref } from 'vue';

import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, watch } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

export function usePage(page: Readonly<Ref<null | ResourcePageHandle>>) {
  function prepare(values: Record<string, any>, row?: GymRow) {
    const result = { ...values };
    if (!row && true) Reflect.deleteProperty(result, 'status');
    for (const key of ['startsAt', 'endsAt']) if (result[key]) result[key] = new Date(result[key]).toISOString();
    return result;
  }

  const visible = ref(false);
  const mode = ref('');
  const current = ref<GymRow>();
  const busy = ref(false);
  const compartments = ref<
    {
      number: string;
      status: string;
    }[]
  >([]);
  const commands = ref<GymRow[]>([]);
  const reason = ref('');
  const compartmentId = ref<string>();
  const result = ref<GymRow>();
  let requestKey = '';
  watch([reason, compartmentId], () => {
    requestKey = crypto.randomUUID();
    result.value = undefined;
  });
  async function open(row: GymRow, action: string) {
    const detail = await gymApi.get<GymRow>(`devices/${row.id}`);
    current.value = detail;
    mode.value = action;
    if (action === 'compartments')
      compartments.value = detail.compartments.map((c: GymRow) => ({
        number: c.number,
        status: c.status === 'inactive' ? 'inactive' : 'available',
      }));
    if (action === 'command') {
      reason.value = '';
      compartmentId.value = undefined;
      result.value = undefined;
      requestKey = crypto.randomUUID();
      const data = await gymApi.list(`devices/${row.id}/commands`);
      commands.value = data.items;
    }
    visible.value = true;
  }
  async function save() {
    if (!current.value) return;
    busy.value = true;
    try {
      if (mode.value === 'compartments') {
        await gymApi.put(`devices/${current.value.id}/compartments`, {
          compartments: compartments.value,
        });
        visible.value = false;
        message.success('柜格已保存');
      }
      if (mode.value === 'command') {
        result.value = await gymApi.post(
          `devices/${current.value.id}/commands`,
          {
            command: current.value.type === 'locker' ? 'open_locker' : 'open_door',
            ...(current.value.type === 'locker' ? { compartmentId: compartmentId.value } : {}),
            reason: reason.value,
          },
          requestKey,
        );
        const data = await gymApi.list(`devices/${current.value.id}/commands`);
        commands.value = data.items;
      }
      await page.value?.load();
    } finally {
      busy.value = false;
    }
  }
  return { prepare, visible, mode, current, busy, compartments, commands, reason, compartmentId, result, open, save };
}
