<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import { Button, Descriptions, DescriptionsItem, Form, FormItem, Input, message, Select, Table } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields, isTemplate, title } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

const current = ref<GymRow>();

const visible = ref(false);

const mode = ref('');

const busy = ref(false);

const decision = ref('approve');

const comment = ref('');

async function details(row: GymRow) {
  current.value = await gymApi.get(`approvals/${row.id}`);
  mode.value = 'detail';
  visible.value = true;
}

function openDecision(row: GymRow) {
  current.value = row;
  mode.value = 'decision';
  comment.value = '';
  decision.value = 'approve';
  visible.value = true;
}

async function save() {
  busy.value = true;
  try {
    if (current.value && mode.value === 'decision') {
      await gymApi.post(`approvals/${current.value.id}/decisions`, {
        decision: decision.value,
        comment: comment.value,
      });
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
      endpoint="approvals"
      :fields="fields"
      :columns="columns"
      :create="false"
      :edit="isTemplate"
      :store-filter="true"
      :time-filter="true"
    >
      <template #actions="{ row }">
        <Button type="link" @click="details(row)"> 详情 </Button>
        <Button v-if="row.status === 'pending' && canGym('approvals:decide')" type="link" @click="openDecision(row)">
          审批
        </Button>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="mode === 'detail' ? '审批记录详情' : '管理操作'"
      :width="760"
      :footer="mode === 'detail' ? null : undefined"
      :confirm-loading="busy"
      @ok="save"
    >
      <Form v-if="mode === 'decision'" layout="vertical">
        <FormItem label="决定">
          <Select
            v-model:value="decision"
            :options="[
              { label: '通过', value: 'approve' },
              { label: '拒绝', value: 'reject' },
            ]"
          />
        </FormItem>
        <FormItem label="审批意见">
          <Input.TextArea v-model:value="comment" />
        </FormItem>
      </Form>
      <template v-else-if="current">
        <Descriptions :column="2" bordered>
          <DescriptionsItem v-for="column in columns" :key="column.dataIndex" :label="column.title">{{
            current[column.dataIndex] ?? '—'
          }}</DescriptionsItem>
        </Descriptions>
        <Descriptions :column="1" bordered class="my-3">
          <DescriptionsItem label="原价">{{ current.requestSnapshot.originalPrice }}</DescriptionsItem>
          <DescriptionsItem label="申请价">{{ current.requestSnapshot.requestedPrice }}</DescriptionsItem>
          <DescriptionsItem label="原因">{{ current.requestSnapshot.reason }}</DescriptionsItem>
        </Descriptions>
        <Table
          :data-source="current.tasks"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '步骤', dataIndex: 'stepNo' },
            { title: '审批人', dataIndex: 'approverName' },
            { title: '状态', dataIndex: 'status' },
            { title: '意见', dataIndex: 'comment' },
            { title: '时间', dataIndex: 'decidedAt' },
          ]"
        />
      </template>
    </AdminDrawer>
  </div>
</template>
