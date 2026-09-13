<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { ref } from 'vue';

import { Button, Descriptions, DescriptionsItem, Table, TabPane, Tabs } from 'ant-design-vue';

import { gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields, filterFields } from './data';

const detail = ref<GymRow>();

const visible = ref(false);

async function open(row: GymRow) {
  detail.value = await gymApi.get(`members/${row.id}`);
  visible.value = true;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="会员管理"
      endpoint="members"
      :fields="fields"
      :columns="columns"
      write-code="members:write"
      store-filter
      time-filter
      :filter-fields="filterFields"
    >
      <template #actions="{ row }">
        <Button type="link" @click="open(row)">会员详情</Button>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" :title="detail?.name" :footer="null" :width="900">
      <Descriptions bordered :column="2">
        <DescriptionsItem label="手机号">{{ detail?.phone }}</DescriptionsItem>
        <DescriptionsItem label="所属门店">
          {{ detail?.stores?.map((s: GymRow) => s.name).join('、') }}
        </DescriptionsItem>
      </Descriptions>
      <Tabs>
        <TabPane key="cards" tab="会员卡">
          <Table
            :data-source="detail?.cards"
            row-key="id"
            :columns="[
              { title: '卡号', dataIndex: 'cardNo' },
              { title: '卡种', dataIndex: 'name' },
              { title: '发卡前缀', dataIndex: 'displayPrefix' },
              { title: '到期时间', dataIndex: 'expiresAt' },
              { title: '剩余次数', dataIndex: 'remainingUses' },
              { title: '状态', dataIndex: 'status' },
            ]"
          />
        </TabPane>
        <TabPane key="courses" tab="私教权益">
          <Table
            :data-source="detail?.coursePacks"
            row-key="id"
            :columns="[
              { title: '产品', dataIndex: 'name' },
              { title: '剩余课时', dataIndex: 'remainingSessions' },
              { title: '到期时间', dataIndex: 'expiresAt' },
            ]"
          />
        </TabPane>
      </Tabs>
    </AdminDrawer>
  </div>
</template>
