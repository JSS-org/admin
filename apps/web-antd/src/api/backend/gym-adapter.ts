import type { GymPage, GymResourceAdapter, GymRow } from './types';

import { requestClient } from '../request';
import { backendKind, yudaoAdminPrefix } from './mode';

const V1_PREFIX = '/admin/v1';
const YUDAO_GYM_PREFIX = `${yudaoAdminPrefix}/gym`;

/** v1 分页参数 -> yudao 分页参数 */
export function toYudaoPageParams(params: Record<string, any> = {}): Record<string, any> {
  const { page, pageSize, ...rest } = params;
  const result: Record<string, any> = { ...rest };
  if (page !== undefined) result.pageNo = page;
  if (pageSize !== undefined) result.pageSize = pageSize;
  return result;
}

/** yudao 分页响应（`{ list, total }`）-> 统一 `GymPage` */
export function fromYudaoPage(data: any, page = 1, pageSize = 100): GymPage {
  return {
    items: data?.list ?? [],
    total: data?.total ?? 0,
    page: data?.pageNo ?? page,
    pageSize: data?.pageSize ?? pageSize,
  };
}

const v1Adapter: GymResourceAdapter = {
  list: (path, params = {}) => requestClient.get<GymPage>(`${V1_PREFIX}/${path}`, { params }),
  get: (path, params) => requestClient.get(`${V1_PREFIX}/${path}`, { params }),
  post: (path, data, key) =>
    requestClient.post(`${V1_PREFIX}/${path}`, data, key ? { headers: { 'Idempotency-Key': key } } : {}),
  patch: (path, data) => requestClient.request<GymRow>(`${V1_PREFIX}/${path}`, { method: 'PATCH', data }),
  put: (path, data) => requestClient.put(`${V1_PREFIX}/${path}`, data),
  async uploadFile(file, category, storeId) {
    const body = new FormData();
    body.append('file', file);
    body.append('category', category);
    if (storeId) body.append('storeId', storeId);
    return requestClient.post<GymRow>(`${V1_PREFIX}/files`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  async getFileUrl(id) {
    const response = await requestClient.get<Blob>(`${V1_PREFIX}/files/${id}/content`, {
      responseType: 'blob',
      responseReturn: 'body',
    });
    return URL.createObjectURL(response);
  },
};

const yudaoAdapter: GymResourceAdapter = {
  async list(path, params = {}) {
    const data = await requestClient.get<any>(`${YUDAO_GYM_PREFIX}/${path}`, { params: toYudaoPageParams(params) });
    return fromYudaoPage(data, params.page, params.pageSize);
  },
  get: (path, params) => requestClient.get(`${YUDAO_GYM_PREFIX}/${path}`, { params }),
  post: (path, data) => requestClient.post(`${YUDAO_GYM_PREFIX}/${path}`, data),
  patch: (path, data) => requestClient.put(`${YUDAO_GYM_PREFIX}/${path}`, data),
  put: (path, data) => requestClient.put(`${YUDAO_GYM_PREFIX}/${path}`, data),
  async uploadFile(file, category, storeId) {
    const body = new FormData();
    body.append('file', file);
    const url = await requestClient.post<string>(`${yudaoAdminPrefix}/infra/file/upload`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      id: url,
      url,
      storeId: storeId ?? null,
      originalName: file.name,
      mimeType: file.type,
      category,
    };
  },
  async getFileUrl(id) {
    return id;
  },
};

export const gymResourceAdapter: GymResourceAdapter = backendKind === 'yudao' ? yudaoAdapter : v1Adapter;
