import { useAccessStore } from '@vben/stores';

import { baseRequestClient, requestClient } from '#/api/request';

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
  list: (path: string, params: Record<string, any> = {}) =>
    requestClient.get<GymPage>(`/admin/v1/${path}`, { params }),
  get: <T = GymRow>(path: string) => requestClient.get<T>(`/admin/v1/${path}`),
  post: <T = GymRow>(path: string, data: unknown, key?: string) =>
    requestClient.post<T>(
      `/admin/v1/${path}`,
      data,
      key ? { headers: { 'Idempotency-Key': key } } : {},
    ),
  patch: (path: string, data: unknown) =>
    requestClient.request<GymRow>(`/admin/v1/${path}`, {
      method: 'PATCH',
      data,
    }),
  put: <T = GymRow>(path: string, data: unknown) =>
    requestClient.put<T>(`/admin/v1/${path}`, data),
};
export async function uploadGymFile(
  file: File,
  category: string,
  storeId?: string,
) {
  const body = new FormData();
  body.append('file', file);
  body.append('category', category);
  if (storeId) body.append('storeId', storeId);
  return requestClient.post<GymRow>('/admin/v1/files', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
export async function openGymFile(id: string) {
  const response = await baseRequestClient.get<Blob>(
    `/admin/v1/files/${id}/content`,
    {
      responseType: 'blob',
      responseReturn: 'body',
      headers: { Authorization: `Bearer ${useAccessStore().accessToken}` },
    },
  );
  const url = URL.createObjectURL(response);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export const canGym = (code: string) =>
  useAccessStore().accessCodes.includes(code);
