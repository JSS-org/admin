import type { GymRow } from '#/api/gym';

import { computed, onMounted, onScopeDispose, ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import { legacyContent, prepareContent, validateContent } from './content-form';
export function usePage() {
  const stores = ref<GymRow[]>([]);
  const storeId = ref<string>();
  const platform = ref('miniapp');
  const data = ref<Record<string, any>>({ blocks: [], enabled: false });
  const loading = ref(false);
  const saving = ref(false);
  const uploading = ref(false);
  const error = ref(false);
  const snapshot = ref('');
  const busy = computed(() => loading.value || saving.value || uploading.value);
  const dirty = computed(() => !!snapshot.value && JSON.stringify(data.value) !== snapshot.value);
  let request = 0;
  let storesLoaded = false;
  async function load() {
    const current = ++request;
    loading.value = true;
    error.value = false;
    snapshot.value = '';
    try {
      if (!storesLoaded) {
        const availableStores = await gymApi.listAll('stores');
        if (current !== request) return;
        stores.value = availableStores;
        storesLoaded = true;
      }
      const result = await gymApi.get('client-settings', { platform: platform.value, storeId: storeId.value });
      if (current !== request) return;
      data.value = {
        ...result,
        contentHtml: result.contentHtml ?? legacyContent(result.blocks),
        blocks: result.blocks.map((block: GymRow) => ({ ...block, key: crypto.randomUUID() })),
      };
      snapshot.value = JSON.stringify(data.value);
    } catch {
      if (current === request) error.value = true;
    } finally {
      if (current === request) loading.value = false;
    }
  }
  onMounted(load);
  onScopeDispose(() => request++);
  function restore() {
    if (snapshot.value) data.value = JSON.parse(snapshot.value);
  }
  async function save() {
    if (busy.value || error.value) return;
    const validation = validateContent(data.value, platform.value);
    if (validation) {
      message.error(validation);
      return;
    }
    saving.value = true;
    try {
      await gymApi.put('client-settings', prepareContent(data.value, platform.value, storeId.value));
      message.success('展示配置已保存');
      await load();
    } finally {
      saving.value = false;
    }
  }
  return {
    stores,
    storeId,
    platform,
    data,
    busy,
    loading,
    saving,
    uploading,
    error,
    dirty,
    load,
    save,
    restore,
  };
}
