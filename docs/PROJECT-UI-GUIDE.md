# 后台组件库使用规范：JSS Admin 风格

版本：1.0 · 基于本仓库提交 `e50507a`

适用对象：采用本项目视觉与交互风格的新后台项目，以及维护这些页面的设计、前端、测试人员。

这套风格的核心是：**浅色工作台、清晰分区、统一间距、紧凑表格操作、稳定的编辑布局和可追踪的状态反馈。**

本文中的“应／不要”是迁移后应遵守的规范；标注“当前实现”的数值与 API 对应本仓库源码。标注“迁移建议”的内容需要在目标项目中实现。

## 1. 使用范围与技术基础

当前实现基于 Vue 3、TypeScript、Vben Admin、Ant Design Vue、Tailwind CSS，以及 Vben Tiptap 插件。仓库声明版本为 Vue `^3.5.40`、Ant Design Vue `^4.2.6`、Tailwind CSS `^4.3.3`；这些是本项目依赖范围，不是其他项目必须锁定的版本。

本项目的业务组件位于 `apps/web-antd/src/views/gym/components/`，**目前是源码组件集合，没有发布成可直接安装的独立组件包**。`@vben/*` 在本仓库中也使用 workspace 依赖，不能只复制 import 就认为完成了接入。

### 1.1 两种复用方式

| 目标项目 | 复用方式 | 必须处理的事项 |
| --- | --- | --- |
| Vue + Vben + Ant Design Vue | 迁移公共组件、样式与必要 composable | 替换业务 API、权限、路由、文件服务和路径别名 |
| 其他框架或组件库 | 按本文重建同等组件契约与布局 | 映射设计变量、组件状态、键盘交互和滚动容器；不直接复制 Vue 模板 |

建议先迁移 `AdminPage`、`AdminDrawer`、`AdminSwitch`、`TableAction`、`ConfigActions`，验证一个真实页面后，再迁移 `ResourcePage` 和富文本／文件能力。

### 1.2 建议的目标目录

以下是迁移后的建议结构，不是本仓库现有路径：

```text
src/
  ui/admin/
    admin-page.vue
    admin-drawer.vue
    admin-switch.vue
    table-action.vue
    table-actions.ts
    config-actions.vue
    resource-page.vue
    resource-form.vue
    file-media.vue
    file-preview.vue
    rich-content.vue
    composables/
    tokens.css
    layout.css
  services/
    resources.ts
    permissions.ts
    files.ts
  views/<业务名>/
    index.vue
    data.ts
    use-page.ts
```

本文示例保留 `gym-*` 类名，便于对照和迁移源码。目标项目可以一次性替换为自己的统一前缀，组件模板与 CSS 必须同步替换。

## 2. 视觉基础

### 2.1 页面风格

- 使用浅色页面底、卡片表面和细边框建立层次；强调色用于主要操作、选中和进行中状态。
- 页面只设一个主标题。复杂页面可以增加一行简短说明，解释用户能完成什么。
- 不为每一行字段增加卡片。按用户任务分组，例如“基础信息”“内容编排”“关联记录”。
- 常规卡片以边框分隔为主，避免多层重阴影。手机样式预览等模拟容器可以有独立外框。
- 品牌背景属于应用壳层的可选装饰，不写进基础组件，也不能削弱文字与控件的可读性。
- 当前应用默认使用亮色主题。迁移到暗色主题时，应通过主题变量适配并重新验收，不直接把白色替换成黑色。

### 2.2 颜色变量

组件使用语义变量，不直接绑定某个品牌的色值：

| 变量                 | 用途                     |
| -------------------- | ------------------------ |
| `--background`       | 页面底色                 |
| `--card`             | 卡片、表格、预览容器表面 |
| `--foreground`       | 标题、主要文字           |
| `--muted`            | 表头、弱分区背景         |
| `--muted-foreground` | 描述、单位、辅助说明     |
| `--border`           | 卡片、表格、分隔边框     |
| `--primary`          | 主操作、选中、重点信息   |
| `--radius`           | 通用组件圆角             |

当前 CSS 使用 `hsl(var(--card))` 这种写法，变量值应是 HSL 通道值。目标项目若使用 HEX 或 `oklch()` 完整颜色值，要统一调整消费方式，不能直接把完整颜色字符串放进 `hsl()`。

