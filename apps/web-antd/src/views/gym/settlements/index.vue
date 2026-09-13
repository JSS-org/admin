<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { ref } from 'vue';

import { Table } from 'ant-design-vue';

import { gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns } from './data';

const detail = ref<GymRow>();

const showDetail = ref(false);

async function details(row: GymRow) {
  detail.value = await gymApi.get(`settlements/${row.id}`);
  showDetail.value = true;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="分账结算记录"
      endpoint="settlements"
      :fields="[]"
      :create="false"
      :edit="false"
      store-filter
      time-filter
      detail
      @detail="details"
      :columns="columns"
    />
    <AdminDrawer v-model:open="showDetail" title="分账明细" :footer="null" width="800px">
      <p>分账基数：{{ detail?.baseAmount }}；状态：{{ detail?.status }}</p>
      <Table
        row-key="id"
        :data-source="detail?.items"
        :columns="[
          { title: '账户', dataIndex: 'accountName' },
          { title: '脱敏账号', dataIndex: 'accountMasked' },
          { title: '比例', dataIndex: 'ratio' },
          { title: '金额', dataIndex: 'amount' },
          { title: '状态', dataIndex: 'status' },
          { title: '到账时间', dataIndex: 'settledAt' },
          { title: '失败原因', dataIndex: 'failureReason' },
        ]"
      />
    </AdminDrawer>
  </div>
</template>
