<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import { Alert, Button, Form, FormItem, InputNumber, message, Select, Table } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { canCreateBatch, config } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

const visible = ref(false);

const mode = ref('');

const busy = ref(false);

const current = ref<GymRow>();

const items = ref<GymRow[]>([]);

const stores = ref<GymRow[]>([]);

const templates = ref<GymRow[]>([]);

const templateId = ref<string>();

const targetMode = ref('allEligible');

const storeIds = ref<string[]>([]);

const quantity = ref(100);

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
  visible.value = true;
}

async function details(row: GymRow) {
  current.value = await gymApi.get(`coupon-quota-batches/${row.id}`);
  const data = await gymApi.list(`coupon-quota-batches/${row.id}/items`, {
    pageSize: 100,
  });
  items.value = data.items;
  mode.value = 'detail';
  visible.value = true;
}

async function submit() {
  busy.value = true;
  try {
    let data: Record<string, any> = {};
    data = {
      templateId: templateId.value,
      targetMode: targetMode.value,
      quantityPerStore: quantity.value,
      ...(targetMode.value === 'selected' ? { storeIds: storeIds.value } : {}),
    };
    const result = await gymApi.post('coupon-quota-batches', data, requestKey);
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
      endpoint="coupon-quota-batches"
      :fields="config.fields"
      :columns="config.columns"
      :create="false"
      :edit="false"
      :idempotent="false"
      :store-filter="false"
      time-filter
    >
      <template v-if="canGym(canCreateBatch)" #toolbar>
        <Button v-if="canGym(canCreateBatch)" type="primary" @click="start">{{ '批量分配门店额度' }}</Button>
      </template>
      <template #actions="{ row }">
        <Button type="link" @click="details(row)"> 逐项结果 </Button>
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
      <Form v-if="mode === 'create'" layout="vertical">
        <FormItem label="优惠券模板">
          <Select v-model:value="templateId" :options="templates.map((t) => ({ label: t.name, value: t.id }))" />
        </FormItem>
        <FormItem label="分配范围">
          <Select
            v-model:value="targetMode"
            :options="[
              { label: '所有启用且适用的门店', value: 'allEligible' },
              { label: '指定门店', value: 'selected' },
            ]"
          />
        </FormItem>
        <FormItem v-if="targetMode === 'selected'" label="目标门店">
          <Select
            v-model:value="storeIds"
            mode="multiple"
            :options="stores.map((s) => ({ label: s.name, value: s.id }))"
          />
        </FormItem>
        <FormItem label="每店追加可发张数">
          <InputNumber v-model:value="quantity" :min="1" :max="1000000" />
        </FormItem>
        <Alert type="info" message="本操作只分配门店发券额度；实际发给会员时才消耗额度。" />
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
