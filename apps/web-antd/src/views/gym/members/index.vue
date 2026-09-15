<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { onScopeDispose, ref } from 'vue';

import { Descriptions, DescriptionsItem, Table, TabPane, Tabs, Tag } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import EntityRecords from '#/views/gym/components/entity-records.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';
import { displayValue, statusColor } from '#/views/gym/utils/display';

import { columns, fields, filterFields } from './data';

const detail = ref<GymRow>();

const visible = ref(false);
const activeTab = ref('cards');
let request = 0;
onScopeDispose(() => request++);

async function open(row: GymRow) {
  const current = ++request;
  const result = await gymApi.get(`members/${row.id}`);
  if (current !== request) return;
  activeTab.value = 'cards';
  detail.value = result;
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
        <TableAction action="detail" @click="open(row)" />
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" :title="detail?.name" :footer="null" :width="900">
      <Descriptions bordered :column="2">
        <DescriptionsItem label="手机号">{{ detail?.phone }}</DescriptionsItem>
        <DescriptionsItem label="所属门店">
          {{ detail?.stores?.map((s: GymRow) => s.name).join('、') }}
        </DescriptionsItem>
      </Descriptions>
      <Tabs v-model:active-key="activeTab" destroy-inactive-tab-pane>
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
          >
            <template #bodyCell="{ column, text }">
              <Tag v-if="column.dataIndex === 'status'" :color="statusColor(text)">{{
                displayValue(text, 'status', [], {})
              }}</Tag>
              <span v-else>{{ displayValue(text, String(column.dataIndex ?? ''), [], {}) }}</span>
            </template>
          </Table>
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
          >
            <template #bodyCell="{ column, text }">
              {{ displayValue(text, String(column.dataIndex ?? ''), [], {}) }}
            </template>
          </Table>
        </TabPane>
        <TabPane v-if="detail && canGym('measurements:read')" key="measurements" tab="体测记录"
          ><EntityRecords
            endpoint="body-measurements"
            :params="{ memberId: detail.id }"
            :columns="[
              { title: '门店', dataIndex: 'storeName' },
              { title: '测量时间', dataIndex: 'measuredAt' },
              { title: '体重（kg）', dataIndex: 'weightKg' },
              { title: '体脂率（%）', dataIndex: 'bodyFatPercent' },
            ]"
        /></TabPane>
        <TabPane v-if="detail && canGym('bookings:read')" key="bookings" tab="课程预约"
          ><EntityRecords
            endpoint="bookings"
            :params="{ memberId: detail.id }"
            :columns="[
              { title: '门店', dataIndex: 'storeName' },
              { title: '课程', dataIndex: 'courseName' },
              { title: '上课时间', dataIndex: 'sessionStartsAt' },
              { title: '状态', dataIndex: 'status' },
            ]"
        /></TabPane>
        <TabPane v-if="detail && canGym('coupons:read')" key="coupons" tab="优惠券"
          ><EntityRecords
            endpoint="member-coupons"
            :params="{ memberId: detail.id }"
            :columns="[
              { title: '优惠券', dataIndex: 'templateName' },
              { title: '券号', dataIndex: 'couponNo' },
              { title: '到期时间', dataIndex: 'expiresAt' },
              { title: '状态', dataIndex: 'status' },
            ]"
        /></TabPane>
      </Tabs>
    </AdminDrawer>
  </div>
</template>
