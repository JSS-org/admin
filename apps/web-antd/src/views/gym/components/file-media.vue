<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';

import { Button, Image, Skeleton } from 'ant-design-vue';

import { getGymFileUrl } from '#/api/gym';
const props = withDefaults(defineProps<{ fileId?: null | string; kind?: 'image' | 'video'; alt?: string }>(), {
  fileId: undefined,
  kind: 'image',
  alt: '媒体预览',
});
const url = ref('');
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
  failed.value = false;
  if (!props.fileId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const value = await getGymFileUrl(props.fileId);
    if (current === request) url.value = value;
    else URL.revokeObjectURL(value);
  } catch {
    if (current === request) failed.value = true;
  } finally {
    if (current === request) loading.value = false;
  }
}
watch(() => props.fileId, load, { immediate: true });
onScopeDispose(() => {
  request++;
  release();
});
</script>
<template>
  <div class="file-media">
    <Skeleton v-if="loading" active :paragraph="{ rows: 2 }" />
    <div v-else-if="failed" class="file-media-empty">媒体加载失败 <Button type="link" @click="load">重试</Button></div>
    <Image v-else-if="url && kind === 'image'" :src="url" :alt="alt" />
    <video v-else-if="url" :src="url" controls preload="metadata"></video>
    <div v-else class="file-media-empty">{{ alt }}</div>
  </div>
</template>
<style scoped>
.file-media {
  overflow: hidden;
  background: hsl(var(--muted));
  border-radius: 10px;
}

.file-media :deep(.ant-image),
.file-media video {
  display: block;
  width: 100%;
}

.file-media :deep(img),
.file-media video {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
}

.file-media-empty {
  padding: 36px 16px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}
</style>
