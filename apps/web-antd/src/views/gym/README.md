# Gym 页面维护指南

每个路由对应一个目录。打开 `/gym/bookings`，直接修改 `bookings/index.vue`；打开 `/gym/reports/members`，修改 `reports/members/index.vue`。原来的 `training.vue`、`marketing.vue` 等跨功能分支页面已拆除。

## 修改入口

| 要修改的内容 | 文件 |
| --- | --- |
| 页面布局、工具栏、行操作、业务抽屉 | 对应目录的 `index.vue` |
| 表格列、表单字段、选项、编辑数据转换 | 对应目录的 `data.ts`（部分简单转换直接放在页面中） |
| 较复杂的请求、联动选择、上传、提交状态 | 对应目录的 `use-page.ts`；简单交互保留在页面中 |
| 菜单分类、名称、排序、路由权限 | `src/router/routes/modules/gym.ts` |
| 通用分页、查询、刷新 | `composables/use-resource-list.ts` |
| 通用新增／编辑、校验、保存、幂等键 | `composables/use-resource-editor.ts` |
| 下拉选项加载、关联门店筛选 | `composables/use-resource-options.ts` |
| 表单控件渲染 | `components/resource-form.vue` |
| 批量编辑、失败项重试 | `components/bulk-edit.vue`、`composables/bulk-edit.ts` |
| 实体详情内的关联列表 | `components/entity-records.vue` |
| 图片、视频上传与行内预览 | `components/file-upload.vue`、`components/file-media.vue` |
| PDF / 图片 / 视频统一预览 | `components/file-preview.vue`；`openGymFile()` 打开 `/gym/file-preview/:id` 后台标签页 |
| 首页经营看板 | `home/`；Mock 汇总接口位于 `apps/backend-mock/utils/gym/dashboard.ts` |
| 售卡规则、展示内容的校验和提交转换 | `settings/settings-form.ts`、`client-settings/content-form.ts` |
| 表格选择状态、全选本页、清空选择 | `components/use-table-selection.ts`、`components/table-selection-actions.vue` |
| 字段类型、列表属性、列表公开方法 | `types.ts` |
| 单元格状态与时间格式化 | `utils/display.ts` |

## 主要业务目录

| 业务 | 目录 |
| --- | --- |
| 门店、员工、会员、会员卡模板 | `stores/`、`employees/`、`members/`、`cards/` |
| 课程与预约 | `course-products/`、`course-sessions/`、`bookings/`、`lesson-records/` |
| 签到与体测 | `checkins/`、`body-measurements/` |
| 合同与审批 | `contract-templates/`、`contracts/`、`approval-templates/`、`approvals/` |
| 智能设备与器械教学 | `devices/`、`equipment/` |
| 优惠券、礼品码、积分 | `coupon-*/`、`member-coupons/`、`gift-code-batches/`、`point-*/` |
| 薪资 | `salary-templates/`、`employee-salary-assignments/`、`payrolls/` |
| 财务 | `payment-accounts/`、`settlement-rules/`、`settlements/` |
| 售卡配置、订单与核销 | `settings/`、`self-service-card-orders/`、`subscriptions/`、`verifications/` |
| 展示、活动、加盟、消息 | `client-settings/`、`activities/`、`franchise-*/`、`message-batches/`、`feedback/`、`reviews/` |
| 报表 | `reports/performance/`、`reports/members/`、`reports/member-cards/` |

## 约定

