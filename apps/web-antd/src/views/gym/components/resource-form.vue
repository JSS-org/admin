<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type { Field } from '../types';

import { ref } from 'vue';

import { Form, FormItem, Input, InputNumber, Select } from 'ant-design-vue';

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
      :rules="field.required ? [{ required: true, message: `请填写${field.label}` }] : []"
    >
      <Select
        v-if="field.source || field.type === 'select' || field.type === 'multi'"
        v-model:value="form[field.key]"
        :options="fieldOptions(field)"
        :mode="field.type === 'multi' ? 'multiple' : undefined"
        show-search
        option-filter-prop="label"
        allow-clear
      />
      <InputNumber
        v-else-if="field.type === 'number'"
        v-model:value="form[field.key]"
        :min="0"
        :precision="0"
        style="width: 100%"
      />
      <Input.TextArea v-else-if="field.type === 'textarea'" v-model:value="form[field.key]" :rows="3" />
      <Input
        v-else
        v-model:value="form[field.key]"
        :type="
          field.type === 'date'
            ? 'date'
            : field.type === 'datetime'
              ? 'datetime-local'
              : field.type === 'password'
                ? 'password'
                : 'text'
        "
      />
    </FormItem>
  </Form>
</template>
