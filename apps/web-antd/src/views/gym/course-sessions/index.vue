<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Button, message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { config, editable, initial, prepare } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

async function cancel(row: GymRow) {
  await gymApi.patch(`course-sessions/${row.id}`, { status: 'cancelled' });
  message.success('已取消');
  await page.value?.load();
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="config.title"
      endpoint="course-sessions"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="true"
      :editable="editable"
      :initial="initial"
      :prepare="prepare"
      store-filter
      time-filter
    >
      <template #actions="{ row }">
        <Button v-if="row.status === 'scheduled' && canGym('courses:write')" type="link" danger @click="cancel(row)">
          取消{{ '排课' }}</Button
        >
      </template>
    </ResourcePage>
  </div>
</template>
