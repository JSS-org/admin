import type { TableRowSelection } from 'ant-design-vue/es/table/interface';

import type { Ref } from 'vue';

import { computed, ref, watch } from 'vue';

export function useTableSelection<T extends { id: string }>(
  items: Readonly<Ref<T[]>>,
  disabled: Readonly<Ref<boolean>>,
) {
  const selectedKeys = ref<string[]>([]);
  const selectedRows = computed(() => items.value.filter((row) => selectedKeys.value.includes(row.id)));

  function clear() {
    selectedKeys.value = [];
  }

  function selectAll() {
    if (!disabled.value) selectedKeys.value = items.value.map((row) => row.id);
  }

  const rowSelection = computed<TableRowSelection<T>>(() => ({
    fixed: true,
    selectedRowKeys: selectedKeys.value,
    getCheckboxProps: () => ({ disabled: disabled.value }),
    onChange: (keys) => {
      if (!disabled.value) selectedKeys.value = items.value.filter((row) => keys.includes(row.id)).map((row) => row.id);
    },
  }));

  watch(
    items,
    () => {
      selectedKeys.value = selectedKeys.value.filter((key) => items.value.some((row) => row.id === key));
    },
    { flush: 'sync' },
  );

  return { clear, rowSelection, selectAll, selectedKeys, selectedRows };
}
