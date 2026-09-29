import type { UserInfo } from '@vben/types';

import { useAccessStore } from '@vben/stores';

import { requestClient } from '../request';
import { yudaoAdminPrefix } from './mode';
import { deriveGymRoles, toGymPermissionCodes } from './permissions';

const YUDAO_AUTH = `${yudaoAdminPrefix}/system/auth`;

interface YudaoLoginResult {
  accessToken: string;
  expiresTime?: number;
  refreshToken: string;
  userId?: number;
}

interface YudaoPermissionInfo {
  permissions: string[];
  roles: { code?: string }[];
  user: Record<string, any>;
}

let permissionCache: null | { data: Promise<YudaoPermissionInfo>; token: string } = null;

/** 登录 yudao，返回 vben 需要的 accessToken 及用于续期的 refreshToken。 */
export async function yudaoLogin(params: Record<string, any>) {
  const result = await requestClient.post<YudaoLoginResult>(`${YUDAO_AUTH}/login`, params);
  permissionCache = null;
  return { accessToken: result.accessToken, refreshToken: result.refreshToken };
}

/** 使用 refreshToken 续期，返回新的 accessToken + refreshToken。 */
export async function yudaoRefresh(refreshToken: string) {
  return requestClient.post<YudaoLoginResult>(`${YUDAO_AUTH}/refresh-token`, undefined, {
    params: { refreshToken },
  });
}

/** 退出登录。 */
export async function yudaoLogout() {
  await requestClient.post(`${YUDAO_AUTH}/logout`);
  permissionCache = null;
}

/** 获取当前用户的权限信息；同一 accessToken 下并发请求只发起一次。 */
export async function yudaoPermissionInfo(): Promise<YudaoPermissionInfo> {
  const token = useAccessStore().accessToken ?? '';
  if (permissionCache?.token === token) return permissionCache.data;
  const data = requestClient.get<YudaoPermissionInfo>(`${YUDAO_AUTH}/get-permission-info`);
  permissionCache = { data, token };
  try {
    return await data;
  } catch (error) {
    if (permissionCache?.data === data) permissionCache = null;
    throw error;
  }
}

/** 权限信息 -> 业务权限码 */
export async function yudaoAccessCodes(): Promise<string[]> {
  const info = await yudaoPermissionInfo();
  return toGymPermissionCodes(info.permissions ?? []);
}

/** 用户资料 -> vben UserInfo（角色映射为路由所需的 hq/store 范围）。 */
export async function yudaoUserInfo(): Promise<UserInfo> {
  const [info, profile] = await Promise.all([
    yudaoPermissionInfo(),
    requestClient.get<Record<string, any>>(`${yudaoAdminPrefix}/system/user/profile/get`),
  ]);
  const roleCodes = (info.roles ?? []).map((role) => role.code ?? '').filter(Boolean);
  return {
    userId: String(profile.id ?? info.user?.id ?? ''),
    username: profile.username ?? info.user?.username ?? '',
    realName: profile.nickname ?? info.user?.nickname ?? '',
    avatar: profile.avatar ?? info.user?.avatar ?? '',
    desc: '',
    homePath: '/gym/home',
    roles: deriveGymRoles(roleCodes, info.permissions ?? []),
    token: '',
  };
}
