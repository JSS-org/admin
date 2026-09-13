<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Button, message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

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
          <Button type="link" @click="newVersion(row)">新版本</Button>
          <Button
            type="link"
            @click="
              async () => {
                await gymApi.patch(`approval-templates/${row.id}`, {
                  status: row.status === 'published' ? 'inactive' : 'published',
                });
                await reload();
              }
            "
            >{{ row.status === 'published' ? '停用' : '发布' }}</Button
          >
        </template>
      </template>
    </ResourcePage>
  </div>
</template>
