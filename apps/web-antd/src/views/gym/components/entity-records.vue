<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { onScopeDispose, ref, watch } from 'vue';

import { Alert, Button, Table, Tag } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import { displayValue, statusColor } from '../utils/display';

const props = defineProps<{
  endpoint: string;
  params: Record<string, string>;
  columns: { title: string; dataIndex: string }[];
}>();
const items = ref<GymRow[]>([]);
const loading = ref(false);
const failed = ref(false);
const page = ref(1);
const total = ref(0);
let request = 0;
async function load() {
  const current = ++request;
  loading.value = true;
  failed.value = false;
  try {
    const result = await gymApi.list(props.endpoint, { ...props.params, page: page.value, pageSize: 10 });
    if (current !== request) return;
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (current === request) {
      failed.value = true;
      items.value = [];
      total.value = 0;
    }
  } finally {
    if (current === request) loading.value = false;
  }
}
watch(
  () => [props.endpoint, JSON.stringify(props.params)],
  () => {
    page.value = 1;
    void load();
  },
  { immediate: true },
);
onScopeDispose(() => {
  request++;
});
</script>
<template>
  <div class="gym-stack">
    <Alert v-if="failed" type="error" message="关联记录加载失败"
      ><template #action><Button @click="load">重试</Button></template></Alert
    >
    <Table
      :data-source="items"
      :columns="columns"
      :loading="loading"
      row-key="id"
      :scroll="{ x: 'max-content' }"
      :pagination="{
        current: page,
        pageSize: 10,
        total,
        showSizeChanger: false,
        showTotal: (count: number) => `共 ${count} 条`,
      }"
      @change="
        (pagination) => {
          page = pagination.current ?? 1;
          load();
        }
      "
    >
      <template #bodyCell="{ column, text }">
        <Tag v-if="column.dataIndex === 'status'" :color="statusColor(text)">{{
          displayValue(text, 'status', [], {})
        }}</Tag>
        <span v-else>{{ displayValue(text, String(column.dataIndex), [], {}) }}</span>
      </template>
    </Table>
  </div>
</template>
