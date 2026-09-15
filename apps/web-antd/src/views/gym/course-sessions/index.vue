<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import { message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import EntityRecords from '#/views/gym/components/entity-records.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { config, editable, initial, prepare } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');
const session = ref<GymRow>();
const detailVisible = ref(false);

async function cancel(row: GymRow) {
  await gymApi.patch(`course-sessions/${row.id}`, { status: 'cancelled' });
  message.success('已取消');
  await page.value?.load();
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="config.title"
      endpoint="course-sessions"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="true"
      :editable="editable"
      :initial="initial"
      :prepare="prepare"
      store-filter
      time-filter
    >
      <template #actions="{ row }">
        <TableAction
          action="roster"
          v-if="canGym('bookings:read')"
          @click="
            session = row;
            detailVisible = true;
          "
        />
        <TableAction
          action="cancel"
          label="取消排课"
          v-if="row.status === 'scheduled' && canGym('courses:write')"
          danger
          @click="cancel(row)"
        />
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="detailVisible"
      :title="`${session?.courseName ?? '课程'} · 预约名单`"
      :footer="null"
      :width="850"
      ><EntityRecords
        v-if="session && detailVisible"
        endpoint="bookings"
        :params="{ sessionId: session.id }"
        :columns="[
          { title: '会员', dataIndex: 'memberName' },
          { title: '预约时间', dataIndex: 'bookedAt' },
          { title: '状态', dataIndex: 'status' },
          { title: '备注', dataIndex: 'note' },
        ]"
    /></AdminDrawer>
  </div>
</template>
