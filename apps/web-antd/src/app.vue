<script lang="ts" setup>
import { computed } from 'vue';

import { useAntdDesignTokens } from '@vben/hooks';
import { preferences, usePreferences } from '@vben/preferences';

import { App, ConfigProvider, theme } from 'ant-design-vue';

import { antdLocale } from '#/locales';

defineOptions({ name: 'App' });

const { isDark } = usePreferences();
const { tokens } = useAntdDesignTokens();

const tokenTheme = computed(() => {
  const algorithm = isDark.value ? [theme.darkAlgorithm] : [theme.defaultAlgorithm];

  // antd 紧凑模式算法
  if (preferences.app.compact) {
    algorithm.push(theme.compactAlgorithm);
  }

  return {
    algorithm,
    token: tokens,
  };
});
</script>

<template>
  <ConfigProvider :locale="antdLocale" :theme="tokenTheme">
    <App class="gym-app">
      <RouterView />
    </App>
  </ConfigProvider>
</template>

<style>
.gym-app {
  min-height: 100%;
  isolation: isolate;
}

.gym-app::before {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(rgb(255 255 255 / 62%), rgb(255 255 255 / 62%)),
    url('./assets/images/white-gym-background.jpg') right center / cover no-repeat;
  background-color: #fafaf9;
}

.gym-app [data-layout-region='scroll'] {
  background: transparent;
}

.gym-app [data-layout-region='sidebar'],
.gym-app [data-layout-region='header'] > header,
.gym-app [data-layout-region='header'] > section {
  background: rgb(255 255 255 / 90%);
}

.gym-app [data-layout-region='sidebar'] > .bg-sidebar {
  background: transparent;
}

.gym-app .gym-shortcut,
.gym-app .gym-filter {
  background: rgb(255 255 255 / 94%);
  box-shadow: 0 4px 24px rgb(34 42 48 / 3%);
}
</style>
