<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { onScopeDispose, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useTabs } from '@vben/hooks';

import { Alert, Button, Spin } from 'ant-design-vue';

import { getGymFileUrl, gymApi } from '#/api/gym';

import AdminPage from './admin-page.vue';

const route = useRoute();
const { setTabTitle } = useTabs();

const url = ref('');
const file = ref<GymRow>();
const loading = ref(false);
const failed = ref(false);
let request = 0;
function release() {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = '';
}
async function load() {
  const current = ++request;
  release();
  file.value = undefined;
  failed.value = false;
  const fileId = String(route.params.id ?? '');
  if (!fileId) return;
  loading.value = true;
  try {
    const metadata = await gymApi.get(`files/${fileId}`);
    if (current !== request) return;
    const result = await getGymFileUrl(metadata.id);
    if (current !== request) {
      URL.revokeObjectURL(result);
      return;
    }
    file.value = metadata;
    url.value = result;
    void setTabTitle(metadata.originalName);
  } catch {
    if (current === request) failed.value = true;
  } finally {
    if (current === request) loading.value = false;
  }
}
watch(() => route.params.id, load, { immediate: true });
onScopeDispose(() => {
  request++;
  release();
});
</script>
<template>
  <AdminPage :title="file?.originalName ?? '文件预览'">
    <template v-if="url && file" #actions>
      <span>{{ (file.byteSize / 1024).toFixed(1) }} KB</span>
      <a :href="url" :download="file.originalName">下载原文件</a>
    </template>
    <Spin v-if="loading" class="file-loading" tip="正在加载文件" />
    <Alert
      v-else-if="failed"
      type="error"
      show-icon
      message="文件暂时无法读取"
      description="请重试。若 Mock 服务已重启，请重新上传该文件。"
    >
      <template #action><Button @click="load">重试</Button></template>
    </Alert>
    <template v-else-if="url && file">
      <img v-if="file.mimeType.startsWith('image/')" :src="url" :alt="file.originalName" class="file-image" />
      <video v-else-if="file.mimeType.startsWith('video/')" :src="url" controls class="file-video"></video>
      <template v-else-if="file.mimeType === 'application/pdf'">
        <iframe :src="url" :title="file.originalName" class="file-pdf"></iframe>
      </template>
      <Alert v-else type="info" message="此文件请下载后查看" />
    </template>
  </AdminPage>
</template>
<style scoped>
.file-loading {
  display: block;
  padding: 60px;
}

.file-image,
.file-video,
.file-pdf {
  width: 100%;
}

.file-video {
  max-height: 70vh;
}

.file-image {
  max-height: 75vh;
  object-fit: contain;
}

.file-pdf {
  height: 72vh;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}
</style>