- 页面直接声明自己的 endpoint，避免增加按 `resource` 切换业务的分支组件。
- `ResourcePage` 组合筛选、工具栏、表格和通用编辑抽屉。业务审批、发券、文件上传等操作留在各自页面，不放进公共列表。
- 自定义详情使用 `detail @detail="details"`，或在 `#actions` 中显式渲染按钮；公共组件不读取 Vue 内部实例来猜测业务行为。
- 需要刷新或打开编辑时，用 `ResourcePageHandle` 类型的模板引用调用 `load()`、`open(row)`。页面 composable 接收该引用，避免隐式查找组件。
- 下拉引用需要全部数据时使用 `gymApi.listAll()`；列表本身继续使用服务端分页，不能为了全选下载全部数据。
- 表格选择只针对当前页。查询、翻页、切换资源时清空；刷新后移除已经不在当前数据中的选择。允许统一修改的字段声明 `batch: true`；批量编辑仅 PATCH 所选字段，按 `editable` 校验最新状态，部分失败时只重试失败项。
- 使用 `visibleWhen` 控制类型相关字段的展示、校验和提交，`onlyEdit` 声明编辑专属字段。日期、时间、金额与百分比使用相应高级控件；百分比内部值仍为 0～1。
- 继续使用 `AdminDrawer` 承载新增、编辑和结构化详情。合并后的菜单隐藏重复入口，保留原 URL 和权限；具体合并依据见 `ENTITY-WORKFLOWS.md`。
- 文件通过带登录认证的 `requestClient` 获取 Blob，不使用未解包的 Axios 响应创建对象 URL；组件需在切换和销毁时释放 URL，并丢弃过期请求。Mock 文件为内存数据，服务重启后需重新上传。
- 售卡和展示配置有未保存修改时，先保存或还原，再切换门店 / 平台；控件按内容类型显示，提交只保留该类型相关字段。
- 表格行操作统一使用 `TableAction`，无边框、仅图标，Tooltip 与可访问名称共用 `table-actions.ts` 的操作文案；保留权限、禁用、加载和确认交互。
- 新增入口放在工具栏最左侧。业务自定义新增用 `ResourcePage` 的 `#create` 插槽，辅助工具用 `#toolbar`。
- 开关使用 `AdminSwitch`，通过 `label` 在旁边展示文字，开关内不放文字。
- 配置保存使用 `ConfigActions`，放在平台／门店选择工具栏的最右侧；不单独占一行，不使用底部悬浮栏。
- 展示正文使用 `RichContent` 封装的 Vben Tiptap，持久化为 `contentHtml`；图片保存为 `gym-file:<id>`，加载时转换为认证 Blob URL。旧区块首次加载时转成正文，原 `blocks` 保留以兼容既有接口；接入端应优先读取 `contentHtml`（包括空字符串）。

## 联动 Mock 场景

服务启动时在基础数据上调用 `demo-state.ts` 的 `seedDemo()`。包含分页会员、跨店与无账号员工、有效／过期会员卡、支付与部分退款、签到积分、满员／取消课程预约、发券成功与失败结果、消息模拟记录、工资计算及门店图片与报告 PDF。发券额度和工资使用实际 Mock 业务函数计算，便于验证详情、筛选、报表和权限联动。

测试中的 `reset()` 保留最小基础数据；需要丰富场景时显式调用 `seedDemo()`。全部数据与上传文件仅在内存中，重启后恢复示例，不发送真实消息。

## 验证

在仓库根目录运行：

```sh
pnpm exec vitest run apps/web-antd/src/views/gym apps/web-antd/src/api/gym-files.test.ts apps/backend-mock/utils/gym
pnpm --filter @vben/web-antd typecheck
pnpm --filter @vben/web-antd build
```

提交前仍需通过仓库的格式、ESLint、Stylelint 和 Oxlint 检查。

## 业务页面间距规范

统一变量位于 `layout.css`，页面与通过 Teleport 渲染的抽屉共用。

| 用途                     | CSS 变量              | 桌面 | ≤ 640px |
| ------------------------ | --------------------- | ---- | ------- |
| 页面四周留白             | `--gym-page-padding`  | 20px | 12px    |
| 卡片、筛选区、抽屉内边距 | `--gym-card-padding`  | 20px | 16px    |
| 卡片、页面区块间距       | `--gym-space-block`   | 20px | 16px    |
| 表单字段间距             | `--gym-space-field`   | 16px | 16px    |
| 工具栏、操作按钮间距     | `--gym-space-action`  | 12px | 8px     |
| 紧凑控件、图标与文字     | `--gym-space-compact` | 8px  | 8px     |

### 使用方式

- 页面使用 `AdminPage`，标题、筛选区、工具栏、汇总、表格由公共容器提供间距。
- 嵌套卡片和区块使用 `gym-stack`；不要再给直接子元素添加 `mt-*`、`mb-*` 或 `my-*`。
- 字段或上传控件的纵向组合使用 `gym-form-stack`，动态规则使用 `gym-rule-card`。
- 操作组使用 `gym-toolbar`，允许自动换行；表格行内操作继续使用 Ant Design 的 `Space`。
- `AdminDrawer` 的内容已包含 `gym-stack`，抽屉表单自动使用字段间距。
- 网格卡片使用 `gap: var(--gym-space-block)`；字段网格使用 `gap: var(--gym-space-field)`，并清除网格字段自带的下边距。
- Tab 内嵌套的列表页复用外层留白，不重复添加页面 padding。

间距由父容器的 `gap` 负责，避免组件自身的 margin 重置使卡片贴合，也避免 gap 与 margin 重复叠加。不要给所有卡片统一添加外边距；并排布局和纵向布局均应在各自容器中指定 gap。
