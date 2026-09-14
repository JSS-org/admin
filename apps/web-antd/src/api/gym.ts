import { useAccessStore } from '@vben/stores';

import { filePreview } from './file-preview-state';
import { requestClient } from './request';

export interface GymRow {
  id: string;
  [key: string]: any;
}
export interface GymPage {
  items: GymRow[];
  total: number;
  page: number;
  pageSize: number;
}
export const gymApi = {
  list: (path: string, params: Record<string, any> = {}) => requestClient.get<GymPage>(`/admin/v1/${path}`, { params }),
  // Reference selectors must include every page, even when there are more than 100 records.
  listAll: async (path: string, params: Record<string, any> = {}): Promise<GymRow[]> => {
    const rows: GymRow[] = [];
    for (let page = 1; ; page++) {
      const result = await gymApi.list(path, { ...params, page, pageSize: 100 });
      rows.push(...result.items);
      if (rows.length >= result.total || result.items.length === 0) return rows;
    }
  },
  get: <T = GymRow>(path: string, params?: Record<string, any>) =>
    requestClient.get<T>(`/admin/v1/${path}`, { params }),
  post: <T = GymRow>(path: string, data: unknown, key?: string) =>
    requestClient.post<T>(`/admin/v1/${path}`, data, key ? { headers: { 'Idempotency-Key': key } } : {}),
  patch: (path: string, data: unknown) =>
    requestClient.request<GymRow>(`/admin/v1/${path}`, {
      method: 'PATCH',
      data,
    }),
  put: <T = GymRow>(path: string, data: unknown) => requestClient.put<T>(`/admin/v1/${path}`, data),
};
export async function uploadGymFile(file: File, category: string, storeId?: string) {
  const body = new FormData();
  body.append('file', file);
  body.append('category', category);
  if (storeId) body.append('storeId', storeId);
  return requestClient.post<GymRow>('/admin/v1/files', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
export async function getGymFileUrl(id: string) {
  const response = await requestClient.get<Blob>(`/admin/v1/files/${id}/content`, {
    responseType: 'blob',
    responseReturn: 'body',
  });
  return URL.createObjectURL(response);
}
export async function openGymFile(id: string) {
  filePreview.fileId = id;
  filePreview.open = true;
}
export const canGym = (code: string) => useAccessStore().accessCodes.includes(code);
