<script setup lang="ts">
import { computed, ref } from 'vue';

import { Button, DatePicker, Form, FormItem, Input, Select } from 'ant-design-vue';

export interface FilterField {
  key: string;
  label: string;
  type?: 'date' | 'month' | 'select' | 'text';
  placeholder?: string;
  clearable?: boolean;
  options?: { label: string; value: any }[];
}
const props = withDefaults(
  defineProps<{
    fields?: FilterField[];
    keyword?: boolean;
    storeOptions?: { label: string; value: string }[];
    time?: boolean;
    immediate?: boolean;
    loading?: boolean;
  }>(),
  { fields: () => [], keyword: true, storeOptions: undefined },
);
const emit = defineEmits<{ search: []; reset: [] }>();
const model = defineModel<Record<string, any>>({ required: true });
const timeMode = ref<'date' | 'month' | 'range'>('date');
const rangeInvalid = computed(
  () => !!(props.time && model.value.from && model.value.to && model.value.from >= model.value.to),
);
const fields = computed<FilterField[]>(() => [
  ...(props.keyword ? [{ key: 'keyword', label: '关键词', placeholder: '名称 / 编号 / 手机号' }] : []),
  ...(props.storeOptions
    ? [
        {
          key: 'storeId',
          label: '门店',
          type: 'select' as const,
          placeholder: '全部授权门店',
          options: props.storeOptions,
        },
      ]
    : []),
  ...props.fields,
]);
function setValue(key: string, value: any) {
  model.value = { ...model.value, [key]: value };
}
function changed() {
  if (props.immediate) search();
}
function search() {
  if (!rangeInvalid.value) emit('search');
}
function changeTimeMode() {
  for (const key of ['date', 'month', 'from', 'to']) Reflect.deleteProperty(model.value, key);
  changed();
}
function reset() {
  model.value = {};
  timeMode.value = 'date';
  emit('reset');
}
</script>

<template>
  <Form :model="model" class="gym-filter" layout="vertical" @finish="search">
    <div class="gym-filter-fields">
      <FormItem v-for="field in fields" :key="field.key" :label="field.label" :html-for="`filter-${field.key}`">
        <Select
          v-if="field.type === 'select'"
          :id="`filter-${field.key}`"
          :value="model[field.key]"
          @update:value="setValue(field.key, $event)"
          :options="field.options"
          :placeholder="field.placeholder ?? '全部'"
          :allow-clear="field.clearable !== false"
          show-search
          option-filter-prop="label"
          @change="changed"
        />
        <DatePicker
          v-else-if="field.type === 'date' || field.type === 'month'"
          :id="`filter-${field.key}`"
          :value="model[field.key] || undefined"
          :picker="field.type === 'month' ? 'month' : 'date'"
          :value-format="field.type === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'"
          :placeholder="field.placeholder"
          :allow-clear="field.clearable !== false"
          @update:value="setValue(field.key, $event)"
          @change="changed"
        />
        <Input
          v-else
          :id="`filter-${field.key}`"
          :value="model[field.key]"
          @update:value="setValue(field.key, $event)"
          :type="field.type ?? 'text'"
          :placeholder="field.placeholder"
          allow-clear
          @change="changed"
        />
      </FormItem>
      <template v-if="time">
        <FormItem label="时间方式" html-for="filter-time-mode">
          <Select
            id="filter-time-mode"
            v-model:value="timeMode"
            :options="[
              { label: '按天', value: 'date' },
              { label: '按月', value: 'month' },
              { label: '时间范围', value: 'range' },
            ]"
            @change="changeTimeMode"
          />
        </FormItem>
        <FormItem v-if="timeMode !== 'range'" :label="timeMode === 'date' ? '日期' : '月份'" html-for="filter-time">
          <DatePicker
            id="filter-time"
            v-model:value="model[timeMode]"
            :picker="timeMode === 'month' ? 'month' : 'date'"
            :value-format="timeMode === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'"
            @change="changed"
          />
        </FormItem>
        <template v-else>
          <FormItem label="开始日期（含）" html-for="filter-from">
            <DatePicker id="filter-from" v-model:value="model.from" value-format="YYYY-MM-DD" @change="changed" />
          </FormItem>
          <FormItem
            label="结束日期（不含）"
            html-for="filter-to"
            :validate-status="rangeInvalid ? 'error' : undefined"
            :help="rangeInvalid ? '结束日期须晚于开始日期' : undefined"
          >
            <DatePicker id="filter-to" v-model:value="model.to" value-format="YYYY-MM-DD" @change="changed" />
          </FormItem>
        </template>
      </template>
    </div>
    <div v-if="!immediate" class="gym-filter-actions">
      <span class="gym-filter-hint">设置条件后查询，重置可查看全部记录</span>
      <Button type="primary" html-type="submit" :loading="loading" :disabled="rangeInvalid"> 查询 </Button>
      <Button :disabled="loading" @click="reset">重置</Button>
    </div>
  </Form>
</template>

<style scoped>
.gym-filter {
  padding: 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
}

.gym-filter-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 16px;
}

.gym-filter-fields :deep(.ant-form-item) {
  min-width: 0;
  margin-bottom: 0;
}

.gym-filter-fields :deep(.ant-select),
.gym-filter-fields :deep(.ant-picker),
.gym-filter-fields :deep(.ant-input-affix-wrapper),
.gym-filter-fields :deep(.ant-input) {
  width: 100%;
  min-width: 0;
}

.gym-filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 16px;
}

.gym-filter-hint {
  margin-right: auto;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
</style>
