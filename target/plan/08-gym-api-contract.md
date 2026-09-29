# 08 · gym 模块 API 契约（进度：设计稿）

> 目的：为 `yudao-module-gym` 定义管理端 REST 契约，供后端实现、前端适配层对齐。**本文件是可执行的接口约定，不是已实现的接口。**
> 契约基于旧原型 `apps/web-antd` 页面实际调用的资源面（`endpoint=` 与 `gymApi.*`）整理，业务字段以各页面 `data.ts` / 旧 `target/design/02-database-design.md` 为参考。

## 1. 通用约定

| 项 | 约定 |
| --- | --- |
| 基础前缀 | 管理端 `/admin-api/gym`；会员端 `/app-api/gym` |
| 响应包 | `{ code: 0, data, msg }`，成功 `code=0`（与 yudao 一致） |
| 鉴权 | Bearer accessToken（`/admin-api/system/auth/*` 签发） |
| 分页 | 请求 `pageNo`、`pageSize`；响应 `{ list, total }` |
| 数据范围 | 门店=部门（`system_dept`）；总部角色全量，门店角色限本部门；服务端构造 Scope，禁止请求体覆盖 |
| 权限 | 每个接口 `@PreAuthorize("@ss.hasPermission('<权限码>')")`；权限码规范见 `09-permissions.md` |
| 金额 | 最小货币单位整数运算，DB `decimal/numeric`；HTTP 用十进制字符串 |
| 时间 | ISO-8601 字符串 |
| 幂等 | 批量/异步写接口接受 `Idempotency-Key` 请求头；服务端按键去重 |
| 文件 | `POST /admin-api/infra/file/upload` 返回 URL；私有文件走鉴权下载，不暴露公开静态地址 |

## 2. 标准 CRUD 端点

对每个资源 `{res}`：

| 动作 | 方法与路径 | 说明 |
| --- | --- | --- |
| 分页 | `GET /admin-api/gym/{res}/page` | 参数 `pageNo/pageSize` + 过滤字段；返回 `{list,total}` |
| 详情 | `GET /admin-api/gym/{res}/get?id=` | |
| 新增 | `POST /admin-api/gym/{res}/create` | |
| 修改 | `PUT /admin-api/gym/{res}/update` | body 含 `id` |
| 删除 | `DELETE /admin-api/gym/{res}/delete?id=` | 软删除优先 |

> 前端页面调用的是 RESTful 风格（`gymApi.list('members')`、`gymApi.get('members/1')`、`gymApi.patch('members/1')`、`gymApi.post('members')`），由 `apps/web-antd/src/api/backend/gym-adapter.ts` 翻译为上述 yudao 风格。**适配层需按本契约更新**。

## 3. 资源清单

状态：`纳入` = 合同 R 范围内；`冻结` = 合同外，隐藏不投入（D-03）。

### 3.1 组织与账号

| 资源 | 中文 | 权限码 | 特殊端点 | 状态 |
| --- | --- | --- | --- | --- |
| `stores` | 门店 | `gym:stores:read/write` | `PUT stores/{id}/media`（环境媒体）；`GET/PUT stores/{id}/settlement-rules` | 纳入 R29/R37 |
| `employees` | 员工资料 | `gym:employees:read/write` | `POST employees/{id}/account`（创建登录账号） | 纳入 R31 |
| `accounts` | 员工账号 | `gym:accounts:write` | `GET/PUT accounts/{id}/roles`（角色与门店授权）；`PUT accounts/{id}/password` | 纳入 R31 |
| `roles` | 角色 | `gym:roles:read/write` | `PUT roles/{id}/permissions` | 纳入 R31 |
| `permissions` | 权限字典 | `gym:roles:read` | `GET permissions`（按 scope 返回可分配权限） | 纳入 R31 |
| `files` | 文件 | `gym:files:read/upload` | `GET files/{id}`、`GET files/{id}/content` | 纳入 R42 |

### 3.2 会员与卡

| 资源 | 中文 | 权限码 | 特殊端点 | 状态 |
| --- | --- | --- | --- | --- |
| `members` | 会员/潜客 | `gym:members:read/write` | `GET members/{id}/cards`、`GET members/{id}/course-packs` | 纳入 R04/R12/R24/R29 |
| `body-measurements` | 体测记录 | `gym:measurements:read/write` | — | 纳入 R15/R20 |
| `card-templates` | 卡种/通卡模板 | `gym:cards:read/write` | `GET/POST card-templates/{id}/versions` | 纳入 R30 |
| `blacklists` | 黑名单 | `gym:blacklists:read/write` | — | 纳入 R03/R34 |
| `settings` | 售卡与核销设置 | `gym:settings:manage` | `GET/PUT settings` | 纳入 R32 |

### 3.3 课程与到店

| 资源 | 中文 | 权限码 | 特殊端点 | 状态 |
| --- | --- | --- | --- | --- |
| `course-products` | 课程产品（私教） | `gym:courses:read/write` | — | 纳入 R08/R09 |
| `course-sessions` | 排课 | `gym:courses:read/write` | — | 纳入 R08 |
| `bookings` | 预约 | `gym:bookings:read/write` | — | 纳入 R08/R10/R36 |
| `lesson-records` | 上课/签课记录 | `gym:bookings:read/write` | — | 纳入 R10/R19/R37 |
| `checkins` | 签到记录 | `gym:checkins:read` | `GET checkins/summary` | 纳入 R10/R21/R25/R37 |

### 3.4 合同与审批

