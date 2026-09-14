<script setup lang="ts">
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Alert, Button, Form, FormItem, Input, Popconfirm, Select } from 'ant-design-vue';

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
  sessionsLoading,
  membersLoading,
  rightsLoading,
  optionsError,
  canSubmit,
  cancellingIds,
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
      <template v-if="canGym('bookings:write')" #toolbar>
        <Button v-if="canGym('bookings:write')" type="primary" @click="openBooking"> 代会员预约 </Button>
      </template>
      <template #actions="{ row }">
        <Popconfirm
          v-if="row.status === 'confirmed' && canGym('bookings:write')"
          :title="`确认取消${row.memberName}的「${row.courseName}」预约？`"
          ok-text="确认取消"
          cancel-text="保留预约"
          :disabled="cancellingIds.includes(row.id)"
          @confirm="cancel(row)"
        >
          <Button type="link" danger :loading="cancellingIds.includes(row.id)">取消预约</Button>
        </Popconfirm>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      title="代会员预约"
      :confirm-loading="saving"
      :ok-button-props="{ disabled: !canSubmit }"
      @ok="saveBooking"
    >
      <Alert
        type="info"
        show-icon
        message="先选课程，再选择会员与可用权益"
        description="仅显示适用于本场课程的权益，实际名额及可用次数以提交时校验为准。"
      />
      <Alert v-if="optionsError" type="error" show-icon message="选项加载失败，请重新选择或重新打开预约窗口。" />
      <Form layout="vertical">
        <FormItem label="课程" html-for="booking-session" required>
          <Select
            id="booking-session"
            v-model:value="sessionId"
            show-search
            option-filter-prop="label"
            placeholder="搜索课程或门店"
            :loading="sessionsLoading"
            :disabled="saving || sessionsLoading"
            :not-found-content="sessionsLoading ? '正在加载课程…' : '暂无可预约课程，请先安排课程'"
            :options="
              sessions.map((s) => ({
                label: `${s.storeName} ${s.courseName} ${new Date(s.startsAt).toLocaleString()} · 余${Math.max(0, s.capacity - s.reservedCount)}位`,
                value: s.id,
                disabled: s.reservedCount >= s.capacity || Date.parse(s.startsAt) <= Date.now(),
              }))
            "
            @change="changeSession"
          />
        </FormItem>
        <FormItem label="本店会员" html-for="booking-member" required>
          <Select
            id="booking-member"
            v-model:value="memberId"
            :loading="membersLoading"
            :disabled="!sessionId || membersLoading || saving"
            :placeholder="sessionId ? '搜索会员姓名或手机号' : '请先选择课程'"
            not-found-content="本店暂无可选会员"
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
        <FormItem label="预约权益" html-for="booking-right" required>
          <Select
            id="booking-right"
            v-model:value="rightId"
            :options="rights"
            :loading="rightsLoading"
            :disabled="!memberId || rightsLoading || saving"
            :placeholder="memberId ? '请选择可用会员卡或课程包' : '请先选择会员'"
            not-found-content="暂无适用权益，请核对门店、有效期与剩余次数"
          />
        </FormItem>
        <FormItem label="备注" html-for="booking-note">
          <Input.TextArea
            id="booking-note"
            v-model:value="note"
            :disabled="saving"
            :rows="3"
            :maxlength="2000"
            show-count
            placeholder="选填，记录会员需求或预约说明"
          />
        </FormItem>
      </Form>
    </AdminDrawer>
  </div>
</template>
