import type { GymRow } from '#/api/gym';

import { computed, onMounted, onScopeDispose, ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import { prepareSettings, validateSettings } from './settings-form';

const TABS = ['online-sales-settings', 'subscription-settings', 'verification-settings'] as const;

interface CacheEntry {
  snapshot: string;
  cards: GymRow[];
}

export function usePage() {
  const stores = ref<GymRow[]>([]);
  const cards = ref<GymRow[]>([]);
  const storeId = ref<string>();
  const tab = ref<string>(TABS[0]);
  const settings = ref<Record<string, any>>({ offers: [], items: [], supportedChannels: [] });
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(false);
  const snapshot = ref('');
  const busy = computed(() => loading.value || saving.value);
  const dirty = computed(() => !!snapshot.value && JSON.stringify(settings.value) !== snapshot.value);
  const cache = new Map<string, CacheEntry>();
  let request = 0;
  let storesLoaded = false;
  function cacheKey(store: string, kind: string) {
    return `${store}:${kind}`;
  }
  async function fetchSettings(store: string, kind: string): Promise<CacheEntry> {
    const [data, templates] = await Promise.all([
      gymApi.get(`stores/${store}/${kind}`),
      kind === 'verification-settings' ? [] : gymApi.listAll('card-templates', { storeId: store, status: 'published' }),
    ]);
    const value: Record<string, any> = { offers: [], items: [], supportedChannels: [], ...data };
    for (const offer of value.offers) offer.timing = offer.startsAt || offer.endsAt ? 'scheduled' : 'always';
    value.timeMode = data.allowedStart || data.allowedEnd ? 'limited' : 'all';
    return { snapshot: JSON.stringify(value), cards: templates };
  }
  function apply(entry: CacheEntry) {
    settings.value = JSON.parse(entry.snapshot);
    cards.value = entry.cards;
    snapshot.value = entry.snapshot;
  }
  async function preload(store: string) {
    await Promise.all(
      TABS.filter((kind) => !cache.has(cacheKey(store, kind))).map(async (kind) => {
        try {
          const entry = await fetchSettings(store, kind);
          if (!cache.has(cacheKey(store, kind))) cache.set(cacheKey(store, kind), entry);
        } catch {
          // Preload is best effort; the tab retries on demand.
        }
      }),
    );
  }
  async function loadSettings() {
    const current = ++request;
    error.value = false;
    if (!storesLoaded) {
      loading.value = true;
      try {
        const availableStores = await gymApi.listAll('stores');
        if (current !== request) return;
        stores.value = availableStores;
        storeId.value = availableStores[0]?.id;
        storesLoaded = true;
      } catch {
        if (current === request) {
          error.value = true;
          loading.value = false;
        }
        return;
      }
    }
    if (!storeId.value) {
      loading.value = false;
      return;
    }
    const cached = cache.get(cacheKey(storeId.value, tab.value));
    if (cached) {
      apply(cached);
      loading.value = false;
      void preload(storeId.value);
      return;
    }
    loading.value = true;
    snapshot.value = '';
    try {
      const entry = await fetchSettings(storeId.value, tab.value);
      if (current !== request) return;
      cache.set(cacheKey(storeId.value, tab.value), entry);
      apply(entry);
    } catch {
      if (current === request) error.value = true;
    } finally {
      if (current === request) loading.value = false;
    }
    if (current === request && storeId.value) void preload(storeId.value);
  }
  onMounted(loadSettings);
  onScopeDispose(() => request++);
  const entries = computed<any[]>(() =>
    tab.value === 'online-sales-settings' ? settings.value.offers : settings.value.items,
  );
  const cardOptions = computed(() =>
    cards.value
      .filter(
        (c) =>
          tab.value !== 'subscription-settings' ||
          (c.kind === 'period' && c.durationDays >= 28 && c.durationDays <= 31),
      )
      .map((c) => ({ label: `${c.name} · v${c.version}`, value: c.id })),
  );
  function addSetting() {
    entries.value.push(
      tab.value === 'online-sales-settings'
        ? {
            cardTemplateId: undefined,
            salePrice: '0.00',
            enabled: true,
            contractRequired: true,
            approvalRequired: false,
            timing: 'always',
          }
        : {
            cardTemplateId: undefined,
            price: '0.00',
            billingDay: null,
            renewalNoticeDays: 3,
            graceDays: 3,
            enabled: true,
            contractRequired: true,
            approvalRequired: false,
          },
    );
  }
  function restore() {
    if (snapshot.value) settings.value = JSON.parse(snapshot.value);
  }
  async function saveSettings() {
    if (busy.value || !storeId.value || error.value) return;
    const validation = validateSettings(tab.value, settings.value);
    if (validation) {
      message.error(validation);
      return;
    }
    saving.value = true;
    const store = storeId.value;
    const kind = tab.value;
    try {
      await gymApi.put(`stores/${store}/${kind}`, prepareSettings(kind, settings.value));
      message.success('设置已保存');
      cache.delete(cacheKey(store, kind));
      await loadSettings();
    } finally {
      saving.value = false;
    }
  }
  return {
    stores,
    storeId,
    tab,
    settings,
    busy,
    loading,
    saving,
    error,
    dirty,
    entries,
    restore,
    loadSettings,
    cardOptions,
    addSetting,
    saveSettings,
  };
}