| 资源 | 中文 | 权限码 | 特殊端点 | 状态 |
| --- | --- | --- | --- | --- |
| `contract-templates` | 合同模板 | `gym:contracts:manage` | `GET/POST contract-templates/{id}/versions` | 纳入 R14/R33 |
| `contracts` | 合同记录 | `gym:contracts:read/write` | `POST contracts/{id}/reminders` | 纳入 R14/R20/R26/R33 |
| `approval-templates` | 审批模板 | `gym:approvals:templates` | `GET/POST approval-templates/{id}/versions` | 纳入 R31（yudao BPM） |
| `approvals` | 审批记录 | `gym:approvals:read/create/decide` | `POST approvals/{id}/decisions`；`GET approval-options` | 纳入 R09/R21/R25/R26 |

### 3.5 设备与到店

| 资源 | 中文 | 权限码 | 特殊端点 | 状态 |
| --- | --- | --- | --- | --- |
| `devices` | 智能设备 | `gym:devices:read/write/command` | `GET/POST devices/{id}/commands`、`GET/PUT devices/{id}/compartments` | 纳入 R27/R37（Yudao IoT） |
| `equipment` | 器械教学 | `gym:equipment:read/write` | `GET/POST/PUT/DELETE equipment/{id}/tutorials...` | 待确认（附件一未单列） |
| `qr-codes` | 小程序/APP 码 | `gym:qr:read` | — | 纳入 R37 |

### 3.6 销售与财务

| 资源 | 中文 | 权限码 | 特殊端点 | 状态 |
| --- | --- | --- | --- | --- |
| `self-service-card-orders` | 自主办卡记录 | `gym:sales:read` | — | 纳入 R38 |
| `subscriptions` | 连续包月 | `gym:subscriptions:manage` | `GET subscriptions/{id}/cycles` | 纳入 R06/R38 |
| `verifications` | 自助/团购核销 | `gym:verifications:manage` | — | 纳入 R05/R38 |
| `payment-accounts` | 收款账户 | `gym:payment:read/write` | `GET/POST payment-accounts/{id}/bindings` | 纳入 R35 |
| `settlement-rules` | 分账规则 | `gym:settlement:manage` | `GET/POST settlement-rules/{id}` | 纳入 R35 |
| `settlements` | 分账结算记录 | `gym:settlement:read` | — | 纳入 R35 |
| `salary-templates` | 薪资模板 | `gym:payroll:templates` | `GET/POST salary-templates/{id}/versions` | 纳入 R31 |
| `employee-salary-assignments` | 员工薪资关联 | `gym:payroll:templates` | — | 纳入 R31 |
| `payrolls` | 工资表 | `gym:payroll:read/calculate/confirm` | `POST payrolls/{id}/calculations` | 纳入 R21/R31/R38 |

### 3.7 内容/活动/加盟

| 资源 | 中文 | 权限码 | 特殊端点 | 状态 |
| --- | --- | --- | --- | --- |
| `client-settings` | 小程序展示配置 | `gym:content:manage` | `GET/PUT client-settings` | 纳入 R33 |
| `activities` | 门店活动 | `gym:activities:manage` | `GET activities/{id}/registrations`、`POST activities/{id}` | 纳入 R16/R34 |
| `franchise-brand` | 加盟品牌/模型 | `gym:franchise:manage` | `GET/PUT franchise-brand` | 纳入 R34 |
| `franchise-inquiries` | 加盟咨询 | `gym:franchise:manage` | — | 纳入 R11/R34 |
| `reviews` | 门店评价 | `gym:reviews:read` | — | 待确认（附件一未单列） |
| `feedback` | 匿名反馈 | `gym:feedback:read` | — | 待确认（附件一未单列） |

### 3.8 报表（只读聚合）

| 端点 | 权限码 | 说明 |
| --- | --- | --- |
| `GET reports/performance` | `gym:reports:read` | 门店/员工业绩（R23/R25/R29） |
| `GET reports/members` | `gym:reports:read` | 会员汇总（R24/R29） |
| `GET reports/member-cards` | `gym:reports:read` | 会员卡报表（R38） |
| `GET reports/dashboard` | `gym:reports:read` | 首页看板 |
| `GET reports/feedback` | `gym:reports:read` | 反馈汇总（待确认） |

### 3.9 合同外（冻结，D-03）

`coupon-templates`、`coupon-store-quotas`、`coupon-quota-batches`、`coupon-batches`、`coupon-quota-ledger`、`member-coupons`、`gift-code-batches`、`point-rules`、`point-products`、`point-ledger`、`point-redemptions`、`message-batches`。

> 这些模块**不实现新接口**，前端不移植；保留旧代码仅作历史参考。

## 4. 认证与差异（相对旧 Mock 契约）

| 项 | 旧 Mock | yudao |
| --- | --- | --- |
| 登录 | `POST /api/auth/login`（cookie 刷新） | `POST /admin-api/system/auth/login`（body 返回 refreshToken） |
| 权限码 | `GET /api/auth/codes` | `GET /admin-api/system/auth/get-permission-info` |
| 用户信息 | `GET /api/user/info` | `GET /admin-api/system/user/profile/get` |
| 业务前缀 | `/api/admin/v1/*` | `/admin-api/gym/*`（或对应 yudao 模块） |

> 适配层 `apps/web-antd/src/api/backend/*`（当前在分支 `feat/yudao-api-adapter`，尚未合入 `main`）已实现上述映射骨架（`VITE_API_BACKEND=yudao`），需按本契约细化资源端点与权限码前缀（见 `09-permissions.md`）。

## 5. 待确认

- 报表端点是否统一走 `page` 还是专用聚合路径（建议专用 `GET reports/{name}`）。
- 排行榜/汇总是否由 yudao BPM/报表模块承载，或 `gym` 自研 SQL。
- `equipment`、`reviews`、`feedback` 是否纳入（当前附件一未单列，需甲方确认）。
