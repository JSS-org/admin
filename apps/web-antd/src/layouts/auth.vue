<script lang="ts" setup>
import { computed } from 'vue';

import { AuthPageLayout } from '@vben/layouts';
import { preferences } from '@vben/preferences';

const appName = computed(() => preferences.app.name);
const logo = computed(() => preferences.logo.source);
const logoDark = computed(() => preferences.logo.sourceDark);
</script>

<template>
  <AuthPageLayout
    class="gym-auth"
    :app-name="appName"
    :logo="logo"
    :logo-dark="logoDark"
    page-description="会员服务 · 课程预约 · 门店经营"
    page-title="让门店运营更有序，让会员服务更高效"
    :toolbar="false"
  />
</template>

<style scoped>
.gym-auth :deep(.bg-background-deep) {
  background: transparent;
}

.gym-auth :deep(.bg-background) {
  background: rgb(255 255 255 / 90%);
}

.gym-auth :deep(.login-background),
.gym-auth :deep(.animate-float) {
  display: none;
}
</style>
