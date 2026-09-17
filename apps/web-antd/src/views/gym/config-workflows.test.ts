import { effectScope } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePage as useContent } from './client-settings/use-page';
import { usePage as useSales } from './settings/use-page';

const api = vi.hoisted(() => ({ listAll: vi.fn(), get: vi.fn(), put: vi.fn() }));
vi.mock('../../api/gym', () => ({ gymApi: api }));
vi.mock('ant-design-vue', () => ({ message: { success: vi.fn(), error: vi.fn() } }));
vi.mock('vue', async (original) => ({ ...(await original<typeof import('vue')>()), onMounted: vi.fn() }));
const scopes: ReturnType<typeof effectScope>[] = [];
beforeEach(() => {
  vi.resetAllMocks();
  api.listAll.mockResolvedValue([{ id: 'store1', name: '一店' }]);
  api.get.mockResolvedValue({ id: 'config', blocks: [], offers: [], items: [], supportedChannels: [] });
});
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));

describe.each(['sales', 'content'])('%s configuration request lifecycle', (kind) => {
  function setup() {
    const scope = effectScope();
    scopes.push(scope);
    const page = scope.run(() => (kind === 'sales' ? useSales() : useContent()));
    if (!page) throw new Error('Test scope did not initialize');
    return {
      page,
      load: 'loadSettings' in page ? page.loadSettings : page.load,
      data: 'settings' in page ? page.settings : page.data,
    };
  }
  it('recovers when the first store request fails', async () => {
    api.listAll.mockRejectedValueOnce(new Error('offline'));
    const { page, load } = setup();
    await load();
    expect(page.error.value).toBe(true);
    expect(page.loading.value).toBe(false);
    await load();
    expect(page.error.value).toBe(false);
    expect(page.stores.value[0]?.id).toBe('store1');
    expect(api.get).toHaveBeenCalled();
  });
  it('discards a late response after switching stores', async () => {
    const { page, load, data } = setup();
    let finish!: (value: any) => void;
    api.get.mockImplementation((path: string, query?: Record<string, any>) => {
      const store = String(query?.storeId ?? '');
      if (store === 'store2' || path.includes('store2'))
        return new Promise((resolve) => {
          finish = resolve;
        });
      if (store === 'store3' || path.includes('store3')) return Promise.resolve({ id: 'new', blocks: [] });
      return Promise.resolve({ id: 'config', blocks: [], offers: [], items: [], supportedChannels: [] });
    });
    await load();
    page.storeId.value = 'store2';
    const old = load();
    page.storeId.value = 'store3';
    await load();
    finish({ id: 'old', blocks: [] });
    await old;
    expect(data.value.id).toBe('new');
    expect(page.dirty.value).toBe(false);
    expect(page.loading.value).toBe(false);
  });
});
