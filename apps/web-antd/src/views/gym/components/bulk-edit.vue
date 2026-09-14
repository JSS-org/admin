<script setup lang="ts">
import type { Field } from '../types';

import type { GymRow } from '#/api/gym';

import { computed, ref } from 'vue';

import { Alert, Button, Form, FormItem, message, Select } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import { patchSelectedRows } from '../composables/bulk-edit';
import AdminDrawer from './admin-drawer.vue';
import ResourceForm from './resource-form.vue';

const props = defineProps<{
  endpoint: string;
  fields: Field[];
  rows: GymRow[];
  disabled?: boolean;
  editable?: (row: GymRow) => boolean;
  fieldOptions: (field: Field) => { label: string; value: any }[];
}>();
const emit = defineEmits<{ changed: [] }>();
const visible = ref(false);
const busy = ref(false);
const keys = ref<string[]>([]);
const form = ref<Record<string, any>>({});
const formRef = ref<{ validate: () => Promise<unknown> }>();
const targets = ref<GymRow[]>([]);
const skipped = ref(0);
const failures = ref<{ row: GymRow; message: string }[]>([]);
const successCount = ref(0);
const targetEndpoint = ref('');
const chosenFields = computed(() =>
  props.fields.filter((field) => keys.value.includes(field.key)).map((field) => ({ ...field, required: true })),
);
function open() {
  if (busy.value) return;
  targetEndpoint.value = props.endpoint;
  targets.value = props.rows.filter((row) => !props.editable || props.editable(row)).map((row) => ({ ...row }));
  skipped.value = props.rows.length - targets.value.length;
  keys.value = [];
  form.value = {};
  failures.value = [];
  successCount.value = 0;
  visible.value = true;
}
async function save() {
  if (busy.value || keys.value.length === 0 || targets.value.length === 0) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  const values = Object.fromEntries(keys.value.map((key) => [key, form.value[key]]));
  if (Object.values(values).some((value) => value === undefined || value === null || value === '')) return;
  busy.value = true;
  const endpoint = targetEndpoint.value;
  try {
    const result = await patchSelectedRows(targets.value, values, async (row, payload) => {
      const latest = await gymApi.get(`${endpoint}/${row.id}`);
      if (props.editable && !props.editable(latest)) throw new Error('记录状态已变化，当前不可编辑');
      return gymApi.patch(`${endpoint}/${row.id}`, payload);
    });
    successCount.value += result.succeeded.length;
    failures.value = result.failed;
    targets.value = result.failed.map((failure) => failure.row);
    emit('changed');
    if (result.failed.length === 0) {
      message.success(`已更新 ${successCount.value} 条记录`);
      visible.value = false;
    }
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <Button :disabled="disabled || !rows.length" @click="open"
    >批量编辑{{ rows.length ? `（${rows.length}）` : '' }}</Button
  >
  <AdminDrawer
    v-model:open="visible"
    title="批量编辑"
    :confirm-loading="busy"
    :ok-button-props="{ disabled: !keys.length || !targets.length }"
    @ok="save"
  >
    <Alert
      type="info"
      show-icon
      :message="`将修改 ${targets.length} 条记录，仅覆盖下方选中的字段`"
      :description="
        skipped
          ? `另有 ${skipped} 条记录因状态限制已跳过。`
          : '选择本页记录，填写统一值后确认保存。未选择的字段保持原值。'
      "
    />
    <Alert
      v-if="failures.length"
      type="warning"
      show-icon
      :message="`已成功 ${successCount} 条，失败 ${failures.length} 条；再次确认只重试失败记录。`"
    />
    <ul v-if="failures.length" class="mb-4 space-y-2 text-sm">
      <li v-for="failure in failures" :key="failure.row.id">
        {{ failure.row.name ?? failure.row.employeeNo ?? failure.row.id }}：{{ failure.message }}
      </li>
    </ul>
    <Form layout="vertical">
      <FormItem label="需要修改的字段">
        <Select
          v-model:value="keys"
          mode="multiple"
          :disabled="busy"
          :options="fields.map((field) => ({ label: field.label, value: field.key }))"
          placeholder="选择字段，不会自动覆盖整条记录"
        />
      </FormItem>
    </Form>
    <ResourceForm ref="formRef" v-model="form" :fields="chosenFields" :field-options="fieldOptions" :disabled="busy" />
  </AdminDrawer>
</template>
