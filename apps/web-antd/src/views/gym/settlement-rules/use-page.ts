import type { GymRow } from '#/api/gym';

import { computed, onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';
import { useTableSelection } from '#/views/gym/components/use-table-selection';

export function usePage() {
  const stores = ref<GymRow[]>([]);
  const accounts = ref<GymRow[]>([]);
  const storeId = ref<string>();
  const rules = ref<GymRow[]>([]);
  const visible = ref(false);
  const busy = ref(false);
  const rulesLoading = ref(false);
  const rulesPage = ref(1);
  const rulesPageSize = ref(20);
  const currentRules = computed(() =>
    rules.value.slice((rulesPage.value - 1) * rulesPageSize.value, rulesPage.value * rulesPageSize.value),
  );
  const rulesSelectionDisabled = computed(() => rulesLoading.value || busy.value);
  const {
    clear: clearRulesSelection,
    rowSelection: rulesRowSelection,
    selectAll: selectAllRules,
    selectedKeys: selectedRuleKeys,
  } = useTableSelection(currentRules, rulesSelectionDisabled);
  const form = ref<Record<string, any>>({});
  async function loadRules() {
    clearRulesSelection();
    rulesPage.value = 1;
    const selectedStore = storeId.value;
    rulesLoading.value = true;
    try {
      const data = selectedStore ? await gymApi.listAll(`stores/${selectedStore}/settlement-rules`) : [];
      if (selectedStore === storeId.value) rules.value = data;
    } finally {
      if (selectedStore === storeId.value) rulesLoading.value = false;
    }
  }
  onMounted(async () => {
    stores.value = await gymApi.listAll('stores');
    accounts.value = await gymApi.listAll('payment-accounts');
    storeId.value = stores.value[0]?.id;
    await loadRules();
  });
  function edit(row?: Record<string, any>) {
    form.value = row
      ? JSON.parse(JSON.stringify(row))
      : {
          cycleUnit: 'day',
          cycleValue: 1,
          effectiveFrom: new Date().toISOString().slice(0, 10),
          items: [{ paymentAccountId: undefined, ratio: 1 }],
        };
    visible.value = true;
  }
  async function save() {
    busy.value = true;
    try {
      const { cycleUnit, cycleValue, effectiveFrom, effectiveTo, items } = form.value;
      const body = {
        cycleUnit,
        cycleValue,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        items,
      };
      await (form.value.id
        ? gymApi.patch(`settlement-rules/${form.value.id}`, body)
        : gymApi.post(`stores/${storeId.value}/settlement-rules`, body));
      visible.value = false;
      await loadRules();
      message.success('草稿已保存');
    } finally {
      busy.value = false;
    }
  }
  async function activate(row: Record<string, any>) {
    await gymApi.patch(`settlement-rules/${row.id}`, { status: 'active' });
    await loadRules();
  }
  const scopeFilter = computed({
    get: () => ({ storeId: storeId.value }),
    set: (value: Record<string, any>) => {
      storeId.value = value.storeId;
    },
  });
  return {
    stores,
    accounts,
    storeId,
    rules,
    visible,
    busy,
    rulesLoading,
    rulesPage,
    rulesPageSize,
    currentRules,
    rulesSelectionDisabled,
    clearRulesSelection,
    rulesRowSelection,
    selectAllRules,
    selectedRuleKeys,
    form,
    loadRules,
    edit,
    save,
    activate,
    scopeFilter,
  };
}
