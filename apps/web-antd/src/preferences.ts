import { defineOverridesPreferences } from '@vben/preferences';

// Product controls are fixed by the application, including when old preferences are cached.
export const adminPreferences = {
  app: {
    layout: 'sidebar-nav' as const,
    locale: 'zh-CN' as const,
    enablePreferences: false,
    enableCopyPreferences: false,
    enableCheckUpdates: false,
  },
  copyright: { enable: false },
  logo: { source: '', sourceDark: '' },
  sidebar: { fixedButton: false, draggable: false, expandOnHover: false },
  shortcutKeys: {
    globalPreferences: false,
    globalSearch: false,
    globalLockScreen: false,
  },
  tabbar: { showMaximize: false },
  widget: {
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
    defaultHomePath: '/gym/stores',
    name: import.meta.env.VITE_APP_TITLE,
  },
});
