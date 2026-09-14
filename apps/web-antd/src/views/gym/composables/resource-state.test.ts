import type { ResourcePageProps } from '../types';

import { effectScope, nextTick, reactive, ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTableSelection } from '../components/use-table-selection';
import { useResourceEditor } from './use-resource-editor';
import { useResourceList } from './use-resource-list';
import { useResourceOptions } from './use-resource-options';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  listAll: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../../api/gym', () => ({ gymApi: api }));

vi.mock('ant-design-vue', () => ({ message: { success: vi.fn() } }));

const scopes: ReturnType<typeof effectScope>[] = [];

function setup<T>(callback: () => T): T {
  const scope = effectScope();
  scopes.push(scope);
  const result = scope.run(callback);
  if (result === undefined) throw new Error('Test scope did not initialize');
  return result;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const pageData = (id: string) => ({ items: [{ id }], total: 1, page: 1, pageSize: 20 });

const flush = async () => {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
});

describe('resource list and selection', () => {
  it('retains filters after failure and recovers on retry without showing stale rows', async () => {
    api.list
      .mockResolvedValueOnce(pageData('old'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(pageData('new'));
    const list = setup(() => useResourceList(() => 'members'));
    await flush();
    list.filterDraft.value = { keyword: '  新会员  ', storeId: '', enabled: false };
    await list.search();
    expect(list.error.value).toBe(true);
    expect(list.items.value).toEqual([]);
    expect(list.hasFilters.value).toBe(true);
    await list.load();
    expect(api.list).toHaveBeenLastCalledWith('members', { keyword: '新会员', enabled: false, page: 1, pageSize: 20 });
    expect(list.error.value).toBe(false);
    expect(list.items.value).toEqual([{ id: 'new' }]);
  });

  it('returns to the last available page when the result count shrinks', async () => {
    api.list.mockResolvedValue(pageData('last'));
    const list = setup(() => useResourceList(() => 'members'));
    await flush();
    list.page.value = 4;
    await list.load();
    expect(list.page.value).toBe(1);
    expect(api.list).toHaveBeenLastCalledWith('members', { page: 1, pageSize: 20 });
    expect(list.loading.value).toBe(false);
  });

  it('ignores a stale request failure after a newer query succeeds', async () => {
    let reject!: (error: Error) => void;
    api.list
      .mockReturnValueOnce(
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
      )
      .mockResolvedValueOnce(pageData('new'));
    const list = setup(() => useResourceList(() => 'members'));
    await list.search();
    reject(new Error('old failure'));
    await flush();
    expect(list.error.value).toBe(false);
    expect(list.items.value).toEqual([{ id: 'new' }]);
  });

  it('keeps the latest query when responses arrive out of order', async () => {
    const first = deferred<ReturnType<typeof pageData>>();
    const second = deferred<ReturnType<typeof pageData>>();
    api.list.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const list = setup(() => useResourceList(() => 'members'));
    list.page.value = 3;
    list.filterDraft.value = { keyword: '新会员', storeId: 'store-2' };
    const search = list.search();
    expect(api.list).toHaveBeenLastCalledWith('members', {
      keyword: '新会员',
      storeId: 'store-2',
      page: 1,
      pageSize: 20,
    });
    second.resolve(pageData('new'));
    await search;
    first.resolve(pageData('old'));
    await flush();
    expect(list.items.value).toEqual([{ id: 'new' }]);
    expect(list.loading.value).toBe(false);
  });

  it('clears query and rows when changing resource and ignores pending work after disposal', async () => {
    api.list.mockResolvedValueOnce(pageData('old'));
    const pending = deferred<ReturnType<typeof pageData>>();
    api.list.mockReturnValueOnce(pending.promise);
    const endpoint = ref('members');
    const list = setup(() => useResourceList(() => endpoint.value));
    await flush();
    list.filterDraft.value = { keyword: 'old filter' };
    endpoint.value = 'stores';
    await nextTick();
    expect(list.items.value).toEqual([]);
    expect(list.total.value).toBe(0);
    expect(list.filterDraft.value).toEqual({});
    scopes.at(-1)?.stop();
    pending.resolve(pageData('late'));
    await flush();
    expect(list.items.value).toEqual([]);
  });

  it('selects only the visible page, blocks selection while loading and prunes removed rows', () => {
    const items = ref([{ id: 'a' }, { id: 'b' }]);
    const disabled = ref(false);
    const selection = setup(() => useTableSelection(items, disabled));
    selection.selectAll();
    expect(selection.selectedKeys.value).toEqual(['a', 'b']);
    items.value = [{ id: 'b' }, { id: 'c' }];
    expect(selection.selectedKeys.value).toEqual(['b']);
    disabled.value = true;
    selection.selectAll();
    expect(selection.selectedKeys.value).toEqual(['b']);
    selection.clear();
    expect(selection.selectedRows.value).toEqual([]);
  });
});

describe('resource editor', () => {
  it('only validates and submits fields belonging to the selected type', async () => {
    const editor = setup(() =>
      useResourceEditor(
        {
          title: '卡种',
          endpoint: 'card-templates',
          columns: [],
          fields: [
            { key: 'kind', label: '类型', default: 'period' },
            { key: 'durationDays', label: '天数', default: 30, visibleWhen: (values) => values.kind === 'period' },
            { key: 'includedUses', label: '次数', default: 10, visibleWhen: (values) => values.kind === 'count' },
            { key: 'salaryMode', label: '仅编辑', onlyEdit: true },
          ],
        },
        vi.fn(),
      ),
    );
    api.post.mockResolvedValue({ id: 'new' });
    await editor.open();
    expect(editor.visibleFields.value.map((field) => field.key)).toEqual(['kind', 'durationDays']);
    editor.form.kind = 'count';
    await editor.save();
    expect(api.post).toHaveBeenCalledWith('card-templates', { kind: 'count', includedUses: 10 }, undefined);
  });
  const props = (): ResourcePageProps => ({
    title: '会员',
    endpoint: 'members',
    columns: [],
    idempotent: true,
    fields: [
      { key: 'name', label: '姓名' },
      { key: 'storeId', label: '门店', immutable: true },
    ],
  });

  it('keeps the last opened row when detail requests race', async () => {
    const first = deferred<{ id: string; name: string }>();
    api.get.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ id: 'b', name: '乙' });
    const editor = setup(() => useResourceEditor(props(), vi.fn()));
    const opening = editor.open({ id: 'a' });
    await editor.open({ id: 'b' });
    first.resolve({ id: 'a', name: '甲' });
    await opening;
    expect(editor.current.value?.id).toBe('b');
    expect(editor.form.name).toBe('乙');
  });

  it('validates, transforms fields, excludes immutable values on edit and notifies after saving', async () => {
    api.get.mockResolvedValue({ id: 'a', name: '会员', storeId: 'original' });
    api.patch.mockResolvedValue({ id: 'a', name: '修改' });
    const saved = vi.fn();
    const options = props();
    options.prepare = (values) => ({ ...values, name: values.name.trim() });
    const editor = setup(() => useResourceEditor(options, saved));
    const validate = vi.fn().mockResolvedValue(undefined);
    editor.setFormRef({ validate });
    await editor.open({ id: 'a' });
    editor.form.name = ' 修改 ';
    editor.form.storeId = 'different';
    await editor.save();
    expect(validate).toHaveBeenCalledOnce();
    expect(api.patch).toHaveBeenCalledWith('members/a', { name: '修改' });
    expect(saved).toHaveBeenCalledWith({ id: 'a', name: '修改' });
    expect(editor.visible.value).toBe(false);
    expect(editor.saving.value).toBe(false);
  });

  it('reuses the idempotency key for a failed create retry and preserves the open form', async () => {
    api.post.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 'created' });
    const editor = setup(() => useResourceEditor(props(), vi.fn()));
    await editor.open();
    editor.form.name = '新会员';
    await expect(editor.save()).rejects.toThrow('offline');
    expect(editor.visible.value).toBe(true);
    expect(editor.saving.value).toBe(false);
    const key = api.post.mock.calls[0]?.[2];
    await editor.save();
    expect(api.post.mock.calls[1]?.[2]).toBe(key);
    expect(key).toBeTruthy();
  });

  it('does not save when form validation fails', async () => {
    const editor = setup(() => useResourceEditor(props(), vi.fn()));
    editor.setFormRef({ validate: () => Promise.reject(new Error('required')) });
    await editor.open();
    await editor.save();
    expect(api.post).not.toHaveBeenCalled();
    expect(editor.saving.value).toBe(false);
  });
});

describe('resource options', () => {
  it('loads each reference once and limits dependent choices to the selected store', async () => {
    api.listAll.mockImplementation(async (source: string) =>
      source === 'stores'
        ? [{ id: 's1', name: '一店' }]
        : [
            { id: 'm1', name: '会员甲', storeIds: ['s1'] },
            { id: 'm2', name: '会员乙', registeredStoreId: 's2' },
          ],
    );
    const field = { key: 'memberId', label: '会员', source: 'members' };
    const props = reactive<ResourcePageProps>({
      title: '',
      endpoint: 'bookings',
      columns: [],
      storeFilter: true,
      fields: [field, { ...field, key: 'otherId' }],
    });
    const form = reactive({ storeId: 's1' });
    const options = setup(() => useResourceOptions(props, form));
    await flush();
    expect(api.listAll).toHaveBeenCalledTimes(2);
    expect(options.fieldOptions(field)).toEqual([{ label: '会员甲', value: 'm1' }]);
    form.storeId = 's2';
    expect(options.fieldOptions(field)).toEqual([{ label: '会员乙', value: 'm2' }]);
  });
});
