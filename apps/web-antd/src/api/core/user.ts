import type { UserInfo } from '@vben/types';

import { backendKind } from '#/api/backend/mode';
import { yudaoUserInfo } from '#/api/backend/yudao-auth';
import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  if (backendKind === 'yudao') return yudaoUserInfo();
  return requestClient.get<UserInfo>('/user/info');
}
