import type { Ref } from 'vue';

import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

export function usePage(page: Readonly<Ref<null | ResourcePageHandle>>) {
  const current = ref<GymRow>();
  const visible = ref(false);
  const mode = ref('');
  const busy = ref(false);
  const contractName = ref('');
  const applicableType = ref('card');
  const reminderDays = ref(3);
  const fileId = ref<null | string>();
  function createContract() {
    current.value = undefined;
    contractName.value = '';
    fileId.value = undefined;
    mode.value = 'contract';
    visible.value = true;
  }
  async function newVersion(row: GymRow) {
    const result = await gymApi.post(`contract-templates/${row.id}/versions`, {});
    message.success('已创建新草稿版本');
    await page.value?.load();
    await page.value?.open(result);
  }
  function replaceFile(row: GymRow) {
    current.value = row;
    mode.value = 'file';
    fileId.value = undefined;
    visible.value = true;
  }
  async function save() {
    if (busy.value) return;
    if (mode.value === 'contract' && !contractName.value.trim()) {
      message.error('请填写模板名称');
      return;
    }
    busy.value = true;
    try {
      if (mode.value === 'contract') {
        if (!fileId.value) {
          message.error('请先上传合同PDF');
          return;
        }
        await gymApi.post('contract-templates', {
          name: contractName.value,
          fileId: fileId.value,
          applicableType: applicableType.value,
          reminderDays: reminderDays.value,
        });
      } else if (current.value && mode.value === 'file') {
        if (!fileId.value) {
          message.error('请先上传合同PDF');
          return;
        }
        await gymApi.patch(`contract-templates/${current.value.id}`, {
          fileId: fileId.value,
        });
      }
      message.success('已保存');
      visible.value = false;
      await page.value?.load();
    } finally {
      busy.value = false;
    }
  }
  return {
    visible,
    mode,
    busy,
    contractName,
    applicableType,
    reminderDays,
    fileId,
    createContract,
    newVersion,
    replaceFile,
    save,
  };
}
