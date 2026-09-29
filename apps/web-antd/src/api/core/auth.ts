import { useAccessStore } from '@vben/stores';

import { backendKind } from '#/api/backend/mode';
import { yudaoAccessCodes, yudaoLogin, yudaoLogout, yudaoRefresh } from '#/api/backend/yudao-auth';
import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    refreshToken?: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  if (backendKind === 'yudao') return yudaoLogin(data);
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  if (backendKind === 'yudao') {
    const accessStore = useAccessStore();
    const result = await yudaoRefresh(accessStore.refreshToken ?? '');
    if (result.refreshToken) accessStore.setRefreshToken(result.refreshToken);
    return result.accessToken;
  }
  const result = await baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', undefined, {
    withCredentials: true,
  });
  return result.data;
}

/**
 * 退出登录
 */
export async function logoutApi() {
  if (backendKind === 'yudao') return yudaoLogout();
  return baseRequestClient.post('/auth/logout', undefined, {
    withCredentials: true,
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  if (backendKind === 'yudao') return yudaoAccessCodes();
  return requestClient.get<string[]>('/auth/codes');
}
