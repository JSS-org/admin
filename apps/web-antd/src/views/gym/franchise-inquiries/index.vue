<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields, title } from './data';

const data = ref<Record<string, any>>({ blocks: [], models: [] });

const busy = ref(false);

async function load() {
  busy.value = true;
  try {
    data.value = await gymApi.get('franchise-inquiries', undefined);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  await load();
});
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="title"
      endpoint="franchise-inquiries"
      :fields="fields"
      :columns="columns"
      write-code="franchise:manage"
      :create="false"
      :edit="true"
      :store-filter="false"
      time-filter
    />
  </div>
</template>
