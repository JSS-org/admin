# AGENTS.md — JSS 旧管理端原型协作说明

本仓库保留 Ant Design Vue 管理端原型，用于业务参考。现行管理端已迁入相邻 `dashboard/apps/web-jss`；原 `target/` 的 28 份资料已移至 `../dashboard/targets/`，旧目录不再维护。

## 开工先读

1. [资料索引](../dashboard/targets/README.md)
2. [项目现状](../dashboard/targets/plan/01-status.md)
3. [合同范围矩阵](../dashboard/targets/plan/02-scope.md)
4. [已定决策](../dashboard/targets/plan/05-decisions.md)
5. [后端优先工作](../dashboard/targets/handoff/backend-priorities.md)

合同范围以[附件一原件](../dashboard/targets/contracts/originals/附件一_项目需求说明书.docx) R01–R43 为准，验收和数据安全以附件二/三为准。目标是一套整合微信小程序、一套整合 iOS/Android APP、总部/门店共用网页管理后台及业务后端，均按角色与门店隔离。

## 当前架构和资产

- 后端采用芋道 Spring Boot / MyBatis Plus / Redis 及 gym 自研模块，替代旧 Go 方案；已有 MySQL 8、JDK17/SB3.5、门店=部门、移动端双 token 决策，细节以现行 ADR 为准。
- 当前前端采用 dashboard 内新增 app 的方式，使用 Vben / antdv-next，复用芋道登录、菜单及账号权限。
- `apps/web-antd`、`apps/backend-mock`、`database` 是旧范围下的原型与 PostgreSQL 参考资产，不是最终交付形态。
- 原合同文档在 `../dashboard/targets/contracts/`；早期需求、扫描件、Go/PostgreSQL 设计及旧计划完整保留在 `../dashboard/targets/archive/legacy-target/`。历史方案不能作为当前实现指令。
- 当前本机后端基础服务已运行；业务菜单和 gym API 待配置/实现及联调，不再沿用“本机无法运行后端”的旧环境说明。

## 开发约定

- 一个可验证增量对应一次中文 Conventional Commit；业务改动对应 R 编号。
- 若确实修改本仓库原型代码，按改动执行 `pnpm vsh lint --format`、`pnpm --filter @vben/web-antd typecheck`、`pnpm vitest run apps/web-antd --dom`。仅文档/资料移动检查完整性、链接与 diff；当前交付前端检查见 dashboard 现行工作流。
- 每个 R 的完成需要可复现的验收证据；不得用假成功替代未接入的支付、设备、推送或签约。
- 范围外功能不投入：优惠券发放、积分、礼品码、批量消息、一键维护、操课、临期筛选、展示素材、潜客跟进、多人报警、带人冻卡、夜间滞留等；新增或结构性调整按合同走书面补充协议。
- 不提交密钥、凭证或真实会员数据；测试用脱敏数据。
- 后端不属于本次前端任务负责范围；需要接口、模型、菜单/权限初始化或其他后端变更时，向用户报告并写入交接，由后端团队执行，不直接改 server 或数据库。

里程碑保持 A（后台及必要后端）→ B（全部客户端与联调）→ C（交付物确认）→ 付清全款后上线支持，具体以合同与现行计划为准。
