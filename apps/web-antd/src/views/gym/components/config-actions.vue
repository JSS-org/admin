<script setup lang="ts">
import { Button, Tooltip } from 'ant-design-vue';

defineProps<{ dirty: boolean; busy: boolean; saving: boolean; pendingHint: string; error?: boolean }>();
const emit = defineEmits<{ restore: []; save: [] }>();
</script>
<template>
  <div class="gym-toolbar gym-config-actions">
    <span class="sr-only" role="status">{{
      error ? '配置加载失败' : busy ? '正在处理配置…' : dirty ? pendingHint : '当前配置已同步'
    }}</span>
    <Tooltip :title="dirty ? pendingHint : undefined">
      <span
        class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400"
        :class="{ invisible: !dirty }"
        :tabindex="dirty ? 0 : undefined"
        :aria-hidden="!dirty"
        :aria-label="pendingHint"
      >
        <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
        未保存
      </span>
    </Tooltip>
    <Button :disabled="busy || !dirty" @click="emit('restore')">还原更改</Button>
    <Button type="primary" :loading="saving" :disabled="busy || error || !dirty" @click="emit('save')">保存配置</Button>
  </div>
</template>
<style scoped>
.gym-config-actions {
  flex-wrap: nowrap;
  margin-inline-start: auto;
}
</style>
