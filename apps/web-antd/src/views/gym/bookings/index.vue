<script setup lang="ts">
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Button, Form, FormItem, Input, Select } from 'ant-design-vue';

import { canGym } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { config } from './data';
import { usePage } from './use-page';

const page = useTemplateRef<ResourcePageHandle>('page');

const {
  visible,
  members,
  sessions,
  rights,
  sessionId,
  memberId,
  rightId,
  note,
  saving,
  openBooking,
  changeSession,
  changeMember,
  saveBooking,
  cancel,
} = usePage(page);
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="config.title"
      endpoint="bookings"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="false"
      :edit="false"
      store-filter
      time-filter
    >
      <template v-if="canGym('bookings:write') || false" #toolbar>
        <Button v-if="canGym('bookings:write')" type="primary" @click="openBooking"> 代会员预约 </Button>
      </template>
      <template #actions="{ row }">
        <Button
          v-if="(row.status === 'confirmed' && canGym('bookings:write')) || false"
          type="link"
          danger
          @click="cancel(row)"
        >
          取消{{ '预约' }}</Button
        >
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      title="代会员预约"
      :confirm-loading="saving"
      :footer="undefined"
      @ok="saveBooking"
    >
      <Form layout="vertical">
        <FormItem label="课程">
          <Select
            v-model:value="sessionId"
            :options="
              sessions.map((s) => ({
                label: `${s.storeName} ${s.courseName} ${new Date(s.startsAt).toLocaleString()}`,
                value: s.id,
              }))
            "
            @change="changeSession"
          />
        </FormItem>
        <FormItem label="本店会员">
          <Select
            v-model:value="memberId"
            show-search
            option-filter-prop="label"
            :options="
              members.map((m) => ({
                label: `${m.name} ${m.phone}`,
                value: m.id,
              }))
            "
            @change="changeMember"
          />
        </FormItem>
        <FormItem label="预约权益">
          <Select v-model:value="rightId" :options="rights" />
        </FormItem>
        <FormItem label="备注">
          <Input.TextArea v-model:value="note" />
        </FormItem>
      </Form>
    </AdminDrawer>
  </div>
</template>
