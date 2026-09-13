<script setup lang="ts">
import { Button, message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

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
        <template v-if="canGym('cards:write')">
          <Button
            type="link"
            @click="
              async () => {
                await gymApi.post(`card-templates/${row.id}/versions`, {});
                message.success('已复制为新版本草稿，可编辑');
                await reload();
              }
            "
          >
            新版本
          </Button>
          <Button
            type="link"
            @click="
              async () => {
                await gymApi.patch(`card-templates/${row.id}`, {
                  status: row.status === 'published' ? 'inactive' : 'published',
                });
                await reload();
              }
            "
          >
            {{ row.status === 'published' ? '停用' : '发布' }}
          </Button>
        </template>
      </template>
    </ResourcePage>
  </div>
</template>
