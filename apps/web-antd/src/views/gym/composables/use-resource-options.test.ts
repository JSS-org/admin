import { effectScope, nextTick, reactive } from 'vue';

import { expect, it, vi } from 'vitest';

import { useResourceOptions } from './use-resource-options';

const api = vi.hoisted(() => ({ listAll: vi.fn() }));
vi.mock('../../../api/gym', () => ({ gymApi: api }));

it('keeps loaded selects stable when employee detail updates inline options', async () => {
  api.listAll.mockResolvedValue([{ id: 'store1', name: '一店' }]);
  const props = reactive({
    endpoint: 'employees',
    title: '员工',
    columns: [],
    storeFilter: true,
    fields: [
      {
        key: 'storeIds',
        source: 'stores',
        label: '门店',
        options: undefined as undefined | { label: string; value: string }[],
      },
    ],
  });
  const scope = effectScope();
  const result = scope.run(() => useResourceOptions(props, {}));
  if (!result) throw new Error('Active test scope required');
  try {
    await vi.waitFor(() => expect(result.stores.value).toHaveLength(1));
    const previous = result.stores.value;
    const field = props.fields[0];
    if (!field) throw new Error('Store field required');
    props.fields = [{ ...field, options: [{ label: '发薪门店', value: 'store1' }] }];
    await nextTick();
    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(result.stores.value).toBe(previous);
    props.fields = [{ ...field, source: 'employees' }];
    await nextTick();
    expect(api.listAll).toHaveBeenCalledWith('employees');
  } finally {
    scope.stop();
  }
});
