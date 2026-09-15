<script setup lang="ts">
import type { ButtonProps } from 'ant-design-vue';

import { computed } from 'vue';

import { Button, Drawer } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    width?: number | string;
    footer?: null;
    confirmLoading?: boolean;
    okButtonProps?: ButtonProps;
    destroyOnClose?: boolean;
  }>(),
  { title: undefined, width: 640, footer: undefined, okButtonProps: undefined },
);
const emit = defineEmits<{ ok: [] }>();
const open = defineModel<boolean>('open', { default: false });
const drawerWidth = computed(() => (typeof props.width === 'number' ? `${props.width}px` : props.width));

function close() {
  if (!props.confirmLoading) open.value = false;
}
</script>

<template>
  <Drawer
    :open="open"
    :title="title"
    :width="`min(${drawerWidth}, 100vw)`"
    :destroy-on-close="destroyOnClose"
    :closable="!confirmLoading"
    :keyboard="!confirmLoading"
    :mask-closable="!confirmLoading"
    root-class-name="gym-dialog"
    placement="right"
    @close="close"
  >
    <div class="gym-stack">
      <slot></slot>
    </div>
    <template v-if="footer !== null" #footer>
      <div class="gym-drawer-actions">
        <Button :disabled="confirmLoading" @click="close">取消</Button>
        <Button v-bind="okButtonProps" type="primary" :loading="confirmLoading" @click="emit('ok')"> 确定 </Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.gym-drawer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gym-space-action);
  justify-content: flex-end;
}
</style>
