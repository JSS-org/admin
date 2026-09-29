# AGENTS.md — JSS 健身业务系统 开发协作说明

> **新会话 / 新成员先读这里（~2 分钟），需要细节再看 `target/plan/`。**
> 本文件只记录**稳定事实与约定**；动态进度以 `target/plan/01-status.md` 为准。

## 1. 项目定位

为连锁健身房定制一套**多端一体化**业务系统：

- 一套**整合微信小程序**（会员 / 员工 / 管理者同端分角色）
- 一套**整合 APP**（iOS + Android，同端分角色 + 系统推送）
- **总部 / 门店共用网页管理后台**（同一后端，按角色与门店隔离）
- 业务后端、数据库、接口、部署脚本、技术文档
- 接入：**IoT（门禁 / 人脸 / 智能柜）**、**支付（微信 / 支付宝 / 连续包月）**、**平台团购券自主核销**、**进场 / 审批通知**

## 2. 当前阶段（快照 2026-09-29）

- 目标技术栈已**改为芋道 yudao 全家桶**（Spring Boot + MyBatis Plus + Redis + Vue3 管理端 + uni-app 移动端），**取代**旧规划的“自研 Go 后端”。
- 仓库现有 `apps/web-antd`（vben / Ant Design Vue 管理端）+ `apps/backend-mock`（Nitro Mock）+ `database`（PostgreSQL 设计）是**旧范围下的原型资产**，用于业务参考与页面复用，**不是最终交付形态**。
- **合同范围以 `target/健身房合同_三附件签署稿/附件一_项目需求说明书.docx` 的 R01–R43 为准。** 旧 `target/design/*` 仅部分适用，详见 `target/plan/01-status.md`。
- 里程碑：A（后台 + 必要后端，3 个月）→ B（全部 APP/小程序 + 联调，再 3 个月）→ C（全部交付物确认）→ 付清全款后 3 个月上线支持。见合同第 4.2 / 5 条。

## 3. 必读文档（按顺序）

1. `target/plan/README.md` — 规划索引与 5 分钟上手
2. `target/plan/01-status.md` — 项目现状、资产盘点、旧规划失效点
3. `target/plan/02-scope.md` — R01–R43 需求 × 端 × 承载模块 × 现状 矩阵
4. `target/plan/03-architecture.md` — yudao 全栈技术路线（模块、账号、数据权限、IoT、支付、通知）
5. `target/plan/04-roadmap.md` — 里程碑与敏捷迭代/提交计划
6. `target/plan/05-decisions.md` — 待确认决策（ADR）与已定决策
7. 合同三附件（范围与验收依据）：`target/健身房合同_三附件签署稿/`

## 4. 目录地图

| 路径 | 说明 |
| --- | --- |
| `target/plan/` | **现行规划文档（权威）** |
| `target/健身房合同_三附件签署稿/` | 合同正文 + 附件一/二/三（范围与验收基准） |
| `target/design/` | 旧设计文档：`01/02/03` 可作参考，`04`（Go 后端）**已失效** |
| `target/requirements.md`、`target/raw/` | 早期原始需求与扫描件（仅背景参考，不构成范围） |
| `apps/web-antd` | 旧范围 vben/AntD 管理端原型（业务页面资产） |
| `apps/backend-mock` | 旧范围 Nitro Mock（接口契约参考） |
| `database/` | 旧范围 PostgreSQL 迁移与种子（仅参考，随 yudao 切换需重做） |
| `docs/` | 文档站工程（vben 自带） |

## 5. 开发约定（敏捷、小步）

- **小步提交**：一个可验证的业务增量 = 一次提交；提交信息用中文 conventional commits（`feat: / fix: / refactor: / docs: / chore:`）。
- **开工前**：先读 `target/plan/01-status.md`，确认当前阶段与未决事项；功能改动对应 R 编号。
- **提交前自检**（当前原型工程）：
  - `pnpm vsh lint --format`
  - `pnpm --filter @vben/web-antd typecheck`
  - `pnpm vitest run apps/web-antd --dom`
- **验收留痕**：每个 R 需求的完成需给出可复现证据，对应附件二逐项记录；禁用“假成功”代替未接入的支付 / 设备 / 推送 / 签约。
- **范围纪律**：不在合同 R01–R43 内的功能不投入（尤其运营类：优惠券发放、积分、礼品码、批量消息、操课、临期筛选、展示素材、潜客跟进、多人报警、带人冻卡、夜间滞留）。新增走书面补充协议。
- **不提交密钥 / 凭证 / 真实会员数据**；测试用脱敏或模拟数据（合同第十条 + 附件三）。

## 6. 决策状态

重大架构决策记录在 `target/plan/05-decisions.md`。**截至当前仍有 3 项待甲方/团队拍板**：管理后台基座、数据库、现有超范围功能处置。未拍板前按文档中“推荐方案”推进，但不得据此进行不可逆改造。
