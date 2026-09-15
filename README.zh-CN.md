# JSS Admin · 健身树门店管理后台

[English](./README.md) | **中文**

> **闭源商业项目，禁止外传。** 本仓库是健身树（JSS）的内部商业资产，**非开源项目**，不接受外部 Issue 与 Pull Request。授权条款见 [LICENSE](./LICENSE)。

## 项目简介

JSS Admin 是健身树（JSS）连锁健身门店的运营管理后台，覆盖门店日常经营的主要场景：会员、合同与审批、排课与体测、优惠券与积分、销售与结算、设备、内容、门店治理以及薪资核算，统一收敛在一个按范围（门店/区域）隔离的管理控制台中。

后台基于 [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin)（MIT）二次开发。上游框架代码位于 `packages/` 与 `internal/`，JSS 业务代码位于 `apps/web-antd`。

## 技术栈

- **Vue 3**、**Vite**、**TypeScript**
- **Ant Design Vue** 组件库
- **Pinia** 状态管理，**Vue Router** 动态权限路由
- **Vue I18n** 国际化与多主题
- **pnpm workspaces** + **Turbo** 单体仓库

## 环境要求

- Node.js `^22.18.0 || ^24.12.0`（见 `.node-version`）
- pnpm `>= 11`（`npm i -g corepack && corepack enable`）

## 快速开始

```bash
pnpm install
pnpm dev:antd
```

开发服务器启动后会打印本地访问地址，`pnpm build:antd` 产出生产构建产物。

## 目录结构

| 路径                | 说明                                    |
| ------------------- | --------------------------------------- |
| `apps/web-antd`     | JSS 管理后台（产品本体）                |
| `apps/backend-mock` | 本地开发使用的 Mock 接口服务            |
| `packages/`         | 共享框架包（`@vben/*`、`@vben-core/*`） |
| `internal/`         | 共享的构建、Lint 与 TypeScript 配置     |
| `scripts/`          | 单体仓库工具（`vsh`、`turbo-run`）      |
| `database/`         | 数据库结构与初始化脚本                  |

## 常用命令

| 命令              | 说明                             |
| ----------------- | -------------------------------- |
| `pnpm dev:antd`   | 启动管理后台开发服务             |
| `pnpm build:antd` | 构建管理后台                     |
| `pnpm lint`       | 运行 oxlint、ESLint 与 Stylelint |
| `pnpm format`     | 使用 oxfmt 格式化                |
| `pnpm check`      | 循环依赖、依赖、类型与拼写检查   |
| `pnpm check:type` | 全量类型检查                     |
| `pnpm test:unit`  | 运行单元测试（Vitest）           |
| `pnpm test:e2e`   | 运行端到端测试（Playwright）     |

## 提交规范

提交信息由 `commit-msg` 钩子中的 commitlint 校验，遵循 [Conventional Commits](https://www.conventionalcommits.org/) 并带上 scope，例如 `feat(schedule): add recurring course slots`。完整规则见 [`.github/commit-convention.md`](./.github/commit-convention.md)。

## 浏览器支持

仅支持现代浏览器（Chrome、Edge、Firefox、Safari 最近两个版本），不支持 IE。

## 许可证

闭源专有授权，详见 [LICENSE](./LICENSE)。其中同时保留了上游 Vue Vben Admin 框架的 MIT 授权声明等第三方开源许可信息。
