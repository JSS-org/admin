<script setup lang="ts">
import { useId } from 'vue';

import { Switch } from 'ant-design-vue';

defineOptions({ inheritAttrs: false });
defineProps<{ label: string }>();
const checked = defineModel<boolean>('checked', { default: false });
const id = useId();
</script>
<template>
  <div class="gym-switch">
    <Switch :id="id" v-model:checked="checked" v-bind="$attrs" :aria-label="label" />
    <label :for="id">{{ label }}</label>
  </div>
</template>
<style scoped>
.gym-switch {
  display: inline-flex;
  gap: var(--gym-space-compact);
  align-items: center;
}

.gym-switch label {
  font-size: 14px;
  cursor: pointer;
}
</style>
