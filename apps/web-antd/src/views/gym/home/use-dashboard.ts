import type { GymRow } from '#/api/gym';

import { computed, onMounted, onScopeDispose, ref } from 'vue';

import { canGym, gymApi } from '#/api/gym';

export function useDashboard() {
  const data = ref<any>();
  const loading = ref(false);
  const error = ref(false);
  const stores = ref<GymRow[]>([]);
  const storeId = ref<string>();
  const days = ref(7);
  const allowed = computed(() => canGym('reports:read'));
  let request = 0;
  async function load() {
    if (!allowed.value) return;
    const current = ++request;
    loading.value = true;
    error.value = false;
    try {
      const result = await gymApi.get('reports/dashboard', { storeId: storeId.value, days: days.value });
      if (current === request) data.value = result;
    } catch {
      if (current === request) {
        data.value = undefined;
        error.value = true;
      }
    } finally {
      if (current === request) loading.value = false;
    }
  }
  onMounted(async () => {
    await Promise.allSettled([
      load(),
      canGym('stores:read')
        ? gymApi.listAll('stores').then((result) => {
            stores.value = result;
          })
        : Promise.resolve(),
    ]);
  });
  onScopeDispose(() => request++);
  return { data, loading, error, stores, storeId, days, allowed, load };
}
