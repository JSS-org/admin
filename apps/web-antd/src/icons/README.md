菜单图标保留字符串名称，兼容菜单和标签页缓存；`route-icons.ts` 在路由模块加载时同步注册本地 SVG 数据，不请求 Iconify API。

`route-icons.json` 是仓库已安装的 `@iconify/json@2.2.520` 中 Lucide 图标的按需子集（仅当前 gym 路由使用的图标）。新增菜单图标时同时补充此文件，并运行 `route-icons.test.ts` 检查覆盖范围。页面和操作按钮优先从 `@vben/icons` 导入本地 Lucide 组件。

Lucide 图标采用 ISC 许可证，见 `LICENSE-lucide`。