成功、警告、错误、处理中优先使用组件库的语义颜色。状态必须同时显示文字，不能只靠颜色区分。

### 2.3 字号、尺寸与圆角

| 场景           | 当前实现                                  |
| -------------- | ----------------------------------------- |
| 页面标题       | 22px、字重 650、行高 1.5；≤ 640px 时 20px |
| 页面说明       | 14px、行高 1.7                            |
| 常规控件与标签 | 遵循组件库默认字号；开关旁标签为 14px     |
| 次要状态与提示 | 12px                                      |
| 行操作图标     | 16px；按钮区域 32 × 32px                  |
| 表格单元格     | 上下 padding 14px                         |
| 表格外框       | 1px 边框、10px 圆角                       |
| 动态规则卡     | 1px 边框、8px 圆角                        |
| 普通卡片／表单 | 使用主题圆角或组件库默认值                |

迁移建议：主要面向触屏的产品应扩大图标操作的点击区域，例如 44 × 44px，并调整整行密度。32px 是本项目桌面表格规格，不是所有设备的统一目标。

## 3. 间距规范

### 3.1 统一数值

| 用途                     | 当前变量              | 桌面 | ≤ 640px |
| ------------------------ | --------------------- | ---- | ------- |
| 页面四周留白             | `--gym-page-padding`  | 20px | 12px    |
| 卡片、筛选区、抽屉内边距 | `--gym-card-padding`  | 20px | 16px    |
| 卡片／页面区块之间       | `--gym-space-block`   | 20px | 16px    |
| 表单字段之间             | `--gym-space-field`   | 16px | 16px    |
| 工具栏操作之间           | `--gym-space-action`  | 12px | 8px     |
| 图标、文字等紧凑组合     | `--gym-space-compact` | 8px  | 8px     |

不要在业务页面随意创造新的通用间距档位。文字排版、图标微调等局部间距可以保留组件内部规格。

### 3.2 谁负责间距

**父容器负责子区块之间的 gap，组件负责自己的内边距。**

| 容器               | 使用场景                             |
| ------------------ | ------------------------------------ |
| `gym-stack`        | 卡片、关联记录、页面区块纵向排列     |
| `gym-form-stack`   | 字段、上传控件、表单内子区块纵向排列 |
| `gym-toolbar`      | 横向工具栏，允许在窄屏换行           |
| `gym-rule-card`    | 一组可新增、移除的配置规则           |
| Ant Design `Space` | 表格行内图标操作组                   |

```vue
<div class="gym-stack">
  <Card title="基础信息">...</Card>
  <Card title="关联记录">...</Card>
</div>
```

- 已有父级 gap 时，不给这些直接子卡片再添加 `mt-*`、`mb-*`、`my-*`。
- 不给所有 `.ant-card` 统一添加 margin；并排与纵向排列都应由对应父容器控制。
- 网格字段使用字段 gap，同时去掉字段组件自带的下边距，避免叠加。
- Tab 中嵌套列表页时，共用外层留白，不重复增加页面 padding。
- Teleport 到 body 的抽屉也要加载同一套变量和 `.gym-dialog` 样式，不能只依赖页面 scoped CSS。
- `min-width: 0` 用于避免子内容撑宽；需要内部滚动时，沿高度链补齐 `min-height: 0`。

## 4. 页面结构与操作位置

### 4.1 标准列表页

```text
页面标题 + 可选说明
筛选条件                                      查询 / 重置
新增 | 全选本页 | 清空选择 | 已选数量 | 批量操作       刷新列表
可选汇总信息
数据表格                                      操作列
分页与总数
```

- 新增入口始终在工具栏最左侧。不要插到“全选本页”后面。
- “刷新列表”位于工具栏右侧。筛选与分页保持原有语义。
- 筛选字段先编辑草稿，再通过“查询”应用。重置清空筛选并回到第一页。
- 查询、翻页、切换资源后清空选择。全选只覆盖当前页，文案必须是“全选本页”。
- 批量操作不能为了实现全选而下载全部记录。
- 详情中需要分页的关联表使用独立的列表状态，避免与主表分页互相影响。

