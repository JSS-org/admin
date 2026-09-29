/**
 * 后端形态开关。
 *
 * - `v1`：当前 Nitro Mock / 既有正式后端契约（`/admin/v1/*` 风格，本仓库默认）。
 * - `yudao`：芋道 yudao（Spring Boot）后端契约。
 *
 * 通过环境变量 `VITE_API_BACKEND` 切换，缺省保持 `v1`，因此接入 yudao 不会影响现有开发。
 */
export type BackendKind = 'v1' | 'yudao';

export const backendKind: BackendKind = (import.meta.env.VITE_API_BACKEND as BackendKind | undefined) ?? 'v1';

export const isYudao = backendKind === 'yudao';

/** yudao 后台接口前缀，网关需将此前缀转发至 yudao 服务。 */
export const yudaoAdminPrefix = import.meta.env.VITE_GLOB_YUDAO_ADMIN_PREFIX || '/admin-api';
