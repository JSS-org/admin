<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { config, editable, initial, prepare } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

async function newVersion(row: GymRow) {
  const next = await gymApi.post(`point-rules/${row.id}/versions`, {});
  await page.value?.load();
  await page.value?.open(next);
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="config.title"
      endpoint="point-rules"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="true"
      :editable="editable"
      :prepare="prepare"
      :initial="initial"
      :idempotent="false"
      :store-filter="false"
      time-filter
    >
      <template v-if="canGym('points:manage')" #actions="{ row, reload }">
        <TableAction action="version" v-if="canGym('points:manage')" @click="newVersion(row)" />
        <TableAction
          :action="row.status === 'active' ? 'disable' : 'enable'"
          v-if="canGym('points:manage')"
          @click="
            async () => {
              await gymApi.patch(`point-rules/${row.id}`, {
                status: row.status === 'active' ? 'inactive' : 'active',
              });
              await reload();
            }
          "
        />
      </template>
    </ResourcePage>
  </div>
</template>
