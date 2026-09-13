<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import { Button, Descriptions, DescriptionsItem, message, Space, Table, Upload } from 'ant-design-vue';

import { canGym, gymApi, openGymFile, uploadGymFile } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { config, initial, prepare } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

const visible = ref(false);

const current = ref<GymRow>();

const rights = ref<
  {
    label: string;
    value: string;
    type: string;
  }[]
>([]);

const sessionId = ref<string>();

const memberId = ref<string>();

const rightId = ref<string>();

const note = ref('');

const saving = ref(false);

async function saveBooking() {
  const right = rights.value.find((r) => r.value === rightId.value);
  if (!sessionId.value || !memberId.value || !right) {
    message.error('请选择课程、会员和预约权益');
    return;
  }
  saving.value = true;
  try {
    await gymApi.post('bookings', {
      sessionId: sessionId.value,
      memberId: memberId.value,
      [right.type]: right.value,
      note: note.value,
    });
    message.success('预约成功');
    visible.value = false;
    await page.value?.load();
  } finally {
    saving.value = false;
  }
}

async function detail(row: GymRow) {
  current.value = await gymApi.get(`body-measurements/${row.id}`);
  visible.value = true;
}

async function report(file: File) {
  if (!current.value) return false;
  saving.value = true;
  try {
    const uploaded = await uploadGymFile(file, 'body_report', current.value.storeId);
    await gymApi.patch(`body-measurements/${current.value.id}`, {
      reportFileId: uploaded.id,
    });
    await detail(current.value);
    message.success('报告已保存');
  } finally {
    saving.value = false;
  }
  return false;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="config.title"
      endpoint="body-measurements"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="true"
      :initial="initial"
      :prepare="prepare"
      store-filter
      time-filter
    >
      <template #actions="{ row }">
        <Button type="link" @click="detail(row)"> 详情 / 报告 </Button>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" title="体测详情" :confirm-loading="saving" :footer="null" @ok="saveBooking">
      <template v-if="current">
        <Descriptions :column="1" bordered>
          <DescriptionsItem v-for="{ title, dataIndex: key } in config.columns" :key="key" :label="title">{{
            current[key ?? ''] ?? '—'
          }}</DescriptionsItem>
          <DescriptionsItem label="备注">{{ current.note }}</DescriptionsItem>
        </Descriptions>
        <Table
          v-if="current.measurements?.length"
          :data-source="current.measurements"
          :pagination="false"
          :columns="[
            { title: '测量项', dataIndex: 'name' },
            { title: '值', dataIndex: 'value' },
            { title: '单位', dataIndex: 'unit' },
          ]"
        />
        <Space class="mt-4">
          <Button v-if="current.reportFileId" @click="openGymFile(current.reportFileId)"> 查看报告 </Button>
          <Upload
            v-if="canGym('measurements:write')"
            :before-upload="report"
            :show-upload-list="false"
            accept=".pdf,.png,.jpg,.jpeg"
          >
            <Button :loading="saving">上传 / 更新报告</Button>
          </Upload>
        </Space>
      </template>
    </AdminDrawer>
  </div>
</template>
