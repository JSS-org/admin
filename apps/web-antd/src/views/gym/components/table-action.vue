<script setup lang="ts">
import type { TableActionName } from './table-actions';

import { computed } from 'vue';

import { Button, Tooltip } from 'ant-design-vue';

import { tableActions } from './table-actions';

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  action: TableActionName;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
}>();
const definition = computed(() => tableActions[props.action]);
const title = computed(() => props.label ?? definition.value.label);

function popupContainer(trigger: HTMLElement) {
  // Keep drawer tooltips out of the document scroll area during positioning.
  return trigger.closest<HTMLElement>('.ant-drawer') ?? document.body;
}
</script>

<template>
  <Tooltip :title="title" :get-popup-container="popupContainer">
    <span class="gym-table-action-wrap" :tabindex="disabled ? 0 : undefined" :aria-label="disabled ? title : undefined">
      <Button
        v-bind="$attrs"
        type="text"
        class="gym-table-action"
        :aria-label="title"
        :disabled="disabled"
        :loading="loading"
        :danger="danger"
      >
        <template #icon><component :is="definition.icon" class="size-4" aria-hidden="true" /></template>
      </Button>
    </span>
  </Tooltip>
</template>

<style scoped>
.gym-table-action-wrap {
  display: inline-flex;
  vertical-align: middle;
}

.gym-table-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
}
</style>
