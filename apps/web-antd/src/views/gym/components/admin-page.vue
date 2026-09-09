<script setup lang="ts">
import { Page } from '@vben/common-ui';
defineProps<{ title: string }>();
</script>
<template>
  <Page :title="title" class="gym-page" content-class="gym-page-content">
    <slot></slot>
  </Page>
</template>
