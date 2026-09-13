import type { Ref } from 'vue';

import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

export function usePage(view: Readonly<Ref<null | ResourcePageHandle>>) {
  const current = ref<GymRow>();
  const mode = ref('');
  const visible = ref(false);
  const saving = ref(false);
  const roles = ref<GymRow[]>([]);
  const links = ref<
    {
      roleId?: string;
      storeId?: string;
    }[]
  >([]);
  const password = ref('');
  const username = ref('');
  const selectedStores = ref<string[]>([]);
  const stores = ref<GymRow[]>([]);
  function prepare(values: Record<string, any>, row?: GymRow) {
    const { storeIds, ...data } = values;
    if (!row)
      data.storeAssignments = storeIds.map((storeId: string, i: number) => ({
        storeId,
        isPrimary: i === 0,
        isManager: false,
        joinedOn: data.hiredOn,
      }));
    return data;
  }
  async function open(row: GymRow, action: string) {
    current.value = row;
    mode.value = action;
    password.value = '';
    username.value = '';
    selectedStores.value = [...row.storeIds];
    if (action === 'roles') {
      roles.value = await gymApi.listAll('roles');
      links.value = await gymApi.get(`accounts/${row.accountId}/roles`);
    }
    if (action === 'stores' || action === 'roles') {
      stores.value = await gymApi.listAll('stores');
    }
    visible.value = true;
  }
  async function save() {
    const row = current.value;
    if (!row) return;
    saving.value = true;
    try {
      if (mode.value === 'roles')
        await gymApi.put(`accounts/${row.accountId}/roles`, {
          assignments: links.value.map((l) =>
            roles.value.find((r) => r.id === l.roleId)?.scopeType === 'hq' ? { roleId: l.roleId } : l,
          ),
        });
      else if (mode.value === 'stores')
        await gymApi.put(`employees/${row.id}/stores`, {
          storeAssignments: selectedStores.value.map((storeId, i) => ({
            storeId,
            isPrimary: i === 0,
            isManager: false,
            joinedOn: row.hiredOn,
          })),
        });
      else if (mode.value === 'account')
        await gymApi.post(`employees/${row.id}/account`, {
          username: username.value,
          password: password.value,
        });
      else
        await gymApi.put(`accounts/${row.accountId}/password`, {
          password: password.value,
        });
      message.success('已保存');
      visible.value = false;
      await view.value?.load();
    } finally {
      saving.value = false;
    }
  }
  const titles: Record<string, string> = {
    roles: '角色与门店授权',
    stores: '调整所属门店',
    account: '创建网页账号',
    password: '重置密码',
  };
  return {
    current,
    mode,
    visible,
    saving,
    roles,
    links,
    password,
    username,
    selectedStores,
    stores,
    prepare,
    open,
    save,
    titles,
  };
}
