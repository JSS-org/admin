<script setup lang="ts">
import { computed } from 'vue';

import { InputNumber } from 'ant-design-vue';

const value = defineModel<null | number | string | undefined>('value');
const percent = computed({
  get: () =>
    value.value === undefined || value.value === null || value.value === ''
      ? undefined
      : Number((Number(value.value) * 100).toFixed(4)),
  set: (next: null | number | undefined) => {
    value.value = next === null || next === undefined ? undefined : Number((next / 100).toFixed(6));
  },
});
</script>
<template>
  <InputNumber v-model:value="percent" :min="0" :max="100" :precision="4" addon-after="%" placeholder="请输入百分比" />
</template>
