# JSS Admin · 健身树门店管理后台

**English** | [中文](./README.zh-CN.md)

> **Proprietary & confidential.** This repository is an internal commercial asset of JSS (健身树). It is **not** open source, and external issues and pull requests are not accepted. See [LICENSE](./LICENSE).

## Overview

JSS Admin is the back-office for 健身树 (JSS) gym stores. It covers the day-to-day operations of a store chain — members, contracts and approvals, training scheduling, measurements, coupons and points, sales and settlement, devices, content, governance and payroll — behind a single scoped admin console.

The console is built on top of [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) (MIT). The upstream framework lives in `packages/` and `internal/`; the JSS product code lives in `apps/web-antd`.

## Tech Stack

- **Vue 3**, **Vite**, **TypeScript**
- **Ant Design Vue** component library
- **Pinia** state management, **Vue Router** with dynamic permission-based routes
- **Vue I18n** internationalization and multi-theme support
- **pnpm workspaces** + **Turbo** monorepo

## Requirements

- Node.js `^22.18.0 || ^24.12.0` (see `.node-version`)
- pnpm `>= 11` (`npm i -g corepack && corepack enable`)

## Getting Started

```bash
pnpm install
pnpm dev:antd
```

The dev server prints the local URL on startup. `pnpm build:antd` produces the production bundle.

## Project Structure

| Path                | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `apps/web-antd`     | JSS admin console (the product)                       |
| `apps/backend-mock` | Local mock API used for development                   |
| `packages/`         | Shared framework packages (`@vben/*`, `@vben-core/*`) |
| `internal/`         | Shared build, lint and TypeScript configurations      |
| `scripts/`          | Monorepo tooling (`vsh`, `turbo-run`)                 |
| `database/`         | Database schema and seed scripts                      |

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev:antd` | Start the admin console in dev mode |
| `pnpm build:antd` | Build the admin console |
| `pnpm lint` | Run oxlint, ESLint and Stylelint |
| `pnpm format` | Format with oxfmt |
| `pnpm check` | Circular dependency, dependency, type and spelling checks |
| `pnpm check:type` | Type-check all packages |
| `pnpm test:unit` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |

## Commit Convention

Commits are validated by commitlint through the `commit-msg` git hook. Use [Conventional Commits](https://www.conventionalcommits.org/) with a scope, for example `feat(schedule): add recurring course slots`. See [`.github/commit-convention.md`](./.github/commit-convention.md) for the full rules.

## Browser Support

The console supports modern browsers only (Chrome, Edge, Firefox and Safari, last two versions). IE is not supported.

## License

Proprietary — see [LICENSE](./LICENSE). Third-party open-source notices, including the MIT license of the upstream Vue Vben Admin framework, are listed there as well.
