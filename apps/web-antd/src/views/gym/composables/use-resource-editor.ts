import type { FormInstance } from 'ant-design-vue';

import type { ResourcePageProps } from '../types';

import type { GymRow } from '#/api/gym';

import { computed, onScopeDispose, reactive, ref, watch } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '../../../api/gym';

export function useResourceEditor(props: ResourcePageProps, onSaved: (row: GymRow) => Promise<void>) {
  const saving = ref(false);
  const visible = ref(false);
  const current = ref<GymRow>();
  const form = reactive<Record<string, any>>({});
  const formRef = ref<FormInstance>();
  let requestKey = '';
  let openRequest = 0;
  const visibleFields = computed(() =>
    props.fields.filter(
      (field) =>
        !field.hidden &&
        !(current.value && field.immutable) &&
        (!field.onlyEdit || !!current.value) &&
        (!field.visibleWhen || field.visibleWhen(form)),
    ),
  );
  async function open(row?: GymRow) {
    if (saving.value) return;
    const request = ++openRequest;
    const endpoint = props.endpoint;
    requestKey = crypto.randomUUID();

    const raw = row
      ? await (props.loadDetail ? props.loadDetail(row) : gymApi.get(`${props.endpoint}/${row.id}`))
      : undefined;
    if (request !== openRequest || endpoint !== props.endpoint) return;
    current.value = row;
    for (const key of Object.keys(form)) Reflect.deleteProperty(form, key);
    const detail = raw && props.initial ? props.initial(raw) : raw;
    for (const f of props.fields)
      form[f.key] = detail?.[f.key] ?? structuredClone(f.default ?? (f.type === 'multi' ? [] : undefined));
    visible.value = true;
  }
  async function save() {
    if (saving.value) return;
    saving.value = true;
    try {
      try {
        await formRef.value?.validate();
      } catch {
        // Validation feedback is rendered beside the fields; keep the drawer open.
        return;
      }
      const payload: Record<string, any> = {};
      for (const f of visibleFields.value)
        if (form[f.key] !== undefined && form[f.key] !== '') payload[f.key] = form[f.key];
      const data = props.prepare ? props.prepare(payload, current.value) : payload;
      const saved = await (current.value
        ? gymApi.patch(`${props.endpoint}/${current.value.id}`, data)
        : gymApi.post(props.endpoint, data, props.idempotent ? requestKey : undefined));
      message.success('已保存');
      visible.value = false;
      await onSaved(saved);
    } finally {
      saving.value = false;
    }
  }

  watch(
    () => props.endpoint,
    () => {
      openRequest++;
      visible.value = false;
    },
  );
  onScopeDispose(() => {
    openRequest++;
  });
  function setFormRef(instance: unknown) {
    formRef.value = instance as FormInstance | undefined;
  }
  return { saving, visible, current, form, setFormRef, visibleFields, open, save };
}
