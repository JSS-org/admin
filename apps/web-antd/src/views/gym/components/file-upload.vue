<script setup lang="ts">
import type { UploadFile } from 'ant-design-vue';

import { computed, ref } from 'vue';

import { message, Upload } from 'ant-design-vue';

import { openGymFile, uploadGymFile } from '#/api/gym';
import { gymIcons } from '#/views/gym/icons';

import FileMedia from './file-media.vue';

const props = defineProps<{
  category: 'contract' | 'image' | 'video';
  storeId?: string;
  disabled?: boolean;
  title?: string;
}>();
const emit = defineEmits<{ uploading: [value: boolean] }>();
const model = defineModel<null | string>();
const busy = ref(false);
const filename = ref('');
const files = computed<UploadFile[]>(() =>
  model.value
    ? [
        {
          uid: model.value,
          name: filename.value || (props.category === 'contract' ? '已上传的 PDF' : '已上传的媒体'),
          status: 'done',
        },
      ]
    : [],
);
const accept = computed(() => ({ image: '.png,.jpg,.jpeg', video: '.mp4', contract: '.pdf' })[props.category]);
async function upload(file: File) {
  if (busy.value || props.disabled) return Upload.LIST_IGNORE;
  const limit = { contract: 20, image: 10, video: 200 }[props.category];
  if (file.size > limit * 1024 * 1024) {
    message.error(`文件大小不能超过 ${limit} MB`);
    return Upload.LIST_IGNORE;
  }
  busy.value = true;
  emit('uploading', true);
  try {
    const result = await uploadGymFile(file, props.category, props.storeId);
    model.value = result.id;
    filename.value = file.name;
  } finally {
    busy.value = false;
    emit('uploading', false);
  }
  return false;
}
function clearFile() {
  model.value = null;
}
</script>
<template>
  <div class="gym-upload gym-form-stack">
    <Upload.Dragger
      :accept="accept"
      :file-list="files"
      :before-upload="upload"
      :max-count="1"
      :disabled="disabled || busy"
      @preview="model && openGymFile(model)"
      @remove="clearFile"
    >
      <component :is="gymIcons.upload" class="mx-auto mb-3 size-8 text-primary" />
      <p class="font-medium">{{ busy ? '正在上传…' : title || '点击或拖入文件' }}</p>
      <p class="mt-2 text-xs text-muted-foreground">
        {{
          category === 'image' ? 'JPG / PNG，最大 10 MB' : category === 'video' ? 'MP4，最大 200 MB' : 'PDF，最大 20 MB'
        }}
      </p>
    </Upload.Dragger>
    <FileMedia v-if="model && category !== 'contract'" :file-id="model" :kind="category" />
  </div>
</template>
<style scoped>
.gym-upload,
.gym-upload :deep(.ant-upload-wrapper) {
  width: 100%;
}
</style>