### 4.2 配置页

```text
页面标题 + 可选说明
平台 / 门店 / 配置类型           未保存 · 还原更改 · 保存配置
配置内容                        可选的固定高度草稿预览
```

- 保存和还原与范围选择放在同一行，整体靠右；窄屏允许自然换行。
- 配置操作不使用底部悬浮栏，也不单独包一整行保存卡片。
- 未保存时显示轻量“未保存”标记；Tooltip 展示为什么不能切换范围。
- 提示位置预留空间，避免从已同步切换到未保存时造成按钮移动或高度变化。
- 未保存提示不使用单独占一行的 Alert。加载失败等需要处理的错误仍可使用 Alert。

### 4.3 操作层级

| 操作类型     | 样式与位置                                      |
| ------------ | ----------------------------------------------- |
| 页面主要任务 | 带文字的 primary 按钮，例如“新增模板”“保存配置” |
| 页面辅助任务 | 普通文字按钮，例如“还原更改”“刷新列表”          |
| 表格行内操作 | 无边框、仅图标、带 Tooltip                      |
| 破坏性行操作 | 图标按钮增加 danger，必要时弹出确认             |
| 查看完整文件 | 打开后台内部标签页                              |

无文字按钮规范只应用于行内操作等紧凑场景；不要把页面新增、保存、查询也改成难以辨认的图标。

## 5. 组件选择与契约

### 5.1 组件清单

| 组件                    | 责任                           | 何时使用                         |
| ----------------------- | ------------------------------ | -------------------------------- |
| `AdminPage`             | 标题、说明、页面留白           | 所有业务页面的外层               |
| `ResourcePage`          | 筛选、分页、选择、通用新增编辑 | 标准数据管理列表                 |
| `FilterBar`             | 筛选条件草稿与查询入口         | 自定义列表或 `ResourcePage` 内部 |
| `ResourceForm`          | 根据字段定义渲染和校验表单     | 字段驱动的新增编辑               |
| `AdminDrawer`           | 右侧编辑或结构化详情面板       | 新增、编辑、审批、关联详情       |
| `TableAction`           | 行操作图标、文案、状态         | 所有表格 actions                 |
| `TableSelectionActions` | 当前页选择和数量               | 表格批量操作工具栏               |
| `EntityRecords`         | 实体详情里的关联分页表         | 订单记录、历史版本、关联关系等   |
| `AdminSwitch`           | 无内部文字的开关及旁边标签     | 布尔配置字段                     |
| `ConfigActions`         | 未保存标记、还原、保存         | 有范围选择的配置页               |
| `FileUpload`            | 上传、文件状态与预览入口       | 图片、视频、PDF 表单字段         |
| `FileMedia`             | 行内缩略图与完整预览入口       | 封面、媒体列表、草稿缩略图       |
| `file-preview.vue`      | 独立标签页的完整文件显示       | PDF、图片、视频完整查看          |
| `RichContent`           | 富文本编排及只读展示           | 标题、列表、图片、链接等正文     |

### 5.2 主要 API

下表为当前实现。事件处理、数据获取和权限判断由页面或服务层提供。

| 组件 | 输入 | 输出／插槽 |
| --- | --- | --- |
| `AdminPage` | `title`、`description?` | 默认插槽；`#actions` 为独立动作区，适合文件下载等，不用于配置保存行 |
| `AdminDrawer` | `v-model:open`、`title?`、`width?`、`confirmLoading?`、`okButtonProps?`、`destroyOnClose?`、`footer?: null` | `@ok`；默认内容插槽 |
| `TableAction` | `action`、`label?`、`disabled?`、`loading?`、`danger?` | 按钮事件通过 attrs 转发，例如 `@click` |
| `AdminSwitch` | `v-model:checked`、`label` | `disabled` 等 attrs 转发给底层 Switch |
| `ConfigActions` | `dirty`、`busy`、`saving`、`pendingHint`、`error?` | `@restore`、`@save` |
| `FileUpload` | `v-model` 文件 ID、`category`、`storeId?`、`disabled?`、`title?` | `@uploading(boolean)` |
| `FileMedia` | `fileId?`、`kind?: 'image' \| 'video'`、`alt?` | 点击进入完整文件预览 |
| `RichContent` | `v-model` HTML、`editable?`、`disabled?`、`storeId?` | `@uploading(boolean)` |
| `EntityRecords` | `endpoint`、`params`、`columns` | 自行加载关联列表和分页 |

