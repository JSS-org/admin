<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type { Field } from '../types';

import { ref } from 'vue';

import { DatePicker, Form, FormItem, Input, InputNumber, Select, TimePicker } from 'ant-design-vue';
import dayjs from 'dayjs';

import PercentageInput from './percentage-input.vue';

defineProps<{ fields: Field[]; fieldOptions: (field: Field) => { label: string; value: any }[] }>();

const form = defineModel<Record<string, any>>({ required: true });

const formRef = ref<FormInstance>();

defineExpose({ validate: () => formRef.value?.validate() });
</script>

<template>
  <Form ref="formRef" :model="form" layout="vertical">
    <FormItem
      v-for="field in fields"
      :key="field.key"
      :name="field.key"
      :label="field.label"
      :html-for="`resource-${field.key}`"
      :rules="field.required && field.type !== 'textarea' ? [{ required: true, message: `请填写${field.label}` }] : []"
    >
      <Select
        v-if="field.source || field.type === 'select' || field.type === 'multi' || field.type === 'tags'"
        :id="`resource-${field.key}`"
        v-model:value="form[field.key]"
        :options="fieldOptions(field)"
        :mode="field.type === 'tags' ? 'tags' : field.type === 'multi' ? 'multiple' : undefined"
        :placeholder="`请选择${field.label}`"
        show-search
        option-filter-prop="label"
        allow-clear
      />
      <InputNumber
        v-else-if="field.type === 'number' || field.type === 'money'"
        :id="`resource-${field.key}`"
        v-model:value="form[field.key]"
        :min="field.min ?? 0"
        :max="field.max"
        :precision="field.precision ?? (field.type === 'money' ? 2 : 0)"
        :string-mode="field.type === 'money'"
        style="width: 100%"
      />
      <PercentageInput
        v-else-if="field.type === 'percent'"
        :id="`resource-${field.key}`"
        v-model:value="form[field.key]"
      />
      <DatePicker
        v-else-if="field.type === 'date' || field.type === 'datetime'"
        :id="`resource-${field.key}`"
        :value="
          form[field.key]
            ? dayjs(form[field.key]).format(field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm:ss')
            : undefined
        "
        :value-format="field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm:ss'"
        :show-time="field.type === 'datetime'"
        :placeholder="`请选择${field.label}`"
        @update:value="form[field.key] = $event"
      />
      <TimePicker
        v-else-if="field.type === 'time'"
        :id="`resource-${field.key}`"
        v-model:value="form[field.key]"
        format="HH:mm"
        value-format="HH:mm"
      />
      <Input.Password
        v-else-if="field.type === 'password'"
        :id="`resource-${field.key}`"
        v-model:value="form[field.key]"
      />
      <Input.TextArea
        v-else-if="field.type === 'textarea'"
        :id="`resource-${field.key}`"
        v-model:value="form[field.key]"
        :rows="3"
      />
      <Input v-else :id="`resource-${field.key}`" v-model:value="form[field.key]" />
    </FormItem>
  </Form>
</template>
