import type { GymRow } from '#/api/gym';

import { computed, onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi, uploadGymFile } from '#/api/gym';

export function usePage() {
  const stores = ref<GymRow[]>([]);
  const storeId = ref<string>();
  const platform = ref('miniapp');
  const data = ref<Record<string, any>>({ blocks: [], models: [] });
  const busy = ref(false);
  async function load() {
    busy.value = true;
    try {
      data.value = await gymApi.get('client-settings', { platform: platform.value, storeId: storeId.value });
    } finally {
      busy.value = false;
    }
  }
  onMounted(async () => {
    stores.value = await gymApi.listAll('stores');
    await load();
  });
  async function upload(file: File, target: Record<string, any>, key: string, list = false) {
    busy.value = true;
    try {
      const result = await uploadGymFile(file, file.type.startsWith('video/') ? 'video' : 'image', storeId.value);
      if (list) target[key].push(result.id);
      else target[key] = result.id;
      message.success('文件已上传，请保存配置');
    } finally {
      busy.value = false;
    }
    return false;
  }
  async function save() {
    busy.value = true;
    try {
      const body: Record<string, any> = {};
      for (const key of [
        'appId',
        'systemName',
        'coverFileId',
        'welcomeText',
        'customerService',
        'appDownloadUrl',
        'enabled',
      ])
        body[key] = data.value[key];
      body.platform = platform.value;
      body.storeId = storeId.value;
      body.blocks = data.value.blocks.map((b: GymRow, index: number) => ({
        blockType: b.blockType,
        title: b.title,
        body: b.body,
        fileId: b.fileId,
        linkUrl: b.linkUrl,
        sortOrder: index,
        enabled: b.enabled,
      }));
      await gymApi.put('client-settings', body);
      message.success('配置已保存');
      await load();
    } finally {
      busy.value = false;
    }
  }
  const scopeFilter = computed({
    get: () => ({ storeId: storeId.value, platform: platform.value }),
    set: (value: Record<string, any>) => {
      storeId.value = value.storeId;
      platform.value = value.platform;
    },
  });
  return { stores, data, busy, load, upload, save, scopeFilter };
}
