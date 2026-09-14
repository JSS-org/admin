<script setup lang="ts">
import { Page } from '@vben/common-ui';
defineProps<{ title: string; description?: string }>();
</script>
<template>
  <Page :aria-label="title" class="gym-page" content-class="gym-page-content">
    <header class="gym-page-heading">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </header>
    <slot></slot>
  </Page>
</template>