`AdminPage` 的 `auto-content-height` 来自其根节点 Vben `Page` 的属性透传，不是另一个自定义布局实现。迁移时应保留这一透传能力，或明确重新声明对应属性。

## 6. 表格操作规范

### 6.1 统一图标与文案

以下为跨项目优先保留的动作字典；行业专属动作在目标项目另行扩展。

| action    | Tooltip 文案 | 图标                  |
| --------- | ------------ | --------------------- |
| `detail`  | 查看详情     | `lucide:eye`          |
| `edit`    | 编辑         | `lucide:pencil`       |
| `preview` | 预览文件     | `lucide:file-search`  |
| `version` | 创建新版本   | `lucide:copy-plus`    |
| `publish` | 发布         | `lucide:send`         |
| `enable`  | 启用         | `lucide:circle-check` |
| `disable` | 停用         | `lucide:circle-off`   |
| `remove`  | 移除         | `lucide:trash-2`      |
| `cancel`  | 取消         | `lucide:circle-x`     |
| `results` | 查看执行结果 | `lucide:list-checks`  |
| `replace` | 替换文件     | `lucide:file-up`      |

- 同一操作共用字典，不在不同表中分别写“查看”“详情”“详情信息”。
- 可以用 `label` 补足对象，例如“取消预约”，但不要改变动作本身的含义。
- “停用”“移除”“删除”表示不同结果，不为表面统一而互换。目标项目需要删除动作时，应新增明确的字典项。
- Tooltip 文案和 `aria-label` 保持一致；装饰图标本身不重复朗读。
- 权限不足时由业务层隐藏入口；暂时不可用时使用 disabled，并按业务需要提供原因。
- 按钮的 loading、disabled、danger 和确认交互必须保留。

### 6.2 使用示例

以下为页面模板片段，`row`、`canEdit`、`edit`、`cancel` 等来自目标页面。

```vue
<Space wrap>
  <TableAction v-if="canEdit" action="edit" @click="edit(row)" />
  <TableAction action="detail" @click="showDetail(row)" />
  <Popconfirm
    :title="`确认取消 ${row.name} 的预约？`"
    ok-text="确认取消"
    cancel-text="保留预约"
    :disabled="cancelling"
    @confirm="cancel(row)"
  >
    <TableAction action="cancel" label="取消预约" danger :loading="cancelling" />
  </Popconfirm>
</Space>
```

当前公共操作列默认宽 240px。目标项目可以按实际动作数量调整，但应在同类表之间保持一致，并在窄屏保留表格横向滚动。

## 7. ResourcePage 使用规范

当前 `ResourcePage` 必填 `title`、`endpoint`、`fields`、`columns`。默认允许新增／编辑，但只有提供有效 `writeCode` 且权限检查通过才显示写操作。

| 扩展点 | 用途 |
| --- | --- |
| `#create`，提供 `reload` | 最左侧的业务自定义新增；使用时通常设置 `:create="false"` 避免重复入口 |
| `#toolbar`，提供 `reload`、`selectedRows`、`selectedRowKeys` | 辅助工具、批量操作 |
| `#actions`，提供 `row`、`reload` | 行内业务操作 |
| `#summary`，提供 `data` | 接口返回的汇总信息 |
| `#editor-extra`，提供 `row`、`form`、`saving` | 编辑抽屉中的附加内容 |
| `detail` + `@detail` | 自定义详情入口 |
| `loadDetail` | 打开编辑前获取完整数据 |
| `initial`／`prepare` | 编辑初值转换／提交数据转换 |
| `editable(row)` | 根据记录状态决定是否可编辑 |
| `@changed`／`@saved` | 变更通知／保存结果 |

通过 `ResourcePageHandle` 调用 `load()`、`open(row?)`，或读取公开的 `items`。不要通过 Vue 内部实例猜测组件行为。

