<script setup lang="ts">
import { message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ApprovalCreate from '#/views/gym/approvals/create.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { columns, fields } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="会员卡种"
      endpoint="card-templates"
      :fields="fields"
      :columns="columns"
      write-code="cards:write"
      :editable="(row) => row.status === 'draft'"
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
          <TableAction
            action="version"
            @click="
              async () => {
                await gymApi.post(`card-templates/${row.id}/versions`, {});
                message.success('已复制为新版本草稿，可编辑');
                await reload();
              }
            "
          />
          <TableAction
            :action="row.status === 'published' ? 'disable' : 'publish'"
            @click="
              async () => {
                await gymApi.patch(`card-templates/${row.id}`, {
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
