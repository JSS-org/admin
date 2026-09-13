import type { GymRow } from '#/api/gym';

import { onScopeDispose, reactive, ref, watch } from 'vue';

import { gymApi } from '../../../api/gym';

/** Owns the active query, paging and latest-response state for one resource. */
export function useResourceList(endpoint: () => string) {
  const items = ref<GymRow[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const page = ref(1);
  const pageSize = ref(20);
  const filters = reactive<Record<string, any>>({});
  const filterDraft = ref<Record<string, any>>({});
  const response = ref<Record<string, any>>({});
  let loadRequest = 0;
  async function load() {
    const request = ++loadRequest;
    loading.value = true;
    try {
      const data = await gymApi.list(endpoint(), {
        ...filters,
        page: page.value,
        pageSize: pageSize.value,
      });
      if (request !== loadRequest) return;
      items.value = data.items;
      response.value = data;
      total.value = data.total;
    } finally {
      if (request === loadRequest) loading.value = false;
    }
  }

  function search() {
    for (const key of Object.keys(filters)) Reflect.deleteProperty(filters, key);
    Object.assign(filters, filterDraft.value);
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
      Object.keys(filters).forEach((key) => Reflect.deleteProperty(filters, key));
      void load();
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    loadRequest++;
  });
  return { items, total, loading, page, pageSize, filterDraft, response, load, search };
}