```vue
<ResourcePage
  ref="page"
  title="内容模板"
  endpoint="content-templates"
  :fields="fields"
  :columns="columns"
  write-code="content:write"
  :create="false"
  detail
  @detail="showDetail"
>
  <template #create>
    <Button v-if="canCreate" type="primary" @click="openCreate">新增模板</Button>
  </template>
  <template #actions="{ row }">
    <TableAction action="preview" @click="preview(row)" />
  </template>
</ResourcePage>
```

此示例的 endpoint 与权限码是迁移示意，不是本仓库现有接口。

## 8. 表单、抽屉与开关

### 8.1 表单

- 默认采用纵向 label，必填项显示必填标识；placeholder 用于例子和格式提示，不替代 label。
- 日期、时间、金额、百分比使用相应专用控件，不用一个普通文本框处理所有类型。
- 当前字段类型支持 `text`、`textarea`、`password`、`number`、`money`、`percent`、`date`、`datetime`、`time`、`select`、`multi`、`tags`。
- 条件字段使用 `visibleWhen` 同时控制展示、校验与提交；不要提交当前类型不适用的旧值。
- `immutable` 用于不可修改字段，`onlyEdit` 用于编辑专属字段，`batch` 用于明确允许批量编辑的字段。
- 当前百分比内部用 0～1。迁移时应明确目标 API 的单位，避免把 20% 错传成 20 或 0.002。
- 下拉列表优先使用稳定 ID 作为值。选项请求只在数据源或范围确实变化时重新加载，不因表单对象更新而清空已加载选项。

### 8.2 抽屉

- 新增、编辑及结构化详情统一使用右侧 `AdminDrawer`。
- 当前默认宽度 640px，复杂详情可指定更宽数值；实际宽度限制为不超过 `100vw`。
- 默认底部右侧为“取消／确定”。只读详情使用 `:footer="null"`。
- 保存中禁止重复提交，并锁定遮罩、Esc 和关闭按钮，避免保存过程中关闭面板。
- 内容分组使用抽屉自带的 `gym-stack`。字段用表单间距，关联表保留独立区块间距。

```vue
<AdminDrawer v-model:open="editorOpen" title="编辑资料" :confirm-loading="saving" destroy-on-close @ok="save">
  <Form layout="vertical" :disabled="saving">
    <FormItem label="名称" required><Input v-model:value="form.name" /></FormItem>
    <FormItem label="展示状态">
      <AdminSwitch v-model:checked="form.enabled" label="启用展示" />
    </FormItem>
  </Form>
</AdminDrawer>
```

### 8.3 开关

- 开关内部不放“是／否”“开／关”“启用／停用”等文字。
- 在旁边放业务 label，例如“启用展示”“购卡须签约”。标签应说明控制对象。
- 标签通过 `for` 与开关 ID 关联，点击标签可操作开关；同时提供可访问名称。
- 配置表单里的切换默认修改草稿，由“保存配置”统一提交。需要即时生效的开关，应在目标业务中明确说明，并处理失败恢复。

## 9. 配置状态与工具栏

### 9.1 状态规则

| 状态 | 范围选择 | 未保存标记 | 还原 | 保存 |
| --- | --- | --- | --- | --- |
| 已同步 | 可用 | 隐藏但保留占位 | 禁用 | 禁用 |
| 有修改 | 禁用 | 显示，提供完整 Tooltip | 可用 | 可用 |
| 加载／保存／上传中 | 禁用 | 由 dirty 决定 | 禁用 | 禁用；保存时显示 loading |
| 加载失败 | 按页面错误恢复流程处理 | 不表示已经同步 | 当前组件按 `busy`／`dirty` 决定 | 禁用 |

`busy` 应覆盖加载、保存和上传，`saving` 只表示保存请求。`dirty` 通过当前数据与最后一次成功加载／保存的快照比较，不通过“是否聚焦过输入框”判断。

```vue
<div class="gym-toolbar">
  <Segmented v-model:value="platform" :options="platforms" :disabled="busy || dirty" />
  <Select v-model:value="scopeId" :options="scopes" :disabled="busy || dirty" />
  <ConfigActions
    :dirty="dirty"
    :busy="busy"
    :saving="saving"
    :error="error"
    pending-hint="有未保存的更改，保存或还原后可切换平台和所属组织。"
    @restore="restore"
    @save="save"
  />
</div>
```

