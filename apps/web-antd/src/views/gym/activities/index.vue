<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import { Button, Descriptions, DescriptionsItem, Form, FormItem, message, Tag } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import EntityRecords from '#/views/gym/components/entity-records.vue';
import FileMedia from '#/views/gym/components/file-media.vue';
import FileUpload from '#/views/gym/components/file-upload.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import { displayValue, statusColor } from '#/views/gym/utils/display';

import { columns, fields, initial, prepare, title } from './data';
const page = useTemplateRef<ResourcePageHandle>('page');
const busy = ref(false);
const uploading = ref(false);
const visible = ref(false);
const current = ref<GymRow>();
const mode = ref('');
function open(row: GymRow, action: string) {
  if (busy.value || uploading.value) return;
  current.value = { ...row };
  mode.value = action;
  visible.value = true;
}
async function saveCover() {
  if (!current.value || busy.value || uploading.value) return;
  busy.value = true;
  try {
    await gymApi.patch(`activities/${current.value.id}`, { coverFileId: current.value.coverFileId ?? null });
    visible.value = false;
    await page.value?.load();
    message.success('活动封面已保存');
  } finally {
    busy.value = false;
  }
}
async function setStatus(row: GymRow, status: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    await gymApi.patch(`activities/${row.id}`, { status });
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
      endpoint="activities"
      :fields="fields"
      :columns="columns"
      write-code="activities:manage"
      :prepare="prepare"
      :initial="initial"
      store-filter
      time-filter
    >
      <template #actions="{ row }">
        <Button type="link" @click="open(row, 'detail')">活动详情</Button>
        <template v-if="canGym('activities:manage')">
          <Button type="link" @click="open(row, 'cover')">编辑封面</Button>
          <Button v-if="row.status === 'draft'" type="link" :disabled="busy" @click="setStatus(row, 'published')"
            >发布</Button
          >
          <Button v-if="row.status === 'published'" type="link" :disabled="busy" @click="setStatus(row, 'closed')"
            >结束报名</Button
          >
          <Button
            v-if="['draft', 'published'].includes(row.status)"
            type="link"
            danger
            :disabled="busy"
            @click="setStatus(row, 'cancelled')"
            >取消活动</Button
          >
        </template>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="mode === 'cover' ? '编辑活动封面' : current?.name"
      :footer="mode === 'cover' ? undefined : null"
      :width="850"
      :confirm-loading="busy || uploading"
      @ok="saveCover"
    >
      <Form v-if="mode === 'cover' && current" layout="vertical"
        ><FormItem label="活动封面"
          ><FileUpload
            v-model="current.coverFileId"
            category="image"
            :disabled="busy || uploading"
            @uploading="uploading = $event" /></FormItem
      ></Form>
      <template v-else-if="current">
        <FileMedia v-if="current.coverFileId" :file-id="current.coverFileId" :alt="current.name" class="mb-5" />
        <Tag :color="statusColor(current.status)">{{ displayValue(current.status, 'status', [], {}) }}</Tag>
        <p class="my-4 whitespace-pre-wrap leading-7">{{ current.description }}</p>
        <Descriptions :column="1" bordered class="mb-5"
          ><DescriptionsItem label="活动门店">{{ current.storeNames }}</DescriptionsItem
          ><DescriptionsItem label="活动时间"
            >{{ displayValue(current.startsAt, 'startsAt', [], {}) }} —
            {{ displayValue(current.endsAt, 'endsAt', [], {}) }}</DescriptionsItem
          ><DescriptionsItem label="报名情况"
            >{{ current.registrationCount }} / {{ current.capacity ?? '不限' }}</DescriptionsItem
          ></Descriptions
        >
        <h3 class="mb-3 font-medium">报名记录</h3>
        <EntityRecords
          :endpoint="`activities/${current.id}/registrations`"
          :params="{}"
          :columns="[
            { title: '会员', dataIndex: 'memberName' },
            { title: '门店', dataIndex: 'storeName' },
            { title: '状态', dataIndex: 'status' },
            { title: '报名时间', dataIndex: 'registeredAt' },
          ]"
        />
      </template>
    </AdminDrawer>
  </div>
</template>
