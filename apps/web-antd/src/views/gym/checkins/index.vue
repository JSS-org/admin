<script setup lang="ts">
import type { ResourcePageHandle } from '#/views/gym/types';

import { onActivated, onDeactivated, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';

import { gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { config } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

const summary = ref<Record<string, number>>();

async function refreshCheckins() {
  await page.value?.load();
  summary.value = await gymApi.get('checkins/summary');
}

let timer: ReturnType<typeof setInterval> | undefined;

function start() {
  if (!timer) {
    void refreshCheckins();
    timer = setInterval(() => {
      if (!document.hidden) void refreshCheckins();
    }, 15_000);
  }
}

function stop() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

onMounted(start);

onActivated(start);

onDeactivated(stop);

onUnmounted(stop);
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="config.title"
      endpoint="checkins"
      :fields="config.fields"
      :columns="config.columns"
      :create="false"
      :edit="false"
      store-filter
      time-filter
    >
      <template v-if="summary" #toolbar>
        <span v-if="summary"
          >今日授权门店：入场 {{ summary.entries }} 次，会员 {{ summary.members }} 人，陌生访客
          {{ summary.visitors }} 次，昨日 {{ summary.yesterdayEntries }} 次（每15秒刷新）</span
        >
      </template>
    </ResourcePage>
  </div>
</template>
