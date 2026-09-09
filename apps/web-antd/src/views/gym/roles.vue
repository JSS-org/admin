<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import { onMounted, ref } from 'vue';

import { Button, CheckboxGroup, message, Modal } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import ResourcePage from './components/resource-page.vue';
const permissions = ref<GymRow[]>([]);
const current = ref<GymRow>();
const codes = ref<string[]>([]);
const visible = ref(false);
const view = ref();
const fields: Field[] = [
  { key: 'code', label: '角色编码', required: true, immutable: true },
  { key: 'name', label: '名称', required: true },
  {
    key: 'scopeType',
    label: '范围',
    type: 'select',
    required: true,
    immutable: true,
    default: 'store',
    options: [
      { label: '总部', value: 'hq' },
      { label: '门店', value: 'store' },
    ],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    default: 'active',
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'inactive' },
    ],
  },
];
function prepare(values: Record<string, any>, row?: GymRow) {
  if (row) return values;
  const { status: _status, ...data } = values;
  return { ...data, permissionCodes: [] };
}
onMounted(async () => {
  permissions.value = await gymApi.get<GymRow[]>('permissions');
});
async function open(row: GymRow) {
  current.value = row;
  codes.value = [...row.permissionCodes];
  visible.value = true;
}
async function save() {
  if (!current.value) return;
  await gymApi.put(`roles/${current.value.id}/permissions`, {
    permissionCodes: codes.value,
  });
  message.success('权限已更新');
  visible.value = false;
  await view.value?.load();
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="view"
      title="角色权限"
      endpoint="roles"
      :fields="fields"
      :columns="[
        { title: '编码', dataIndex: 'code' },
        { title: '名称', dataIndex: 'name' },
        { title: '范围', dataIndex: 'scopeType' },
        { title: '状态', dataIndex: 'status' },
      ]"
      write-code="roles:write"
      :prepare="prepare"
    >
      <template #actions="{ row }">
        <Button type="link" @click="open(row)">配置权限</Button>
      </template>
    </ResourcePage>
    <Modal
      wrap-class-name="gym-dialog"
      v-model:open="visible"
      title="权限配置"
      :width="760"
      @ok="save"
    >
      <CheckboxGroup
        v-model:value="codes"
        :options="
          permissions
            .filter((p) => p.scopes.includes(current?.scopeType))
            .map((p) => ({ label: p.name, value: p.code }))
        "
      />
    </Modal>
  </div>
</template>
