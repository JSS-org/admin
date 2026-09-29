# 07 · 管理端页面移植方案（→ yudao-ui-admin-vben）

> 决策 D-01 已定：管理端基座采用 **yudao-ui-admin-vben**（同为 vben + Ant Design Vue），把现有 `apps/web-antd` 的 gym 业务页面移植过去。

## 1. 可行性结论：可行，以“合并”为主而非“重写”

| 事实 | 值 |
| --- | --- |
| 本仓库 | vben monorepo `5.7.0`，`pnpm@12.4.1`，`@vben/web-antd` + Ant Design Vue |
| yudao-ui-admin-vben | vben monorepo `5.7.0`，Ant Design Vue，`yudao-version 2026.09.0-snapshot` |
| gym 页面规模 | 70 个 `.vue` + 配套 `.ts`，约 1.15 万行 |
| 与 vben 内部耦合 | 70 个文件中仅 **8 个** 引用 `@vben/*`；绝大多数只依赖 `vue` 与 `ant-design-vue` |

结论：**框架与组件库同源**，页面可近乎原样搬入；真正的工作量在**路由/菜单/权限模型**与**接口契约**的对接，而非 UI 重写。

## 2. 移植映射

| 现状位置 | 目标（yudao-ui-admin-vben） | 处理方式 |
| --- | --- | --- |
| `apps/web-antd/src/views/gym/**` | `apps/web-antd/src/views/gym/**` | 直接复制（含 `components/`、`composables/`、`utils/`、`icons.ts`） |
| `apps/web-antd/src/api/gym.ts` + `src/api/backend/**` | 同名位置 | 复制；设 `VITE_API_BACKEND=yudao`，走适配层到 `/admin-api/gym/*` |
| `apps/web-antd/src/api/request.ts` | yudao 的 request 配置 | 合并：错误字段 `msg`、`{code,data}` 约定、刷新 token 逻辑 |
| `apps/web-antd/src/store/auth.ts` | 同名 | 合并：保存/刷新 `refreshToken` |
| `apps/web-antd/src/router/routes/modules/gym.ts` | 后端菜单 `system_menu` 或本地路由模块 | **改法见第 4 节** |
| `apps/web-antd/src/preferences.ts` | 同名 | 合并：`accessMode: 'backend'`、`defaultHomePath: '/gym/home'`、布局/主题覆盖 |
| `canGym('members:read')` 权限码 | yudao 菜单/按钮权限标识 | 直接使用业务权限码，无需再映射（或保留 `permissions.ts` 兜底） |
| `apps/backend-mock` | 不再交付 | 仅保留为离线 UI 联调参考 |

## 3. 需要处理的 vben 内部耦合（仅 8 个文件）

| 文件 | 依赖 | 处理 |
| --- | --- | --- |
| `components/admin-page.vue` | `@vben/web-antd`（页面外壳/表格封装） | 核对 yudao repo 同名组件；必要时改用原生 `ant-design-vue` |
| `components/file-preview.vue` | `@vben/web-antd` | 同上 |
| `components/rich-content.vue` | `@vben/web-antd`、`@vben/plugins` | 富文本/插件适配，按目标库版本替换 |
| `home/dashboard-chart.vue` | `@vben/plugins`（echarts） | 确认 yudao repo 的图表插件；否则改用 `echarts` 直连 |
| `home/index.vue` | `@vben/stores`、`@vben/hooks` | `useAccessStore` / `canGym` 逻辑保留 |
| `icons.ts` | `@vben/icons` | 图标集合并；核对目标 repo 是否内置 lucide |
| `README.md` / `RELEASE-NOTES.md` | 文档引用 | 更新路径与说明 |

> 其余 62 个页面仅用 `vue` + `ant-design-vue` + `vue-router` + `dayjs`，可原样迁移。
>
> 这 8 处依赖均为 vben 标准包（`Page` / `useTabs` / `useAccessStore` / `@vben/plugins` / `@vben/icons`），yudao-ui-admin-vben 同为 vben 5.7，预期直接可用；**唯一需要核对的是 `@vben/plugins/tiptap` 富文本与图标名**。因此**不需要**为移植做主动解耦改造，避免无谓改动。

## 4. 路由与菜单（关键差异）

yudao 管理端默认 **后端菜单驱动**（`accessMode: 'backend'`），菜单/按钮权限在 `system_menu` 维护，`component` 字段指向视图路径。两种落地方式：

| 方案 | 说明 | 推荐度 |
| --- | --- | --- |
| A. 后端菜单驱动 | 为 gym 页面在 `system_menu` 建菜单，`component = gym/<资源>/index`，权限标识用业务权限码；页面不改路由 | **推荐**，贴合 yudao，权限/菜单后台可配 |
| B. 本地路由模块 + 后端权限 | 保留 `routes/modules/gym.ts` 静态路由，后端菜单仅控制权限码 | 过渡期可用，长期与 yudao 习惯不一致 |

`authority: ['hq','store']` 的粗粒度范围改为 yudao 的**菜单可见性 + 数据权限**（门店=部门）表达。

## 5. 建议移植顺序（与 `04-roadmap.md` 对齐）

1. **骨架**：合并 `api/backend` + `request.ts` + `store/auth.ts` + `preferences.ts`，跑通 yudao 登录与一个只读页。
2. **权限/菜单**：建立 gym 菜单与权限码，验证 `canGym` 过滤与门店数据范围。
3. **基础资料页**：门店、员工、角色权限。
4. **业务页分批**：会员/卡种 → 课程/预约/签到 → 合同/审批 → 售卡/报表 → 设备/黑名单。
5. **联调**：接 `yudao-module-gym` 真实接口，逐页替换适配层。

每批完成后按 `06-workflow.md` 校验并提交；页面 R 编号登记到 `01-status.md`。

## 6. 需要甲方/团队决定的宏观事项

| 事项 | 说明 |
| --- | --- |
| M-1 仓库策略 | yudao-ui-admin-vben 是独立 monorepo。需决定：(a) 以其为基准新仓库；(b) 在本仓库内 vendor 新增 app；(c) 本仓库仅保留页面，移植到目标 repo。**建议 (a)** |
| M-2 开发机 | 当前机器非开发机：Java/MySQL/Redis/yudao-server 无法本地运行。前端移植与文档可先行；后端联调待开发机 |
| M-3 源码获取 | 需将 `yudao-ui-admin-vben`（及后续 `yudao-server`、`yudao-uniapp`）纳入开发环境 |
| M-4 第三方账号 | 支付/设备/推送/电子签/团购账号（见 `05-decisions.md` 待甲方提供） |
