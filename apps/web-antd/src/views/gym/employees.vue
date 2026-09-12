<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import { ref } from 'vue';

import { Button, Form, FormItem, Input, message, Select, Space } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';

import AdminDrawer from './components/admin-drawer.vue';
import ResourcePage from './components/resource-page.vue';
const view = ref();
const current = ref<GymRow>();
const mode = ref('');
const visible = ref(false);
const saving = ref(false);
const roles = ref<GymRow[]>([]);
const links = ref<{ roleId?: string; storeId?: string }[]>([]);
const password = ref('');
const username = ref('');
const selectedStores = ref<string[]>([]);
const stores = ref<GymRow[]>([]);
const fields: Field[] = [
  { key: 'employeeNo', label: '工号', required: true, immutable: true },
  { key: 'name', label: '姓名', required: true },
  { key: 'phone', label: '手机号', required: true },
  { key: 'jobTitle', label: '职位' },
  {
    key: 'hiredOn',
    label: '入职日期',
    type: 'date',
    required: true,
    default: new Date().toISOString().slice(0, 10),
  },
  {
    key: 'storeIds',
    label: '所属门店',
    type: 'multi',
    source: 'stores',
    required: true,
    immutable: true,
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    default: 'active',
    options: [
      { label: '在职', value: 'active' },
      { label: '停用/离职', value: 'inactive' },
    ],
  },
];
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
    const result = await gymApi.list('roles', { pageSize: 100 });
    roles.value = result.items;
    links.value = await gymApi.get(`accounts/${row.accountId}/roles`);
  }
  if (action === 'stores' || action === 'roles') {
    const result = await gymApi.list('stores', { pageSize: 100 });
    stores.value = result.items;
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
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="view"
      title="员工管理"
      endpoint="employees"
      :fields="fields"
      :columns="[
        { title: '工号', dataIndex: 'employeeNo' },
        { title: '姓名', dataIndex: 'name' },
        { title: '手机号', dataIndex: 'phone' },
        { title: '门店', dataIndex: 'storeIds' },
        { title: '账号', dataIndex: 'username' },
        { title: '状态', dataIndex: 'status' },
      ]"
      write-code="employees:write"
      store-filter
      :prepare="prepare"
    >
      <template #actions="{ row, reload }">
        <Button v-if="canGym('employees:write')" type="link" @click="open(row, 'stores')"> 所属门店 </Button>
        <template v-if="canGym('accounts:write')">
          <Button v-if="!row.accountId" type="link" @click="open(row, 'account')"> 创建账号 </Button>
          <template v-else>
            <Button type="link" @click="open(row, 'roles')">授权</Button
            ><Button type="link" @click="open(row, 'password')">密码</Button
            ><Button
              type="link"
              @click="
                async () => {
                  await gymApi.patch(`accounts/${row.accountId}`, {
                    status: row.accountStatus === 'active' ? 'inactive' : 'active',
                  });
                  await reload();
                }
              "
            >
              {{ row.accountStatus === 'active' ? '停用账号' : '启用账号' }}
            </Button>
          </template>
        </template>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" :title="titles[mode]" :confirm-loading="saving" @ok="save">
      <template v-if="mode === 'roles'">
        <Space v-for="(link, index) in links" :key="index" wrap class="mb-3">
          <Select
            v-model:value="link.roleId"
            placeholder="角色"
            :options="roles.map((r) => ({ label: r.name, value: r.id }))"
            style="min-width: 150px"
          />
          <Select
            v-if="roles.find((r) => r.id === link.roleId)?.scopeType === 'store'"
            v-model:value="link.storeId"
            placeholder="授权门店"
            :options="
              stores.filter((s) => current?.storeIds.includes(s.id)).map((s) => ({ label: s.name, value: s.id }))
            "
            style="min-width: 150px"
          />
          <Button danger @click="links.splice(index, 1)">移除</Button> </Space
        ><Button @click="links.push({})">增加授权</Button>
      </template>
      <Select
        v-else-if="mode === 'stores'"
        v-model:value="selectedStores"
        mode="multiple"
        :options="stores.map((s) => ({ label: s.name, value: s.id }))"
        style="width: 100%"
      />
      <Form v-else layout="vertical">
        <FormItem v-if="mode === 'account'" label="用户名"> <Input v-model:value="username" /> </FormItem
        ><FormItem label="密码（至少6位）">
          <Input.Password v-model:value="password" />
        </FormItem>
      </Form>
    </AdminDrawer>
  </div>
</template>
