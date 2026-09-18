<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { computed, ref, useTemplateRef } from 'vue';

import {
  Descriptions,
  DescriptionsItem,
  Empty,
  Form,
  FormItem,
  Input,
  message,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';
import { displayValue, statusColor, textOrDash } from '#/views/gym/utils/display';

import Attachments from './attachments.vue';
import ApprovalCreate from './create.vue';
import { columns, fields, filterFields, title } from './data';

const page = useTemplateRef<ResourcePageHandle>('page');

const current = ref<GymRow>();

const visible = ref(false);

const busy = ref(false);

const decision = ref('approve');

const comment = ref('');

const snapshotFields = computed(() => {
  const snapshot = current.value?.requestSnapshot ?? {};
  return [
    { key: 'memberName', label: '会员姓名' },
    { key: 'memberPhone', label: '会员手机号' },
    { key: 'cardName', label: '会员卡' },
    { key: 'cardType', label: '卡类型' },
    { key: 'courseName', label: '课程名称' },
    { key: 'orderNo', label: '关联订单' },
    { key: 'contractNo', label: '合同编号' },
    { key: 'contractName', label: '合同名称' },
    { key: 'amount', label: '申请金额（元）' },
    { key: 'originalPrice', label: '原价（元）' },
    { key: 'requestedPrice', label: '申请价（元）' },
    { key: 'startsAt', label: '生效时间' },
    { key: 'endsAt', label: '到期时间' },
    { key: 'reason', label: '申请原因' },
  ].filter((field) => snapshot[field.key] !== undefined && snapshot[field.key] !== null);
});

function format(value: unknown, key: string) {
  if (value === 'waiting' && key === 'status') return '待前序审批';
  return displayValue(value, key, fields, {});
}

async function details(row: GymRow) {
  current.value = await gymApi.get(`approvals/${row.id}`);
  comment.value = '';
  decision.value = 'approve';
  visible.value = true;
}

async function save() {
  if (busy.value || !current.value?.canDecide) return;
  busy.value = true;
  try {
    const result = await gymApi.post(`approvals/${current.value.id}/decisions`, {
      decision: decision.value,
      comment: textOrDash(comment.value),
    });
    current.value = result;
    message.success(decision.value === 'approve' ? '已通过当前审批步骤' : '已拒绝申请');
    comment.value = '';
    await page.value?.load();
  } finally {
    busy.value = false;
  }
}

function rowApprovalAction(row: GymRow) {
  return row.canDecide ? 'approve' : 'detail';
}

function rowApprovalLabel(row: GymRow) {
  return row.canDecide ? '查看并审批' : '查看详情';
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="title"
      endpoint="approvals"
      :fields="fields"
      :columns="columns"
      :create="false"
      :edit="false"
      :filter-fields="filterFields"
      :store-filter="true"
      :time-filter="true"
    >
      <template #create><ApprovalCreate @submitted="page?.load()" /></template>
      <template #actions="{ row }">
        <TableAction :action="rowApprovalAction(row)" :label="rowApprovalLabel(row)" @click="details(row)" />
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      title="审批详情"
      :width="760"
      :footer="current?.canDecide && canGym('approvals:decide') ? undefined : null"
      ok-text="提交审批结果"
      :confirm-loading="busy"
      @ok="save"
    >
      <template v-if="current">
        <Descriptions :column="2" bordered>
          <DescriptionsItem v-for="column in columns" :key="column.dataIndex" :label="column.title">{{
            format(current[column.dataIndex], column.dataIndex)
          }}</DescriptionsItem>
        </Descriptions>
        <Descriptions v-if="snapshotFields.length" title="申请内容" :column="1" bordered class="my-4">
          <DescriptionsItem v-for="field in snapshotFields" :key="field.key" :label="field.label">
            {{ format(current.requestSnapshot[field.key], field.key) }}
          </DescriptionsItem>
        </Descriptions>
        <Empty v-else class="my-4" :image="Empty.PRESENTED_IMAGE_SIMPLE" description="暂无申请内容" />
        <h3 class="mb-3 font-medium">附件材料</h3>
        <Attachments :key="current.id" :model-value="current.attachments ?? []" />
        <h3 class="mb-3 font-medium">审批流程</h3>
        <Table
          :data-source="current.tasks"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '步骤', dataIndex: 'stepNo' },
            { title: '审批人', dataIndex: 'approverName' },
            { title: '状态', dataIndex: 'status' },
            { title: '意见', dataIndex: 'comment' },
            { title: '时间', dataIndex: 'decidedAt' },
          ]"
        >
          <template #bodyCell="{ column, text }">
            <Tag v-if="column.dataIndex === 'status'" :color="statusColor(text)">{{ format(text, 'status') }}</Tag>
            <span v-else>{{ format(text, String(column.dataIndex)) }}</span>
          </template>
        </Table>
        <Form v-if="current.canDecide && canGym('approvals:decide')" layout="vertical" :disabled="busy" class="mt-4">
          <h3 class="mb-3 font-medium">处理审批</h3>
          <FormItem label="审批结果" required>
            <Select
              v-model:value="decision"
              :options="[
                { label: '通过', value: 'approve' },
                { label: '拒绝', value: 'reject' },
              ]"
            />
          </FormItem>
          <FormItem label="审批意见">
            <Input.TextArea
              v-model:value="comment"
              :rows="3"
              :maxlength="2000"
              show-count
              placeholder="可填写通过或拒绝的原因"
            />
          </FormItem>
        </Form>
      </template>
    </AdminDrawer>
  </div>
</template>
