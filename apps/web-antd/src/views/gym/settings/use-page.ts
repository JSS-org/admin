import type { GymRow } from '#/api/gym';

import { computed, onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

export function usePage() {
  const stores = ref<GymRow[]>([]);
  const cards = ref<GymRow[]>([]);
  const storeId = ref<string>();
  const tab = ref('online-sales-settings');
  const settings = ref<Record<string, any>>({});
  const busy = ref(false);
  async function loadSettings() {
    if (!storeId.value) return;
    busy.value = true;
    try {
      settings.value = await gymApi.get(`stores/${storeId.value}/${tab.value}`);
      cards.value = await gymApi.listAll('card-templates', {
        storeId: storeId.value,
        status: 'published',
      });
    } finally {
      busy.value = false;
    }
  }
  onMounted(async () => {
    stores.value = await gymApi.listAll('stores');
    storeId.value = stores.value[0]?.id;
    await loadSettings();
  });
  const cardOptions = computed(() =>
    cards.value
      .filter(
        (c) =>
          tab.value !== 'subscription-settings' ||
          (c.kind === 'period' && c.durationDays >= 28 && c.durationDays <= 31),
      )
      .map((c) => ({ label: `${c.name} v${c.version}`, value: c.id })),
  );
  function addSetting() {
    if (tab.value === 'online-sales-settings')
      settings.value.offers.push({
        cardTemplateId: undefined,
        salePrice: '0.00',
        enabled: true,
      });
    else
      settings.value.items.push({
        cardTemplateId: undefined,
        price: '0.00',
        billingDay: null,
        renewalNoticeDays: 3,
        graceDays: 3,
        enabled: true,
      });
  }
  async function saveSettings() {
    if (!storeId.value) return;
    busy.value = true;
    try {
      let data: Record<string, any> = {
        enabled: settings.value.enabled,
        requireCheckin: settings.value.requireCheckin,
        supportedChannels: settings.value.supportedChannels,
        allowedStart: settings.value.allowedStart || null,
        allowedEnd: settings.value.allowedEnd || null,
      };
      if (tab.value === 'online-sales-settings')
        data = {
          enabled: settings.value.enabled,
          contractRequired: settings.value.contractRequired,
          offers: settings.value.offers.map((o: GymRow) => ({
            cardTemplateId: o.cardTemplateId,
            salePrice: o.salePrice,
            enabled: o.enabled,
            startsAt: o.startsAt || null,
            endsAt: o.endsAt || null,
          })),
        };
      if (tab.value === 'subscription-settings')
        data = {
          items: settings.value.items.map((i: GymRow) => ({
            cardTemplateId: i.cardTemplateId,
            price: i.price,
            billingDay: i.billingDay,
            renewalNoticeDays: i.renewalNoticeDays,
            graceDays: i.graceDays,
            enabled: i.enabled,
          })),
        };
      await gymApi.put(`stores/${storeId.value}/${tab.value}`, data);
      message.success('设置已保存');
      await loadSettings();
    } finally {
      busy.value = false;
    }
  }
  const scopeFilter = computed({
    get: () => ({ storeId: storeId.value }),
    set: (value: Record<string, any>) => {
      storeId.value = value.storeId;
    },
  });
  return { stores, storeId, tab, settings, busy, loadSettings, cardOptions, addSetting, saveSettings, scopeFilter };
}
