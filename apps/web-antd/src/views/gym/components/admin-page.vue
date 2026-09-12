<script setup lang="ts">
import { Page } from '@vben/common-ui';
defineProps<{ title: string }>();
</script>
<template>
  <Page :aria-label="title" class="gym-page" content-class="gym-page-content">
    <slot></slot>
  </Page>
</template>