`ConfigActions` 通过 `margin-inline-start: auto` 靠右；它应直接处于横向 flex 工具栏内。不要给工具栏额外添加一个空白占位按钮。

### 9.2 保存与还原

1. 加载成功后建立快照。
2. 用户修改时显示“未保存”，保持工具栏和内容高度稳定。
3. 保存前校验；请求中禁用重复操作。
4. 保存成功后更新数据与快照；失败则保留当前输入，允许修正后重试。
5. 还原恢复快照并清除 dirty，不额外写入服务端。

当前实现限制的是页面内平台／门店／类型选择。离开路由、关闭标签页、关闭浏览器时的未保存保护，需要目标项目另行设计，不应假定 `ConfigActions` 已覆盖这些行为。

## 10. 草稿预览与富文本

### 10.1 预览容器

桌面端采用编辑区与预览区两列。预览区占满剩余可用高度，正文在内部滚动，不能随着内容长度无限增高。

```text
有确定高度的页面
└─ 标题与工具栏：自然高度，不收缩
   └─ 剩余内容区：flex: 1; min-height: 0
      ├─ 编辑区：内部滚动
      └─ 草稿预览：height: 100%; min-height: 0
         ├─ 预览标题：不收缩
         ├─ 手机外框：flex: 1; min-height: 0
         │  ├─ 应用标题：不收缩
         │  └─ 正文：overflow-y: auto
         └─ 简短说明：自然高度
```

仅写 `height: 100%` 不够，父级必须有确定高度。Vben 项目可使用 `Page auto-content-height`；其他项目应从应用内容区建立相同的高度约束。

核心 CSS，类名按目标结构对应：

```css
.workspace {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 340px;
  grid-template-rows: minmax(0, 1fr);
  gap: var(--gym-space-block);
  min-height: 0;
}

.preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.preview-frame {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.preview-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
```

当前实现 ≤ 1100px 改为单列，整个内容区可滚动；预览区高度为 `min(700px, 80dvh)`。这个断点用于编辑器和预览的组合，不替代全项目的 640px 间距断点。

### 10.2 富文本

- 使用内置 Vben Tiptap 统一编排标题、段落、列表、图片、链接，不再维护平行的自定义区块编辑器。
- `editable` 表示编辑／只读模式；`disabled` 表示暂时不可操作。上传中只禁用编辑，不通过切换模式让工具栏和高度消失。
- 编辑内容存为 HTML；当前字段为 `contentHtml`。空字符串表示明确清空正文，不能被旧内容回退逻辑覆盖。
- 当前上传图片保存为 `gym-file:<id>` 引用，加载时换成经过认证的 Blob URL；不要把临时 `blob:` 地址存进数据库。
- 多文件上传要用计数或等价状态聚合；第一张完成时不能提前解除整页 busy。
- 外部数据回填与本地输入更新分开处理，不能每敲一个字就重新灌入编辑器、移动光标。
- 当前对 Tiptap 的修正使用 `setEditable(editable, false)`，避免切换可编辑状态时发出内容更新、覆盖正在加载的正文。迁移插件时应检查是否保留等价行为。
- 只读预览应通过编辑器支持的结构渲染。接入其他展示端时，应明确允许的 HTML 标签、属性和链接协议，不直接信任任意 HTML。

```vue
<RichContent v-model="form.contentHtml" :disabled="busy" @uploading="uploading = $event" />
<RichContent :model-value="form.contentHtml" :editable="false" />
```

旧数据迁移时应保留必要的原始字段，建立明确的读写优先级。本项目优先读取 `contentHtml`，缺失时才转换旧 `blocks`；其他项目不必携带没有业务用途的兼容层。

## 11. 上传与完整文件预览

- 页面或抽屉内可显示缩略图；完整 PDF、图片、视频使用后台内部标签页。
- 内部预览路由以文件 ID 区分，标签标题显示文件名。多个文件可同时保留，切换后仍能读取。
- 图片缩略图关闭 Ant Design 的默认弹层预览，点击统一进入内部标签页。
- PDF 可以在该专用预览页使用 iframe；规则限制的是把完整查看器塞进业务表单或弹层，不是禁止预览页内使用 iframe。
- 视频在专用预览页播放；不要在表格单元格中放完整播放器。
- 文件通过认证的请求层取得 Blob。切换文件、销毁组件时释放对象 URL，丢弃过期请求结果。
- 加载失败展示可理解的错误与重试入口；不要仅留一片空白。

