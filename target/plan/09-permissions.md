# 09 · 权限码与菜单定义

> 目标：统一 yudao 后端权限码与前端 `canGym(...)` 的对应关系，并给出菜单/角色落地建议。配合 `08-gym-api-contract.md` 使用。

## 1. 权限码规范

- **后端（yudao）**：`gym:<entity>:<action>`，例如 `gym:members:read`、`gym:roles:write`、`gym:approvals:decide`。
- **前端（页面）**：沿用现有单冒号业务码 `<entity>:<action>`，例如 `canGym('members:read')`、`write-code="employees:write"`。
- **转换**：由 `apps/web-antd/src/api/backend/permissions.ts` 负责
  - 登录取码：`gym:members:read` → `members:read`（剥离 `gym:` 前缀，按需再走系统模块别名表）。
  - 反向：`members:read` → `gym:members:read`。
- 这样 **60+ 处 `canGym` / `write-code` 不需要改动**，同时保持 yudao 模块前缀规范、避免与 `system:*` 冲突。

## 2. 权限码注册表

| 权限码（后端） | 前端码 | 用途 | R |
| --- | --- | --- | --- |
| `gym:stores:read` / `gym:stores:write` | `stores:read` / `stores:write` | 门店资料、媒体 | R29/R37 |
| `gym:employees:read` / `gym:employees:write` | `employees:read` / `employees:write` | 员工资料 | R31 |
| `gym:accounts:write` | `accounts:write` | 账号、角色授权、密码 | R31 |
| `gym:roles:read` / `gym:roles:write` | `roles:read` / `roles:write` | 角色权限 | R31 |
| `gym:members:read` / `gym:members:write` | `members:read` / `members:write` | 会员/潜客 | R04/R12/R24/R29 |
| `gym:measurements:read` / `gym:measurements:write` | `measurements:read` / `measurements:write` | 体测/训练档案 | R15/R20 |
| `gym:cards:read` / `gym:cards:write` | `cards:read` / `cards:write` | 卡种/通卡 | R30 |
| `gym:blacklists:read` / `gym:blacklists:write` | `blacklists:read` / `blacklists:write` | 黑名单 | R03/R34 |
| `gym:courses:read` / `gym:courses:write` | `courses:read` / `courses:write` | 课程产品/排课 | R08/R09 |
| `gym:bookings:read` / `gym:bookings:write` | `bookings:read` / `bookings:write` | 预约/上课记录 | R08/R10/R36 |
| `gym:checkins:read` | `checkins:read` | 签到记录/汇总 | R10/R21/R25/R37 |
| `gym:contracts:read` / `gym:contracts:manage` | `contracts:read` / `contracts:manage` | 合同记录/模板 | R14/R33 |
| `gym:contracts:remind` | `contracts:remind` | 未签提醒 | R14/R33 |
| `gym:approvals:read` / `gym:approvals:create` / `gym:approvals:decide` | 同左 | 审批记录/提交/决定 | R09/R21/R25/R26 |
| `gym:approvals:templates` | `approvals:templates` | 审批模板 | R31 |
| `gym:devices:read` / `gym:devices:write` / `gym:devices:command` | 同左 | 设备/远程指令 | R27/R37 |
| `gym:equipment:read` / `gym:equipment:write` | `equipment:read` / `equipment:write` | 器械教学（待确认） | — |
| `gym:qr:read` | `qr:read` | 小程序/App 码 | R37 |
| `gym:sales:read` | `sales:read` | 办卡/包月/核销记录 | R38 |
| `gym:subscriptions:manage` | `subscriptions:manage` | 连续包月 | R06/R38 |
| `gym:verifications:manage` | `verifications:manage` | 核销 | R05/R38 |
| `gym:payment:read` / `gym:payment:write` | 同左 | 收款账户 | R35 |
| `gym:settlement:read` / `gym:settlement:manage` | 同左 | 分账规则/结算 | R35 |
| `gym:payroll:read` / `gym:payroll:templates` / `gym:payroll:calculate` / `gym:payroll:confirm` | 同左 | 工资表/模板/计算/确认 | R21/R31/R38 |
| `gym:content:manage` | `content:manage` | 小程序展示配置 | R33 |
| `gym:activities:manage` | `activities:manage` | 活动（发布/报名） | R16/R34 |
| `gym:franchise:manage` | `franchise:manage` | 加盟 | R11/R34 |
| `gym:reports:read` | `reports:read` | 报表 | R23/R24/R25/R29/R38 |
| `gym:files:read` / `gym:files:upload` | 同左 | 文件 | R42 |
| `gym:settings:manage` | `settings:manage` | 售卡/核销设置 | R32 |

