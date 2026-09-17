import type { GymRow } from '#/api/gym';

import { computed, onMounted, onScopeDispose, ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import { prepareSettings, validateSettings } from './settings-form';

export function usePage() {
  const stores = ref<GymRow[]>([]);
  const cards = ref<GymRow[]>([]);
  const storeId = ref<string>();
  const tab = ref('online-sales-settings');
  const settings = ref<Record<string, any>>({ offers: [], items: [], supportedChannels: [] });
  const loading = ref(false);
  const saving = ref(false);
  const error = ref(false);
  const snapshot = ref('');
  const busy = computed(() => loading.value || saving.value);
  const dirty = computed(() => !!snapshot.value && JSON.stringify(settings.value) !== snapshot.value);
  let request = 0;
  let storesLoaded = false;
  async function loadSettings() {
    const current = ++request;
    loading.value = true;
    error.value = false;
    snapshot.value = '';
    try {
      if (!storesLoaded) {
        const availableStores = await gymApi.listAll('stores');
        if (current !== request) return;
        stores.value = availableStores;
        storeId.value = availableStores[0]?.id;
        storesLoaded = true;
      }
      if (!storeId.value) return;
      const endpoint = `stores/${storeId.value}/${tab.value}`;
      const [data, templates] = await Promise.all([
        gymApi.get(endpoint),
        tab.value === 'verification-settings'
          ? []
          : gymApi.listAll('card-templates', { storeId: storeId.value, status: 'published' }),
      ]);
      if (current !== request) return;
      settings.value = { offers: [], items: [], supportedChannels: [], ...data };
      for (const offer of settings.value.offers) offer.timing = offer.startsAt || offer.endsAt ? 'scheduled' : 'always';
      settings.value.timeMode = data.allowedStart || data.allowedEnd ? 'limited' : 'all';
      cards.value = templates;
      snapshot.value = JSON.stringify(settings.value);
    } catch {
      if (current === request) error.value = true;
    } finally {
      if (current === request) loading.value = false;
    }
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
    const endpoint = `stores/${storeId.value}/${tab.value}`;
    try {
      await gymApi.put(endpoint, prepareSettings(tab.value, settings.value));
      message.success('设置已保存');
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
