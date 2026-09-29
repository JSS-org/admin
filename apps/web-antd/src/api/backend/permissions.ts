/**
 * 权限码集中映射。
 *
 * 页面层（`canGym('members:read')`、`write-code="employees:write"`）始终使用业务权限码，
 * 由本模块负责与 yudao 权限码互转，避免把 60+ 处权限判断散落到各视图里。
 *
 * 约定：
 * - 业务权限码形如 `resource:action`（一个冒号），如 `members:read`、`roles:write`。
 * - yudao 系统模块权限码形如 `system:user:query`（两个冒号）。
 * - 自定义 gym 模块若按业务权限码注册，则原样透传。
 */

/** yudao 系统模块权限码 -> 业务权限码。 */
const YUDAO_TO_GYM: Record<string, string> = {
  'system:user:query': 'employees:read',
  'system:user:create': 'employees:write',
  'system:user:update': 'employees:write',
  'system:user:delete': 'employees:write',
  'system:user:import': 'employees:write',
  'system:user:export': 'employees:read',
  'system:user:update-password': 'employees:write',
  'system:role:query': 'roles:read',
  'system:role:create': 'roles:write',
  'system:role:update': 'roles:write',
  'system:role:delete': 'roles:write',
  'system:role:assign-menu': 'roles:write',
  'system:permission:assign-role-menu': 'roles:write',
  'system:permission:assign-role-data-scope': 'roles:write',
  'system:dept:query': 'stores:read',
  'system:dept:create': 'stores:write',
  'system:dept:update': 'stores:write',
  'system:dept:delete': 'stores:write',
};

/** 反向映射：业务权限码 -> yudao 权限码（用于写入 yudao 侧的场景）。 */
const GYM_TO_YUDAO: Record<string, string> = {
  'employees:read': 'system:user:query',
  'employees:write': 'system:user:update',
  'roles:read': 'system:role:query',
  'roles:write': 'system:role:update',
  'stores:read': 'system:dept:query',
  'stores:write': 'system:dept:update',
};

/** 是否已经是业务权限码（`resource:action`，仅一个冒号，用于区分 yudao 的 `system:user:query`）。 */
function isGymCode(code: string): boolean {
  return /^[a-z][\w-]*:[a-z][\w-]*$/.test(code);
}

/** 将单个 yudao 权限码转为业务权限码；无法识别时返回原值，保证自定义 gym 权限可用。 */
export function toGymCode(code: string): string {
  if (isGymCode(code)) return code;
  return YUDAO_TO_GYM[code] ?? code;
}

/** 将一组 yudao 权限码转为去重后的业务权限码集合。 */
export function toGymPermissionCodes(codes: readonly string[]): string[] {
  return [...new Set((codes ?? []).map((code) => toGymCode(code)))];
}

/** 将业务权限码转为 yudao 权限码（未配置映射时原样返回）。 */
export function toYudaoCode(code: string): string {
  return GYM_TO_YUDAO[code] ?? code;
}

/** 明确只有总部才具备的业务权限码，用于推断账号范围。 */
const HQ_ONLY_PERMISSIONS = new Set([
  'approval-templates:read',
  'payment-accounts:read',
  'point-ledger:read',
  'point-products:read',
  'point-redemptions:read',
  'point-rules:read',
  'roles:read',
  'roles:write',
  'salary-templates:read',
  'settlement-rules:read',
  'settlements:read',
  'stores:write',
]);

/** 视为总部范围的 yudao 角色编码。 */
const HQ_ROLE_CODES = new Set(['hq', 'super_admin', 'superadmin', 'tenant_admin']);

/**
 * 由 yudao 角色编码 + 权限码推断 vben 路由需要的范围角色（`hq` / `store`）。
 *
 * 前端静态路由用 `authority: ['hq']`、`['hq', 'store']` 过滤菜单，
 * 因此这里必须产出 `hq` 或 `store`，而不是 yudao 的业务角色编码。
 */
export function deriveGymRoles(roleCodes: readonly string[], permissionCodes: readonly string[]): string[] {
  const codes = (roleCodes ?? []).map((code) => code.toLowerCase());
  const gymCodes = toGymPermissionCodes(permissionCodes ?? []);
  const isHq = codes.some((code) => HQ_ROLE_CODES.has(code)) || gymCodes.some((code) => HQ_ONLY_PERMISSIONS.has(code));
  return [isHq ? 'hq' : 'store'];
}
