import { defineOverridesPreferences } from '@vben/preferences';

import defaultAvatar from './assets/default-avatar.svg';

export const adminPreferences = {
  app: {
    defaultAvatar,
    defaultHomePath: '/gym/home',
    layout: 'sidebar-nav' as const,
    locale: 'zh-CN' as const,
    enablePreferences: false,
    enableCopyPreferences: false,
    enableCheckUpdates: false,
  },
  copyright: { enable: false },
  logo: { source: '', sourceDark: '' },
  navigation: { accordion: false },
  sidebar: {
    collapsed: false,
    collapsedButton: true,
    fixedButton: false,
    draggable: false,
    expandOnHover: true,
  },
  shortcutKeys: {
    globalPreferences: false,
    globalSearch: false,
    globalLockScreen: false,
  },
  tabbar: { showMaximize: false },
  theme: {
    mode: 'light' as const,
    semiDarkHeader: false,
    semiDarkSidebar: false,
    semiDarkSidebarSub: false,
  },
  widget: {
    sidebarToggle: false,
    globalSearch: false,
    languageToggle: false,
    timezone: false,
    themeToggle: false,
    fullscreen: false,
    refresh: false,
    notification: false,
    lockScreen: false,
    logoutButtonPosition: 'user-dropdown' as const,
  },
};
export const overridesPreferences = defineOverridesPreferences({
  ...adminPreferences,
  app: {
    ...adminPreferences.app,
    accessMode: 'frontend',
    name: import.meta.env.VITE_APP_TITLE,
  },
});
