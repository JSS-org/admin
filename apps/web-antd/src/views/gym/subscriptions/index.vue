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

const cycles = ref<GymRow[]>([]);

async function details(row: GymRow) {
  current.value = await gymApi.get(`subscriptions/${row.id}`);
  const data = await gymApi.list(`subscriptions/${row.id}/cycles`, {
    pageSize: 100,
  });
  cycles.value = data.items;
  visible.value = true;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="连续包月记录"
      endpoint="subscriptions"
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
          v-if="row.status !== 'cancelled'"
          business-type="contract"
          source-type="subscriptions"
          :record="row"
          label="申请签约审批"
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
          :data-source="cycles"
          row-key="id"
          :columns="[
            { title: '周期开始', dataIndex: 'periodStart' },
            { title: '周期结束', dataIndex: 'periodEnd' },
            { title: '应付', dataIndex: 'amount' },
            { title: '结果', dataIndex: 'status' },
            { title: '扣款时间', dataIndex: 'chargedAt' },
          ]"
        />
      </template>
    </AdminDrawer>
  </div>
</template>