> `gym:members:...` 等会员相关接口在 `member` 与 `gym` 之间的边界：管理端走 `gym` 权限；C 端会员自助接口走 `/app-api`，按会员本人鉴权，不纳入本表。

## 3. 管理端菜单树（建议）

yudao 后端菜单驱动（`accessMode: 'backend'`），`component` 指向视图路径，`permission` 用上表权限码。

| 一级 | 二级 | 路由 / component | 可见范围 |
| --- | --- | --- | --- |
| 首页 | — | `gym/home` | 总部 + 门店 |
| 门店管理 | 门店资料 | `gym/stores` | 总部 + 门店 |
| | 签到记录 | `gym/checkins` | 总部 + 门店 |
| | 小程序/App 码 | `gym/qr-codes` | 总部 + 门店 |
| 员工管理 | 员工资料 | `gym/employees` | 总部 + 门店 |
| | 角色权限 | `gym/roles` | 仅总部 |
| | 薪资模板 | `gym/salary-templates` | 仅总部 |
| | 门店工资表 | `gym/payrolls` | 总部 + 门店 |
| 会员管理 | 会员资料 | `gym/members` | 总部 + 门店 |
| | 体测记录 | `gym/body-measurements` | 总部 + 门店 |
| | 黑名单 | `gym/blacklists` | 仅总部 |
| 会员卡管理 | 会员卡模板 | `gym/cards` | 总部 + 门店 |
| | 售卡与核销设置 | `gym/settings` | 仅总部 |
| | 自主办卡记录 | `gym/self-service-card-orders` | 总部 + 门店 |
| | 连续包月记录 | `gym/subscriptions` | 总部 + 门店 |
| | 自助核销记录 | `gym/verifications` | 总部 + 门店 |
| 课程管理 | 课程产品 | `gym/course-products` | 总部 + 门店 |
| | 课程安排 | `gym/course-sessions` | 总部 + 门店 |
| | 预约管理 | `gym/bookings` | 总部 + 门店 |
| | 上课记录 | `gym/lesson-records` | 总部 + 门店 |
| 合同管理 | 合同模板 | `gym/contract-templates` | 仅总部 |
| | 合同记录 | `gym/contracts` | 总部 + 门店 |
| 审批管理 | 审批模板 | `gym/approval-templates` | 仅总部 |
| | 审批记录 | `gym/approvals` | 总部 + 门店 |
| 设备管理 | 智能设备 | `gym/devices` | 总部 + 门店 |
| | 器械教学 | `gym/equipment` | 总部 + 门店（待确认） |
| 内容管理 | 展示配置 | `gym/client-settings` | 仅总部 |
| | 门店活动 | `gym/activities` | 仅总部 |
| 加盟管理 | 加盟品牌/咨询 | `gym/franchise-*` | 仅总部 |
| 财务管理 | 收款账户 | `gym/payment-accounts` | 仅总部 |
| | 分账规则 | `gym/settlement-rules` | 仅总部 |
| | 分账结算记录 | `gym/settlements` | 仅总部 |
| 统计报表 | 门店与员工业绩 | `gym/reports/performance` | 总部 + 门店 |
| | 会员汇总 | `gym/reports/members` | 总部 + 门店 |
| | 会员卡报表 | `gym/reports/member-cards` | 总部 + 门店 |

> **不进入菜单（合同外，D-03）**：优惠券管理、积分管理、消息管理、礼品码；`门店评价`/`匿名反馈` 待甲方确认。

## 4. 角色与数据范围（建议）

| 角色 | yudao data_scope | 菜单范围 |
| --- | --- | --- |
| 总部管理员 | 全部 | 全部菜单 |
| 总部运营 | 全部 | 除角色权限/财务之外的总部菜单（按需） |
| 门店管理者（店长/负责人） | 本部门及子部门 | 门店侧菜单（不含仅总部项） |
| 门店前台/教练（移动端工作台） | 本人负责会员 | 移动端工作台权限（非网页菜单） |

## 5. 落地方式

1. 用 yudao 菜单管理（或初始化 SQL）建立上表菜单，`permission` 填 `gym:*` 权限码。
2. 角色分配菜单，得到按钮/接口权限；后端接口用 `@PreAuthorize` 校验。
3. 前端 `canGym` 继续用单冒号业务码，由适配层转换（第 1 节）。
4. 门店隔离由数据权限保证，不依赖菜单可见性；菜单可见性只是 UX 层。
