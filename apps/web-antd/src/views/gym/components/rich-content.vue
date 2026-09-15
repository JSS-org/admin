<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';

import { VbenTiptap } from '@vben/plugins/tiptap';

import { Alert, message } from 'ant-design-vue';

import { getGymFileUrl, openGymFile, uploadGymFile } from '#/api/gym';

const props = withDefaults(
  defineProps<{ modelValue: string; editable?: boolean; disabled?: boolean; storeId?: string }>(),
  {
    editable: true,
    disabled: false,
    storeId: undefined,
  },
);
const emit = defineEmits<{ 'update:modelValue': [value: string]; uploading: [value: boolean] }>();
const rendered = ref('');
const failed = ref(false);
const loading = ref(false);
const urls = new Map<string, string>();
let request = 0;
let disposed = false;
let emittedValue: string | undefined;
let uploads = 0;
async function hydrate() {
  // Local edits already contain resolved image URLs; keep the editor selection intact.
  if (props.modelValue === emittedValue) return;
  emittedValue = undefined;
  const current = ++request;
  loading.value = true;
  failed.value = false;
  try {
    const document = new DOMParser().parseFromString(props.modelValue, 'text/html');
    for (const img of document.querySelectorAll('img')) {
      const src = img.getAttribute('src') ?? '';
      if (src.startsWith('gym-file:')) {
        const id = src.slice(9);
        let url = urls.get(id);
        if (!url) {
          url = await getGymFileUrl(id);
          if (current !== request) {
            URL.revokeObjectURL(url);
            return;
          }
          urls.set(id, url);
        }
        img.setAttribute('src', url);
      } else if (!/^https?:\/\//i.test(src)) img.remove();
    }
    if (current === request) rendered.value = document.body.innerHTML;
  } catch {
    if (current === request) failed.value = true;
  } finally {
    if (current === request) loading.value = false;
  }
}
function update(html: string) {
  if (loading.value || !props.editable) return;
  rendered.value = html;
  const document = new DOMParser().parseFromString(html, 'text/html');
  for (const img of document.querySelectorAll('img')) {
    const id = [...urls].find(([, url]) => url === img.getAttribute('src'))?.[0];
    if (id) img.setAttribute('src', `gym-file:${id}`);
    else if (img.getAttribute('src')?.startsWith('blob:')) img.remove();
  }
  emittedValue = document.body.innerHTML;
  emit('update:modelValue', emittedValue);
}
const imageUpload = {
  accept: 'image/png,image/jpeg',
  maxSize: 10 * 1024 * 1024,
  onUploadError: () => message.error('图片上传失败，请重试'),
  async upload(file: File) {
    uploads++;
    emit('uploading', true);
    try {
      const uploaded = await uploadGymFile(file, 'image', props.storeId);
      const url = await getGymFileUrl(uploaded.id);
      if (disposed) {
        URL.revokeObjectURL(url);
        throw new Error('Editor closed');
      }
      urls.set(uploaded.id, url);
      return url;
    } finally {
      uploads--;
      emit('uploading', uploads > 0);
    }
  },
};
function openFileLink(event: MouseEvent) {
  if (props.editable || !(event.target instanceof Element)) return;
  const href = event.target.closest('a')?.getAttribute('href');
  const id = href?.match(/^\/gym\/file-preview\/([\da-f-]+)$/i)?.[1];
  if (!id) return;
  event.preventDefault();
  event.stopPropagation();
  void openGymFile(id);
}
watch(() => props.modelValue, hydrate, { immediate: true });
onScopeDispose(() => {
  disposed = true;
  request++;
  for (const url of urls.values()) URL.revokeObjectURL(url);
});
</script>
<template>
  <div class="gym-form-stack" @click.capture="openFileLink">
    <Alert v-if="failed" type="error" message="正文图片加载失败，请重新加载配置后编辑。" />
    <VbenTiptap
      :model-value="rendered"
      :editable="editable && !disabled && !loading && !failed"
      :toolbar="editable"
      :previewable="false"
      :image-upload="editable ? imageUpload : undefined"
      :min-height="editable ? 360 : 80"
      :max-height="editable ? 640 : 'none'"
      placeholder="输入正文，使用工具栏插入标题、列表、图片和链接"
      @update:model-value="update"
    />
  </div>
</template>
