<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { ref } from 'vue';

import { Descriptions, DescriptionsItem, Table } from 'ant-design-vue';

import { gymApi } from '#/api/gym';
import ApprovalCreate from '#/views/gym/approvals/create.vue';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { columns } from './data';

const visible = ref(false);

const current = ref<GymRow>();

async function details(row: GymRow) {
  current.value = await gymApi.get(`self-service-card-orders/${row.id}`);
  visible.value = true;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="自主办卡记录"
      endpoint="self-service-card-orders"
      :fields="[]"
      :columns="columns"
      :create="false"
      :edit="false"
      store-filter
      time-filter
      :keyword-filter="true"
    >
      <template #actions="{ row }">
        <TableAction action="detail" @click="details(row)" />
        <ApprovalCreate
          v-if="!['cancelled', 'refunded'].includes(row.status)"
          business-type="card_opening"
          source-type="orders"
          :record="row"
          label="申请开卡审批"
        />
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" title="记录详情" :footer="null" :width="900">
      <template v-if="current">
        <Descriptions :column="2" bordered>
          <DescriptionsItem v-for="column in columns" :key="column.dataIndex" :label="column.title">{{
            current[column.dataIndex] ?? '-'
          }}</DescriptionsItem>
        </Descriptions>
        <Table
          :data-source="current.items"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '商品', dataIndex: 'productNameSnapshot' },
            { title: '数量', dataIndex: 'quantity' },
            { title: '单价', dataIndex: 'unitPrice' },
            { title: '应付', dataIndex: 'payableAmount' },
          ]"
        />
        <Table
          :data-source="current.payments"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '支付金额', dataIndex: 'amount' },
            { title: '状态', dataIndex: 'status' },
            { title: '支付时间', dataIndex: 'paidAt' },
          ]"
        />
        <Table
          :data-source="current.refunds"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '退款金额', dataIndex: 'amount' },
            { title: '状态', dataIndex: 'status' },
            { title: '退款时间', dataIndex: 'refundedAt' },
          ]"
        />
      </template>
    </AdminDrawer>
  </div>
</template>
