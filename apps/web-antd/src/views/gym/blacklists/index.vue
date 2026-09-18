<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { code, columns, fields, title } from './data';

function prepare(values: Record<string, any>) {
  const result = { ...values };
  for (const key of ['startsAt', 'endsAt']) if (result[key]) result[key] = new Date(result[key]).toISOString();
  return result;
}

function initial(row: GymRow) {
  const result = { ...row };
  for (const key of ['startsAt', 'endsAt'])
    if (result[key]) {
      const time = new Date(result[key]);
      result[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    }
  return result;
}

function isEditable(row: GymRow) {
  return !row.revokedAt;
}

async function revoke(row: GymRow, reload: () => Promise<void>) {
  await gymApi.patch(`blacklists/${row.id}`, { revoked: true });
  await reload();
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="title"
      endpoint="blacklists"
      :fields="fields"
      :columns="columns"
      :write-code="code"
      :store-filter="false"
      :prepare="prepare"
      :initial="initial"
      :editable="isEditable"
    >
      <template #actions="{ row, reload }">
        <TableAction action="revoke" v-if="!row.revokedAt && canGym(code)" @click="revoke(row, reload)" />
      </template>
    </ResourcePage>
  </div>
</template>
