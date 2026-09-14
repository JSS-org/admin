import type { GymRow } from '#/api/gym';

import { onScopeDispose, reactive, ref, watch } from 'vue';

import { gymApi } from '../../../api/gym';

/** Owns the active query, paging and latest-response state for one resource. */
export function useResourceList(endpoint: () => string) {
  const items = ref<GymRow[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(false);
  const hasFilters = ref(false);
  const page = ref(1);
  const pageSize = ref(20);
  const filters = reactive<Record<string, any>>({});
  const filterDraft = ref<Record<string, any>>({});
  const response = ref<Record<string, any>>({});
  let loadRequest = 0;
  async function load() {
    const request = ++loadRequest;
    loading.value = true;
    error.value = false;
    try {
      const data = await gymApi.list(endpoint(), {
        ...filters,
        page: page.value,
        pageSize: pageSize.value,
      });
      if (request !== loadRequest) return;
      const lastPage = Math.max(1, Math.ceil(data.total / pageSize.value));
      if (page.value > lastPage) {
        page.value = lastPage;
        await load();
        return;
      }
      items.value = data.items;
      response.value = data;
      total.value = data.total;
    } catch {
      if (request !== loadRequest) return;
      error.value = true;
      items.value = [];
      response.value = {};
      total.value = 0;
    } finally {
      if (request === loadRequest) loading.value = false;
    }
  }

  function search() {
    for (const key of Object.keys(filters)) Reflect.deleteProperty(filters, key);
    for (const [key, raw] of Object.entries(filterDraft.value)) {
      const value = typeof raw === 'string' ? raw.trim() : raw;
      if (value !== '' && value !== undefined && value !== null) filters[key] = value;
    }
    hasFilters.value = Object.keys(filters).length > 0;
    page.value = 1;
    return load();
  }
  watch(
    endpoint,
    () => {
      items.value = [];
      total.value = 0;
      response.value = {};
      page.value = 1;
      filterDraft.value = {};
      hasFilters.value = false;
      Object.keys(filters).forEach((key) => Reflect.deleteProperty(filters, key));
      void load();
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    loadRequest++;
  });
  return { items, total, loading, error, hasFilters, page, pageSize, filterDraft, response, load, search };
}
