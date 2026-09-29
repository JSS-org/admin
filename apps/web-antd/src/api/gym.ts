import type { GymPage, GymRow } from './backend/types';

import { useAccessStore } from '@vben/stores';

import { gymResourceAdapter } from './backend/gym-adapter';

export type { GymPage, GymRow } from './backend/types';

export const gymApi = {
  list: (path: string, params: Record<string, any> = {}): Promise<GymPage> => gymResourceAdapter.list(path, params),
  // Reference selectors must include every page, even when there are more than 100 records.
  listAll: async (path: string, params: Record<string, any> = {}): Promise<GymRow[]> => {
    const rows: GymRow[] = [];
    for (let page = 1; ; page++) {
      const result = await gymResourceAdapter.list(path, { ...params, page, pageSize: 100 });
      rows.push(...result.items);
      if (rows.length >= result.total || result.items.length === 0) return rows;
    }
  },
  get: <T = GymRow>(path: string, params?: Record<string, any>) => gymResourceAdapter.get<T>(path, params),
  post: <T = GymRow>(path: string, data: unknown, key?: string) => gymResourceAdapter.post<T>(path, data, key),
  patch: (path: string, data: unknown) => gymResourceAdapter.patch(path, data),
  put: <T = GymRow>(path: string, data: unknown) => gymResourceAdapter.put<T>(path, data),
};
export function uploadGymFile(file: File, category: string, storeId?: string) {
  return gymResourceAdapter.uploadFile(file, category, storeId);
}
export function getGymFileUrl(id: string) {
  return gymResourceAdapter.getFileUrl(id);
}
export async function openGymFile(id: string) {
  const { router } = await import('../router');
  await router.push({ name: 'GymFilePreview', params: { id } });
}
export const canGym = (code: string) => useAccessStore().accessCodes.includes(code);
