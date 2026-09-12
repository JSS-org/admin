<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import { ref } from 'vue';

import { Button, Descriptions, DescriptionsItem, Table, TabPane, Tabs } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import AdminDrawer from './components/admin-drawer.vue';
import ResourcePage from './components/resource-page.vue';
const detail = ref<GymRow>();
const visible = ref(false);
const fields: Field[] = [
  {
    key: 'storeId',
    label: '建档门店',
    source: 'stores',
    type: 'select',
    required: true,
    immutable: true,
  },
  { key: 'phone', label: '手机号', required: true, immutable: true },
  { key: 'name', label: '姓名', required: true },
  { key: 'nickname', label: '昵称' },
  {
    key: 'gender',
    label: '性别',
    type: 'select',
    options: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
      { label: '未填写', value: 'unspecified' },
    ],
  },
  { key: 'birthday', label: '生日', type: 'date' },
];
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
      :columns="[
        { title: '会员号', dataIndex: 'memberNo' },
        { title: '姓名', dataIndex: 'name' },
        { title: '手机号', dataIndex: 'phone' },
        { title: '门店', dataIndex: 'storeNames' },
        { title: '阶段', dataIndex: 'customerStage' },
        { title: '建档时间', dataIndex: 'registeredAt' },
      ]"
      write-code="members:write"
      store-filter
      time-filter
      :filter-fields="[
        {
          key: 'cardExpiresWithinDays',
          label: '会员卡到期',
          type: 'select',
          options: [
            { label: '7天内卡到期', value: 7 },
            { label: '30天内卡到期', value: 30 },
          ],
        },
        {
          key: 'courseExpiresWithinDays',
          label: '私教到期',
          type: 'select',
          options: [
            { label: '7天内课程到期', value: 7 },
            { label: '30天内课程到期', value: 30 },
          ],
        },
        {
          key: 'hasPersonalTraining',
          label: '私教会员',
          type: 'select',
          options: [{ label: '持有私教课程', value: 'true' }],
        },
      ]"
    >
      <template #actions="{ row }">
        <Button type="link" @click="open(row)">会员详情</Button>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" :title="detail?.name" :footer="null" :width="900">
      <Descriptions bordered :column="2">
        <DescriptionsItem label="手机号">{{ detail?.phone }}</DescriptionsItem
        ><DescriptionsItem label="所属门店">
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
          /> </TabPane
        ><TabPane key="courses" tab="私教权益">
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
