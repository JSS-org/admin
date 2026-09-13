<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { onMounted, ref } from 'vue';

import { Alert } from 'ant-design-vue';

import { gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields, title } from './data';

const data = ref<Record<string, any>>({ blocks: [], models: [] });

const busy = ref(false);

const summary = ref<GymRow>();

async function load() {
  busy.value = true;
  try {
    data.value = await gymApi.get('feedback', undefined);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  await load();
  summary.value = await gymApi.get('reports/feedback');
});
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="title"
      endpoint="feedback"
      :fields="fields"
      :columns="columns"
      :create="false"
      :edit="false"
      :store-filter="true"
      time-filter
    >
      <template #summary>
        <Alert
          v-if="summary"
          type="info"
          class="mb-4"
          :message="`授权门店全部评价 ${summary.reviewCount} 条，平均 ${summary.averageRating} 分，匿名反馈 ${summary.feedbackCount} 条`"
        />
      </template>
    </ResourcePage>
  </div>
</template>
