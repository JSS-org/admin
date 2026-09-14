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
| PDF / 图片 / 视频统一预览 | `components/file-preview.vue`、`src/api/file-preview-state.ts`；布局挂载预览抽屉，`openGymFile()` 打开 |
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

## 验证

在仓库根目录运行：

```sh
pnpm exec vitest run apps/web-antd/src/views/gym apps/web-antd/src/api/gym-files.test.ts apps/backend-mock/utils/gym
pnpm --filter @vben/web-antd typecheck
pnpm --filter @vben/web-antd build
```

提交前仍需通过仓库的格式、ESLint、Stylelint 和 Oxlint 检查。
