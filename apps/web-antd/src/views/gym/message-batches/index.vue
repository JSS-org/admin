<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import { Alert, Button, Form, FormItem, Input, message, Select, Table } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';
import { textOrDash } from '#/views/gym/utils/display';

import { canCreateBatch, config } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

const visible = ref(false);

const mode = ref('');

const busy = ref(false);

const current = ref<GymRow>();

const items = ref<GymRow[]>([]);

const stores = ref<GymRow[]>([]);

const members = ref<GymRow[]>([]);

const templateId = ref<string>();

const storeIds = ref<string[]>([]);

const targets = ref<
  {
    storeId?: string;
    memberIds: string[];
  }[]
>([]);

const messageKind = ref('bulk');

const channel = ref('miniapp');

const subject = ref('');

const content = ref('');

let requestKey = '';

async function start() {
  mode.value = 'create';
  current.value = undefined;
  items.value = [];
  templateId.value = undefined;
  storeIds.value = [];
  targets.value = [{ memberIds: [] }];
  requestKey = crypto.randomUUID();
  subject.value = '';
  content.value = '';
  stores.value = await gymApi.listAll('stores');
  members.value = await gymApi.listAll('members');
  visible.value = true;
}

async function details(row: GymRow) {
  current.value = await gymApi.get(`message-batches/${row.id}`);
  items.value = current.value?.recipients ?? current.value?.codes ?? [];
  mode.value = 'detail';
  visible.value = true;
}

async function submit() {
  if (busy.value) return;
  const recipient = targets.value[0];
  if (!recipient?.storeId || recipient.memberIds.length === 0 || !subject.value.trim()) {
    message.error('请选择门店、会员并填写消息标题');
    return;
  }
  if (messageKind.value === 'private' && recipient.memberIds.length !== 1) {
    message.error('私信只能选择一位会员');
    return;
  }
  busy.value = true;
  try {
    let data: Record<string, any> = {};
    const target = targets.value[0];
    data = {
      kind: messageKind.value,
      channel: channel.value,
      title: subject.value,
      content: textOrDash(content.value),
      storeId: target?.storeId,
      memberIds: target?.memberIds ?? [],
    };
    const result = await gymApi.post('message-batches', data, requestKey);
    await page.value?.load();
    await details(result);
    message.success('批次已创建，请查看逐项结果');
  } finally {
    busy.value = false;
  }
}

function setPrivateMember(target: { memberIds: string[] }, value: unknown) {
  target.memberIds = value ? [String(value)] : [];
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="config.title"
      endpoint="message-batches"
      :fields="config.fields"
      :columns="config.columns"
      :create="false"
      :edit="false"
      :idempotent="false"
      :store-filter="true"
      time-filter
    >
      <template v-if="canGym(canCreateBatch)" #create>
        <Button v-if="canGym(canCreateBatch)" type="primary" @click="start">新增批次</Button>
      </template>
      <template #actions="{ row }">
        <TableAction action="results" @click="details(row)" />
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="mode === 'create' ? '批量操作' : '批次结果'"
      :width="900"
      :footer="mode === 'create' ? undefined : null"
      :confirm-loading="busy"
      @ok="submit"
    >
      <Form v-if="mode === 'create'" layout="vertical" :disabled="busy">
        <FormItem label="消息类型" required>
          <Select
            v-model:value="messageKind"
            :options="[
              { label: '私信（一位会员）', value: 'private' },
              { label: '批量通知', value: 'bulk' },
            ]"
            @change="targets.forEach((target) => (target.memberIds = []))"
          />
        </FormItem>
        <div v-for="(target, index) in targets" :key="index">
          <FormItem label="发送门店" required>
            <Select
              v-model:value="target.storeId"
              :options="stores.map((s) => ({ label: s.name, value: s.id }))"
              @change="target.memberIds = []"
            />
          </FormItem>
          <FormItem :label="messageKind === 'private' ? '私信会员' : '接收会员'" required>
            <Select
              v-if="messageKind === 'private'"
              :value="target.memberIds[0]"
              :disabled="busy || !target.storeId"
              :placeholder="target.storeId ? '选择一位会员' : '请先选择发送门店'"
              show-search
              option-filter-prop="label"
              :options="
                members
                  .filter((m) => m.storeIds?.includes(target.storeId))
                  .map((m) => ({ label: `${m.name} ${m.phone}`, value: m.id }))
              "
              @change="setPrivateMember(target, $event)"
            />
            <Select
              v-else
              v-model:value="target.memberIds"
              mode="multiple"
              :disabled="busy || !target.storeId"
              :placeholder="target.storeId ? '选择接收会员' : '请先选择发送门店'"
              show-search
              option-filter-prop="label"
              :options="
                members
                  .filter((m) => m.storeIds?.includes(target.storeId))
                  .map((m) => ({
                    label: `${m.name} ${m.phone}`,
                    value: m.id,
                  }))
              "
            />
          </FormItem>
          <Button v-if="targets.length > 1" @click="targets.splice(index, 1)"> 移除此门店 </Button>
        </div>
        <FormItem label="发送渠道">
          <Select
            v-model:value="channel"
            :options="[
              { label: '小程序', value: 'miniapp' },
              { label: 'App', value: 'app' },
              { label: '短信', value: 'sms' },
            ]"
          />
        </FormItem>
        <FormItem label="标题" required>
          <Input v-model:value="subject" />
        </FormItem>
        <FormItem label="内容">
          <Input.TextArea v-model:value="content" :rows="4" />
        </FormItem>
        <Alert type="info" message="未配置真实渠道的消息会记录发送失败，不会发送到会员。" />
      </Form>
      <template v-else>
        <Alert type="info" :message="`批次状态：${current?.status ?? '-'}`" class="mb-3" />
        <Table
          :data-source="items"
          row-key="id"
          :columns="[
            { title: '门店', dataIndex: 'storeName' },
            { title: '会员', dataIndex: 'memberName' },
            { title: '数量', dataIndex: 'quantity' },
            { title: '礼品码掩码', dataIndex: 'codeMasked' },
            { title: '结果', dataIndex: 'status' },
            { title: '失败原因', dataIndex: 'failureReason' },
            { title: '阅读结果', dataIndex: 'readStatus' },
          ]"
        />
      </template>
    </AdminDrawer>
  </div>
</template>
