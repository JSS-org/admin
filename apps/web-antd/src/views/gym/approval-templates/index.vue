<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { columns, fields, initial, isTemplate, prepare, title, writeCode } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

async function newVersion(row: GymRow) {
  const result = await gymApi.post(`approval-templates/${row.id}/versions`, {});
  message.success('已创建新草稿版本');
  await page.value?.load();
  await page.value?.open(result);
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="title"
      endpoint="approval-templates"
      :fields="fields"
      :columns="columns"
      :write-code="writeCode"
      :create="true"
      :edit="isTemplate"
      :editable="(row) => row.status === 'draft'"
      :prepare="prepare"
      :initial="initial"
      :store-filter="false"
      :time-filter="false"
    >
      <template #actions="{ row, reload }">
        <template v-if="canGym(writeCode)">
          <TableAction action="version" @click="newVersion(row)" />
          <TableAction
            :action="row.status === 'published' ? 'disable' : 'publish'"
            @click="
              async () => {
                await gymApi.patch(`approval-templates/${row.id}`, {
                  status: row.status === 'published' ? 'inactive' : 'published',
                });
                await reload();
              }
            "
          />
        </template>
      </template>
    </ResourcePage>
  </div>
</template>
