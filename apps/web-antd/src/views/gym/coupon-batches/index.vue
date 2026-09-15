<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import { Alert, Button, Form, FormItem, message, Select, Table } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { canCreateBatch, config } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

const visible = ref(false);

const mode = ref('');

const busy = ref(false);

const current = ref<GymRow>();

const items = ref<GymRow[]>([]);

const stores = ref<GymRow[]>([]);

const templates = ref<GymRow[]>([]);

const members = ref<GymRow[]>([]);

const templateId = ref<string>();

const storeIds = ref<string[]>([]);

const targets = ref<
  {
    storeId?: string;
    memberIds: string[];
  }[]
>([]);

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
  templates.value = await gymApi.listAll('coupon-templates');
  members.value = await gymApi.listAll('members');
  visible.value = true;
}

async function details(row: GymRow) {
  current.value = await gymApi.get(`coupon-batches/${row.id}`);
  items.value = current.value?.recipients ?? current.value?.codes ?? [];
  mode.value = 'detail';
  visible.value = true;
}

async function submit() {
  if (busy.value) return;
  if (!templateId.value || targets.value.some((target) => !target.storeId || target.memberIds.length === 0)) {
    message.error('请选择优惠券模板，并为每个发行门店选择会员');
    return;
  }
  busy.value = true;
  try {
    let data: Record<string, any> = {};
    data = {
      templateId: templateId.value,
      targets: targets.value.flatMap((t) => t.memberIds.map((memberId) => ({ memberId, storeId: t.storeId }))),
    };
    const result = await gymApi.post('coupon-batches', data, requestKey);
    await page.value?.load();
    await details(result);
    message.success('批次已创建，请查看逐项结果');
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="config.title"
      endpoint="coupon-batches"
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
        <FormItem label="优惠券模板" required>
          <Select
            v-model:value="templateId"
            show-search
            option-filter-prop="label"
            :options="templates.map((t) => ({ label: t.name, value: t.id }))"
          />
        </FormItem>
        <div v-for="(target, index) in targets" :key="index" class="gym-rule-card">
          <FormItem label="发行门店" required>
            <Select
              v-model:value="target.storeId"
              :options="stores.map((s) => ({ label: s.name, value: s.id }))"
              @change="target.memberIds = []"
            />
          </FormItem>
          <FormItem label="本店会员" required>
            <Select
              v-model:value="target.memberIds"
              mode="multiple"
              :disabled="busy || !target.storeId"
              :placeholder="target.storeId ? '选择领券会员' : '请先选择发行门店'"
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
        <Button class="gym-form-add" type="dashed" @click="targets.push({ memberIds: [] })"> 增加发行门店 </Button>
      </Form>
      <template v-else>
        <Alert type="info" :message="`批次状态：${current?.status ?? '—'}`" class="mb-3" />
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
