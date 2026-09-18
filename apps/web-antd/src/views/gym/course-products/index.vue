<script setup lang="ts">
import { canGym, gymApi } from '#/api/gym';
import ApprovalCreate from '#/views/gym/approvals/create.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { config, editable } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="config.title"
      endpoint="course-products"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="true"
      :editable="editable"
      store-filter
      time-filter
    >
      <template #actions="{ row, reload }">
        <ApprovalCreate
          v-if="row.status === 'active'"
          business-type="price_change"
          source-type="course-products"
          :record="row"
          label="申请改价"
        />
        <TableAction
          :action="row.status === 'active' ? 'disable' : 'enable'"
          v-if="row.kind === 'group' && canGym('courses:write')"
          @click="
            async () => {
              await gymApi.patch(`course-products/${row.id}`, {
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