当前文件服务主要使用这些数据：`id`、`originalName`、`mimeType`、`byteSize`、`category`；目标服务可以采用自己的字段，但要在适配层映射。

当前上传限制：图片 JPG／PNG 10MB，视频 MP4 200MB，合同 PDF 20MB。这是本项目业务限制，迁移时应与目标服务端一致，不当作设计系统的固定限制。

没有 Vben 标签系统的项目，可以实现等价的应用内文档页／标签机制；不要把“调用 `window.open()`”当作相同交互。

## 12. 状态反馈、权限与可访问性

| 场景         | 表现                                   |
| ------------ | -------------------------------------- |
| 初次加载配置 | Skeleton，保持页面分区可辨认           |
| 表格刷新     | 表格 loading，查询条件保留             |
| 保存成功     | 简短成功提示，并更新快照／记录         |
| 无数据       | Empty，解释“暂无记录”                  |
| 查询无结果   | Empty，说明无匹配记录，提供清空筛选    |
| 加载失败     | Alert + 重试，明确失败而不是假装无数据 |
| 未保存       | 操作行内的小标记 + Tooltip             |
| 批量部分失败 | 展示失败项及原因，只重试失败项         |

- 不用长时间 Toast 承载需要用户处理的详细错误。
- 金额显示单位，时间按明确时区格式化；未知／未填写值使用 `—`，不要让真实的 0 被空值逻辑吞掉。
- 同类状态文字与颜色共用映射；领域特有状态在业务层定义，不硬套其他行业的字典。
- 前端入口权限与后端数据权限配合。隐藏按钮不能替代服务端鉴权。
- 图标操作、开关、滚动预览、上传入口要有可访问名称；键盘能到达 Tooltip 提示和主要操作。
- 禁用按钮仍应能通过合适的外层触发点查看提示。保存中不能重复触发操作。
- 图片提供 alt，文件 iframe 提供 title；内容区的 Tab 顺序应符合页面阅读顺序。

## 13. 跨项目迁移清单

### 13.1 可以直接提取与必须适配的部分

| 部分 | 迁移动作 |
| --- | --- |
| 间距、排版、父级布局规则 | 提取变量和基础 CSS；统一前缀，确保样式只作用于自己的页面／抽屉 |
| Page／Drawer／Switch／Action／ConfigActions | 复制组件并替换 import；检查 Vue、组件库与 Tailwind 支持 |
| `ResourcePage` | 一并迁移其表单、筛选、选择、批量组件和 composable，或用目标项目现有列表实现同样契约 |
| `gymApi` | 改成目标资源服务，适配列表分页、详情、写入、错误格式 |
| `canGym`、`writeCode` | 改成目标权限服务与权限码 |
| `GymRow`、`storeId`、`storeFilter` | 改成目标实体类型和组织／租户范围；不要把“门店”写死到通用组件 |
| `displayValue` 与动作字典 | 保留通用显示规则，替换会员、课程、工资等行业状态和操作 |
| 文件 URL 与预览导航 | 对接认证下载、元数据、对象 URL 生命周期和内部标签路由 |
| 富文本 | 接入插件依赖、上传适配、HTML 渲染规则和持久化引用格式 |
| Mock | 按目标业务建立有关联、可重复初始化的样例；不复制本项目业务权限和真实业务假设 |

迁移完整 `ResourcePage` 时，列表至少需要 `{ items, total }`，行有稳定 `id`；分页参数需要与 `page`／`pageSize` 对齐。目标 API 若返回其他结构，在服务层转换，不让每个页面各写一套解包逻辑。

### 13.2 接入顺序

