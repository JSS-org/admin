<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ApprovalCreate from '#/views/gym/approvals/create.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { columns, fields } from './data';

function isEditable(row: GymRow) {
  return row.status === 'draft';
}

function rowPublishAction(row: GymRow) {
  return row.status === 'published' ? 'disable' : 'publish';
}

async function handleCreateVersion(row: GymRow, reload: () => Promise<void>) {
  await gymApi.post(`card-templates/${row.id}/versions`, {});
  message.success('已复制为新版本草稿，可编辑');
  await reload();
}

async function handleTogglePublish(row: GymRow, reload: () => Promise<void>) {
  await gymApi.patch(`card-templates/${row.id}`, {
    status: row.status === 'published' ? 'inactive' : 'published',
  });
  await reload();
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="会员卡种"
      endpoint="card-templates"
      :fields="fields"
      :columns="columns"
      write-code="cards:write"
      :editable="isEditable"
    >
      <template #actions="{ row, reload }">
        <ApprovalCreate
          v-if="row.status === 'published'"
          business-type="card_opening"
          source-type="card-templates"
          :record="row"
          label="申请开卡"
        />
        <template v-if="canGym('cards:write')">
          <TableAction action="version" @click="handleCreateVersion(row, reload)" />
          <TableAction :action="rowPublishAction(row)" @click="handleTogglePublish(row, reload)" />
        </template>
      </template>
    </ResourcePage>
  </div>
</template>
