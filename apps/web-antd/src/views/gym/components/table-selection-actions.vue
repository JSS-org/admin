<script setup lang="ts">
import { Button } from 'ant-design-vue';

defineProps<{ selected: number; total: number; disabled?: boolean }>();
const emit = defineEmits<{ selectAll: []; clear: [] }>();
</script>

<template>
  <div class="gym-selection-actions" role="group" aria-label="表格选择">
    <Button :disabled="disabled || !total || selected === total" @click="emit('selectAll')">全选本页</Button>
    <Button :disabled="disabled || !selected" @click="emit('clear')">清空选择</Button>
    <span class="text-muted-foreground text-sm" role="status" aria-live="polite" aria-atomic="true">
      已选 <strong class="text-primary">{{ selected }}</strong> 条
    </span>
  </div>
</template>

<style scoped>
.gym-selection-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gym-space-action);
  align-items: center;
}
</style>
