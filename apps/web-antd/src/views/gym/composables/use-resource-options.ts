import type { Field, ResourcePageProps } from '../types';

import type { GymRow } from '#/api/gym';

import { onScopeDispose, reactive, ref, watch } from 'vue';

import { gymApi } from '../../../api/gym';

export function useResourceOptions(props: ResourcePageProps, form: Record<string, any>) {
  const options = reactive<Record<string, { label: string; value: any }[]>>({});
  const sourceRows = reactive<Record<string, GymRow[]>>({});
  const stores = ref<{ label: string; value: string }[]>([]);
  let request = 0;
  async function loadOptions() {
    const current = ++request;
    const sources = [...new Set(props.fields.flatMap((field) => (field.source ? [field.source] : [])))];
    if (props.storeFilter && !sources.includes('stores')) sources.push('stores');
    Object.keys(options).forEach((key) => Reflect.deleteProperty(options, key));
    Object.keys(sourceRows).forEach((key) => Reflect.deleteProperty(sourceRows, key));
    stores.value = [];
    await Promise.all(
      sources.map(async (source) => {
        const rows = await gymApi.listAll(source);
        if (current !== request) return;
        const values = rows.map((row) => ({ label: row.name ?? row.title ?? row.code, value: row.id }));
        sourceRows[source] = rows;
        props.fields
          .filter((field) => field.source === source)
          .forEach((field) => {
            const label = field.optionLabel;
            options[field.key] = label ? rows.map((row) => ({ label: label(row), value: row.id })) : values;
          });
        if (source === 'stores') stores.value = values;
      }),
    );
  }
  function fieldOptions(field: Field) {
    if (field.options) return field.options;
    if (!field.source || !form.storeId || field.source === 'stores') return options[field.key] ?? [];
    return (sourceRows[field.source] ?? [])
      .filter((r) => {
        if (field.source === 'course-products' && (r.kind !== 'group' || r.status !== 'active')) return false;
        if (field.source === 'members')
          return r.storeIds?.includes(form.storeId) || r.registeredStoreId === form.storeId;
        if (!r.storeId && !r.storeIds) return true;
        return r.storeId === form.storeId || r.storeIds?.includes(form.storeId);
      })
      .map((r) => ({ label: field.optionLabel ? field.optionLabel(r) : (r.name ?? r.title ?? r.code), value: r.id }));
  }

  watch(
    () => form.storeId,
    (storeId, previous) => {
      if (storeId === previous || previous === undefined) return;
      for (const field of props.fields) {
        if (!field.source || field.source === 'stores' || !sourceRows[field.source]) continue;
        const allowed = new Set(fieldOptions(field).map((option) => option.value));
        if (Array.isArray(form[field.key]))
          form[field.key] = form[field.key].filter((value: any) => allowed.has(value));
        else if (!allowed.has(form[field.key])) form[field.key] = undefined;
      }
    },
  );

  watch(
    [
      () => props.endpoint,
      () => JSON.stringify(props.fields.map(({ key, source }) => ({ key, source }))),
      () => props.storeFilter,
    ],
    () => {
      void loadOptions();
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    request++;
  });
  return { options, stores, fieldOptions };
}
