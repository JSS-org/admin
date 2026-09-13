<script setup lang="ts">
import { Button } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

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
        <Button
          v-if="row.kind === 'group' && canGym('courses:write')"
          type="link"
          @click="
            async () => {
              await gymApi.patch(`course-products/${row.id}`, {
                status: row.status === 'active' ? 'inactive' : 'active',
              });
              await reload();
            }
          "
          >{{ row.status === 'active' ? '停用' : '启用' }}</Button
        >
      </template>
    </ResourcePage>
  </div>
</template>