1. 建立主题变量、全局组件库样式、业务布局样式的加载顺序。当前仓库先加载 `@vben/styles` 与 `@vben/styles/antd`，再加载业务 `layout.css`。
2. 确认 Tailwind 扫描迁移后的组件目录；独立包中的类名也必须被扫描，或提供已编译样式。
3. 迁移五个基础包装组件，完成一个列表页和一个配置页。
4. 替换路径别名、图标来源、权限和资源 API；初始化所需的语言包、主题与路由依赖。
5. 接入文件与富文本，再验证刷新页面、切换标签和上传完成后的持久化结果。
6. 用关联 Mock 覆盖成功、失败、空数据、禁用、部分成功及跨范围隔离。
7. 按下一节验收，通过后再推广到其他页面。

## 14. 验收标准

### 视觉与布局

- [ ] 页面、卡片、字段、操作组使用统一间距，没有贴合或双倍留白。
- [ ] 新增入口靠左；配置选择与还原／保存在同一工具栏，按钮靠右。
- [ ] 行操作全部为无边框图标，Tooltip 文案一致。
- [ ] 开关旁有业务标签，内部没有文字。
- [ ] 未保存标记出现／消失时，按钮位置与内容区高度保持稳定。
- [ ] 长正文、长文件名、长字段值不会撑宽页面；表格只在自身容器横向滚动。
- [ ] 草稿预览内部滚动，标题与外框高度稳定。
- [ ] 桌面、约 1100px 和 ≤ 640px 布局均检查；如启用暗色主题，单独检查对比度。

### 交互与数据

- [ ] 编辑打开后字段与下拉选项稳定，无明显闪烁；旧请求不会覆盖新选择。
- [ ] 查询、翻页和全选本页行为一致；批量失败可定位和重试。
- [ ] 新增、详情、编辑、发布、取消等入口权限和确认行为正确。
- [ ] 配置未保存时不能切换范围；还原不写服务端，保存失败不丢输入。
- [ ] 富文本输入不移动光标；保存后刷新仍保留格式和图片。
- [ ] 图片上传中不会提前允许保存，数据库中没有临时 Blob URL。
- [ ] PDF／图片／视频完整预览进入内部标签页；切换与重试可用。
- [ ] 键盘能操作主要控件并获取 Tooltip 说明；状态不只靠颜色表达。

### 工程检查

- [ ] 类型、Lint、格式和构建通过。
- [ ] 对异步竞态、权限隔离、数据转换与业务联动做针对性测试。
- [ ] 纯间距、文案等低影响改动以视觉与交互验收为主，不编写只复述实现的测试。

## 附录：本仓库参考入口

这些链接用于核对实现。单独复制本文到其他项目时，正文仍可作为规范使用，但源码相对链接需改为原仓库链接或随文迁移的源码位置。

| 内容 | 源码 |
| --- | --- |
| 页面维护说明 | [Gym README](../apps/web-antd/src/views/gym/README.md) |
| 间距与全局布局 | [layout.css](../apps/web-antd/src/views/gym/layout.css) |
| 页面包装 | [admin-page.vue](../apps/web-antd/src/views/gym/components/admin-page.vue) |
| 抽屉 | [admin-drawer.vue](../apps/web-antd/src/views/gym/components/admin-drawer.vue) |
| 行操作与字典 | [table-action.vue](../apps/web-antd/src/views/gym/components/table-action.vue)、[table-actions.ts](../apps/web-antd/src/views/gym/components/table-actions.ts) |
| 开关与配置工具栏 | [admin-switch.vue](../apps/web-antd/src/views/gym/components/admin-switch.vue)、[config-actions.vue](../apps/web-antd/src/views/gym/components/config-actions.vue) |
| 列表与类型 | [resource-page.vue](../apps/web-antd/src/views/gym/components/resource-page.vue)、[types.ts](../apps/web-antd/src/views/gym/types.ts) |
| 固定高度预览示例 | [client-settings/index.vue](../apps/web-antd/src/views/gym/client-settings/index.vue) |
| 富文本适配 | [rich-content.vue](../apps/web-antd/src/views/gym/components/rich-content.vue) |
| 内部文件预览 | [file-preview.vue](../apps/web-antd/src/views/gym/components/file-preview.vue) |
| 主题默认变量 | [default.css](../packages/@core/base/design/src/design-tokens/default.css) |
| 本项目依赖范围 | [pnpm-workspace.yaml](../pnpm-workspace.yaml) |
