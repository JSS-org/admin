<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { onMounted, ref } from 'vue';

import { Button, CheckboxGroup, message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields } from './data';

const permissions = ref<GymRow[]>([]);

const current = ref<GymRow>();

const codes = ref<string[]>([]);

const visible = ref(false);

const view = ref();

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
      :columns="columns"
      write-code="roles:write"
      :prepare="prepare"
    >
      <template #actions="{ row }">
        <Button type="link" @click="open(row)">配置权限</Button>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" title="权限配置" :width="760" @ok="save">
      <CheckboxGroup
        v-model:value="codes"
        :options="
          permissions
            .filter((p) => p.scopes.includes(current?.scopeType))
            .map((p) => ({ label: p.name, value: p.code }))
        "
      />
    </AdminDrawer>
  </div>
</template>
