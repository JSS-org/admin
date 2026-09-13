<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  message,
  Select,
  Space,
  Table,
} from 'ant-design-vue';

import { canGym, gymApi, openGymFile } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields, isTemplate, title } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

const current = ref<GymRow>();

const visible = ref(false);

const mode = ref('');

const busy = ref(false);

const channel = ref('sms');

const reminders = ref<GymRow[]>([]);

let requestKey = '';

async function details(row: GymRow) {
  current.value = await gymApi.get(`contracts/${row.id}`);
  const result = await gymApi.list(`contracts/${row.id}/reminders`);
  reminders.value = result.items;
  mode.value = 'detail';
  visible.value = true;
}

function remind(row: GymRow) {
  current.value = row;
  mode.value = 'remind';
  requestKey = crypto.randomUUID();
  visible.value = true;
}

async function save() {
  busy.value = true;
  try {
    if (current.value && mode.value === 'remind') {
      const result = await gymApi.post(
        `contracts/${current.value.id}/reminders`,
        { channel: channel.value },
        requestKey,
      );
      if (result.status === 'failed') message.warning(result.failureReason);
      visible.value = false;
      await page.value?.load();
      return;
    }
    message.success('已保存');
    visible.value = false;
    await page.value?.load();
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="title"
      endpoint="contracts"
      :fields="fields"
      :columns="columns"
      :create="false"
      :edit="isTemplate"
      :store-filter="true"
      :time-filter="true"
    >
      <template #actions="{ row }">
        <Button type="link" @click="details(row)"> 详情 </Button>
        <Button
          v-if="['unsigned', 'sent', 'viewed'].includes(row.status) && canGym('contracts:remind')"
          type="link"
          @click="remind(row)"
        >
          未签提醒
        </Button>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="mode === 'detail' ? '合同记录详情' : '管理操作'"
      :width="760"
      :footer="mode === 'detail' ? null : undefined"
      :confirm-loading="busy"
      @ok="save"
    >
      <Form v-if="mode === 'remind'" layout="vertical">
        <Alert type="info" message="当前为Mock，未配置真实渠道时会记录失败结果，不会发送消息。" />
        <FormItem label="渠道">
          <Select
            v-model:value="channel"
            :options="[
              { label: '短信', value: 'sms' },
              { label: '小程序', value: 'miniapp' },
              { label: 'App', value: 'app' },
            ]"
          />
        </FormItem>
      </Form>
      <template v-else-if="current">
        <Descriptions :column="2" bordered>
          <DescriptionsItem v-for="column in columns" :key="column.dataIndex" :label="column.title">{{
            current[column.dataIndex] ?? '—'
          }}</DescriptionsItem>
        </Descriptions>
        <Descriptions :column="1" bordered class="mt-3">
          <DescriptionsItem label="签署IP">{{ current.signIp ?? '尚未签署' }}</DescriptionsItem>
          <DescriptionsItem label="设备标识">{{ current.signDeviceUid ?? '—' }}</DescriptionsItem>
          <DescriptionsItem label="签署设备信息">{{ current.signUserAgent ?? '—' }}</DescriptionsItem>
        </Descriptions>
        <Space class="my-3">
          <Button v-if="current.unsignedFileId" @click="openGymFile(current.unsignedFileId)"> 合同原件 </Button>
          <Button v-if="current.signedFileId" @click="openGymFile(current.signedFileId)"> 已签合同 </Button>
        </Space>
        <Table
          :data-source="current.events"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '事件', dataIndex: 'type' },
            { title: '时间', dataIndex: 'occurredAt' },
            { title: 'IP', dataIndex: 'ip' },
          ]"
        />
        <Table
          :data-source="reminders"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '提醒时间', dataIndex: 'scheduledAt' },
            { title: '状态', dataIndex: 'status' },
            { title: '失败原因', dataIndex: 'failureReason' },
          ]"
        />
      </template>
    </AdminDrawer>
  </div>
</template>
