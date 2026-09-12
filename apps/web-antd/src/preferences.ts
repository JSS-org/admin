import { defineOverridesPreferences } from '@vben/preferences';

// Product controls are fixed by the application, including when old preferences are cached.
export const adminPreferences = {
  app: {
    defaultHomePath: '/gym/home',
    layout: 'sidebar-nav' as const,
    locale: 'zh-CN' as const,
    enablePreferences: false,
    enableCopyPreferences: false,
    enableCheckUpdates: false,
  },
  copyright: { enable: false },
  logo: { source: '', sourceDark: '' },
  sidebar: {
    collapsed: false,
    collapsedButton: true,
    fixedButton: false,
    draggable: false,
    // 框架中 true 表示固定侧栏，禁止鼠标移入/移出自动展开或收起。
    expandOnHover: true,
  },
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
    name: import.meta.env.VITE_APP_TITLE,
  },
});
