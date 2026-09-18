<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { computed, ref } from 'vue';

import { message, Table, Upload } from 'ant-design-vue';

import { openGymFile, uploadGymFile } from '#/api/gym';
import TableAction from '#/views/gym/components/table-action.vue';

const props = defineProps<{ storeId?: string; editable?: boolean; disabled?: boolean }>();
const emit = defineEmits<{ uploading: [value: boolean] }>();
const files = defineModel<GymRow[]>({ default: () => [] });
const busy = ref(false);
const fileTypes: Record<string, string> = { 'application/pdf': 'PDF', 'image/png': 'PNG', 'image/jpeg': 'JPG' };
const columns = computed(() => [
  { title: '文件名称', dataIndex: 'originalName', ellipsis: true },
  { title: '类型', dataIndex: 'mimeType', width: 80 },
  { title: '大小', dataIndex: 'byteSize', width: 100 },
  { title: '操作', key: 'actions', width: props.editable ? 96 : 64 },
]);

async function upload(file: File) {
  if (busy.value || props.disabled || !props.storeId) return Upload.LIST_IGNORE;
  if (files.value.length >= 10 || file.size > 20 * 1024 * 1024) {
    message.warning('最多上传10个附件，单个文件不超过20 MB');
    return Upload.LIST_IGNORE;
  }
  if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) {
    message.warning('请选择 PDF、JPG 或 PNG 文件');
    return Upload.LIST_IGNORE;
  }
  busy.value = true;
  emit('uploading', true);
  try {
    const result = await uploadGymFile(file, 'approval', props.storeId);
    files.value = [...files.value, result];
  } catch {
    // Keep existing attachments; the request client displays the upload error.
  } finally {
    busy.value = false;
    emit('uploading', false);
  }
  return Upload.LIST_IGNORE;
}

function remove(id: string) {
  files.value = files.value.filter((file) => file.id !== id);
}
</script>

<template>
  <div class="gym-form-stack">
    <Upload
      v-if="editable"
      accept=".pdf,.jpg,.jpeg,.png"
      :show-upload-list="false"
      :before-upload="upload"
      :disabled="disabled || busy || !storeId || files.length >= 10"
    >
      <TableAction action="attach" :loading="busy" :disabled="disabled || !storeId || files.length >= 10" />
    </Upload>
    <p v-if="editable" class="text-xs text-muted-foreground">
      PDF / JPG / PNG，最多10个，每个不超过20 MB。请先选择门店。
    </p>
    <Table
      :data-source="files"
      :columns="columns"
      row-key="id"
      :pagination="false"
      :scroll="{ x: 440 }"
      :locale="{ emptyText: '暂无附件' }"
    >
      <template #bodyCell="{ column, record, text }">
        <template v-if="column.key === 'actions'">
          <TableAction action="preview" label="预览" @click="openGymFile(record.id)" />
          <TableAction
            v-if="editable"
            action="remove"
            :label="`移除：${record.originalName}`"
            danger
            :disabled="disabled || busy"
            @click="remove(record.id)"
          />
        </template>
        <template v-else-if="column.dataIndex === 'mimeType'">{{ fileTypes[text] ?? text }}</template>
        <template v-else-if="column.dataIndex === 'byteSize'">{{
          text >= 1024 * 1024 ? `${(text / 1024 / 1024).toFixed(1)} MB` : `${(text / 1024).toFixed(1)} KB`
        }}</template>
      </template>
    </Table>
  </div>
</template>
