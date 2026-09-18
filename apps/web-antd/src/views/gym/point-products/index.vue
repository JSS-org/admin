<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { config, initial, prepare } from './data';

function rowStatusAction(row: GymRow) {
  return row.status === 'active' ? 'disable' : 'enable';
}

async function handleToggleStatus(row: GymRow, reload: () => Promise<void>) {
  await gymApi.patch(`point-products/${row.id}`, {
    status: row.status === 'active' ? 'inactive' : 'active',
  });
  await reload();
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="config.title"
      endpoint="point-products"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="true"
      :prepare="prepare"
      :initial="initial"
      :idempotent="false"
      :store-filter="false"
      time-filter
    >
      <template v-if="canGym('points:manage')" #actions="{ row, reload }">
        <TableAction
          :action="rowStatusAction(row)"
          v-if="canGym('points:manage')"
          @click="handleToggleStatus(row, reload)"
        />
      </template>
    </ResourcePage>
  </div>
</template>
