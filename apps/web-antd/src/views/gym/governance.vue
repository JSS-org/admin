<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import { computed, ref } from 'vue';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Table,
  Upload,
} from 'ant-design-vue';

import { canGym, gymApi, openGymFile, uploadGymFile } from '#/api/gym';

import AdminDrawer from './components/admin-drawer.vue';
import ResourcePage from './components/resource-page.vue';

const props = defineProps<{ resource: string }>();
const isContract = computed(() => props.resource.startsWith('contract'));
const isTemplate = computed(() => props.resource.endsWith('-templates'));
const title = computed(
  () =>
    ({
      'contract-templates': '合同模板',
      contracts: '合同记录',
      'approval-templates': '审批模板',
      approvals: '审批记录',
    })[props.resource] ?? '记录',
);
const writeCode = computed(() => `${isContract.value ? 'contracts' : 'approvals'}:templates`);
const fields = computed<Field[]>(() => {
  if (!isTemplate.value) return [];
  const common: Field[] = [{ key: 'name', label: '模板名称', required: true }];
  if (isContract.value)
    return [
      ...common,
      {
        key: 'applicableType',
        label: '适用类型',
        type: 'select',
        required: true,
        default: 'card',
        options: [
          { label: '会员卡', value: 'card' },
          { label: '课程', value: 'course' },
        ],
      },
      {
        key: 'reminderDays',
        label: '提前提醒天数',
        type: 'number',
        required: true,
        default: 3,
      },
    ];
  return [
    ...common,
    {
      key: 'businessType',
      label: '业务类型',
      type: 'select',
      required: true,
      default: 'price_change',
      options: [
        { label: '改价', value: 'price_change' },
        { label: '合同', value: 'contract' },
        { label: '其他已配置审批', value: 'other_configured' },
      ],
    },
    {
      key: 'approverEmployeeIds',
      label: '审批员工（按选择顺序逐级审批）',
      type: 'multi',
      source: 'employees',
      required: true,
    },
  ];
});
const columns = computed(() => {
  let values = [
    ['申请', 'title'],
    ['门店', 'storeName'],
    ['业务', 'businessType'],
    ['状态', 'status'],
    ['当前步骤', 'currentStep'],
    ['申请时间', 'submittedAt'],
  ];
  if (isTemplate.value)
    values = [
      ['名称', 'name'],
      ['版本', 'version'],
      ['状态', 'status'],
    ];
  else if (isContract.value)
    values = [
      ['合同号', 'contractNo'],
      ['门店', 'storeName'],
      ['会员', 'memberName'],
      ['状态', 'status'],
      ['应签时间', 'dueAt'],
      ['签署时间', 'signedAt'],
    ];
  return values.map(([title = '', dataIndex = '']) => ({ title, dataIndex }));
});
function prepare(values: Record<string, any>) {
  if (isContract.value) return values;
  const { approverEmployeeIds = [], ...data } = values;
  return {
    ...data,
    steps: approverEmployeeIds.map((approverEmployeeId: string, i: number) => ({
      stepNo: i + 1,
      approverEmployeeId,
    })),
  };
}
function initial(row: GymRow) {
  return {
    ...row,
    approverEmployeeIds: row.steps?.map((s: GymRow) => s.approverEmployeeId).filter(Boolean) ?? [],
  };
}
const page = ref();
const current = ref<GymRow>();
const visible = ref(false);
const mode = ref('');
const busy = ref(false);
const contractName = ref('');
const applicableType = ref('card');
const reminderDays = ref(3);
const fileId = ref<string>();
const filename = ref('');
const decision = ref('approve');
const comment = ref('');
const channel = ref('sms');
const reminders = ref<GymRow[]>([]);
let requestKey = '';
function createContract() {
  current.value = undefined;
  contractName.value = '';
  fileId.value = undefined;
  filename.value = '';
  mode.value = 'contract';
  visible.value = true;
}
async function upload(file: File) {
  busy.value = true;
  try {
    const result = await uploadGymFile(file, 'contract');
    fileId.value = result.id;
    filename.value = file.name;
  } finally {
    busy.value = false;
  }
  return false;
}
async function details(row: GymRow) {
  current.value = await gymApi.get(`${props.resource}/${row.id}`);
  if (props.resource === 'contracts') {
    const result = await gymApi.list(`contracts/${row.id}/reminders`);
    reminders.value = result.items;
  }
  mode.value = 'detail';
  visible.value = true;
}
async function newVersion(row: GymRow) {
  const result = await gymApi.post(`${props.resource}/${row.id}/versions`, {});
  message.success('已创建新草稿版本');
  await page.value?.load();
  await page.value?.open(result);
}
function openDecision(row: GymRow) {
  current.value = row;
  mode.value = 'decision';
  comment.value = '';
  decision.value = 'approve';
  visible.value = true;
}
function remind(row: GymRow) {
  current.value = row;
  mode.value = 'remind';
  requestKey = crypto.randomUUID();
  visible.value = true;
}
function replaceFile(row: GymRow) {
  current.value = row;
  mode.value = 'file';
  fileId.value = undefined;
  filename.value = '';
  visible.value = true;
}
async function save() {
  busy.value = true;
  try {
    if (mode.value === 'contract') {
      if (!fileId.value) {
        message.error('请先上传合同PDF');
        return;
      }
      await gymApi.post('contract-templates', {
        name: contractName.value,
        fileId: fileId.value,
        applicableType: applicableType.value,
        reminderDays: reminderDays.value,
      });
    } else if (current.value && mode.value === 'file') {
      if (!fileId.value) {
        message.error('请先上传合同PDF');
        return;
      }
      await gymApi.patch(`contract-templates/${current.value.id}`, {
        fileId: fileId.value,
      });
    } else if (current.value && mode.value === 'decision') {
      await gymApi.post(`approvals/${current.value.id}/decisions`, {
        decision: decision.value,
        comment: comment.value,
      });
    } else if (current.value && mode.value === 'remind') {
      const result = await gymApi.post(
        `contracts/${current.value.id}/reminders`,
        { channel: channel.value },
        requestKey,
      );
      if (result.status === 'failed') message.warning(result.failureReason);
      visible.value = false;
      await page.value?.load();
      return;
    }
    message.success('已保存');
    visible.value = false;
    await page.value?.load();
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :key="resource"
      :title="title"
      :endpoint="resource"
      :fields="fields"
      :columns="columns"
      :write-code="isTemplate ? writeCode : undefined"
      :create="resource === 'approval-templates'"
      :edit="isTemplate"
      :editable="(row) => row.status === 'draft'"
      :prepare="prepare"
      :initial="initial"
      :store-filter="!isTemplate"
      :time-filter="!isTemplate"
    >
      <template #toolbar>
        <Button v-if="resource === 'contract-templates' && canGym(writeCode)" type="primary" @click="createContract">
          上传合同模板
        </Button>
      </template>
      <template #actions="{ row, reload }">
        <template v-if="isTemplate && canGym(writeCode)">
          <Button type="link" @click="newVersion(row)">新版本</Button>
          <Button
            type="link"
            @click="
              async () => {
                await gymApi.patch(`${resource}/${row.id}`, {
                  status: row.status === 'published' ? 'inactive' : 'published',
                });
                await reload();
              }
            "
          >
            {{ row.status === 'published' ? '停用' : '发布' }}
          </Button>
          <Button v-if="isContract" type="link" @click="openGymFile(row.fileId)"> 查看PDF </Button>
          <Button v-if="isContract && row.status === 'draft'" type="link" @click="replaceFile(row)"> 替换PDF </Button>
        </template>
        <Button v-if="!isTemplate" type="link" @click="details(row)"> 详情 </Button>
        <Button
          v-if="
            resource === 'contracts' &&
            ['unsigned', 'sent', 'viewed'].includes(row.status) &&
            canGym('contracts:remind')
          "
          type="link"
          @click="remind(row)"
        >
          未签提醒
        </Button>
        <Button
          v-if="resource === 'approvals' && row.status === 'pending' && canGym('approvals:decide')"
          type="link"
          @click="openDecision(row)"
        >
          审批
        </Button>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="mode === 'detail' ? `${title}详情` : '管理操作'"
      :width="760"
      :footer="mode === 'detail' ? null : undefined"
      :confirm-loading="busy"
      @ok="save"
    >
      <Form v-if="mode === 'contract' || mode === 'file'" layout="vertical">
        <template v-if="mode === 'contract'">
          <FormItem label="模板名称"> <Input v-model:value="contractName" /> </FormItem
          ><FormItem label="适用类型">
            <Select
              v-model:value="applicableType"
              :options="[
                { label: '会员卡', value: 'card' },
                { label: '课程', value: 'course' },
              ]"
            /> </FormItem
          ><FormItem label="提前提醒天数">
            <InputNumber v-model:value="reminderDays" :min="0" :max="365" />
          </FormItem>
        </template>
        <FormItem label="合同PDF">
          <Upload :before-upload="upload" :show-upload-list="false" accept=".pdf">
            <Button :loading="busy">上传PDF</Button>
          </Upload>
          {{ filename }}
        </FormItem>
      </Form>
      <Form v-else-if="mode === 'decision'" layout="vertical">
        <FormItem label="决定">
          <Select
            v-model:value="decision"
            :options="[
              { label: '通过', value: 'approve' },
              { label: '拒绝', value: 'reject' },
            ]"
          /> </FormItem
        ><FormItem label="审批意见">
          <Input.TextArea v-model:value="comment" />
        </FormItem>
      </Form>
      <Form v-else-if="mode === 'remind'" layout="vertical">
        <Alert type="info" message="当前为Mock，未配置真实渠道时会记录失败结果，不会发送消息。" /><FormItem
          label="渠道"
        >
          <Select
            v-model:value="channel"
            :options="[
              { label: '短信', value: 'sms' },
              { label: '小程序', value: 'miniapp' },
              { label: 'App', value: 'app' },
            ]"
          />
        </FormItem>
      </Form>
      <template v-else-if="current">
        <Descriptions :column="2" bordered>
          <DescriptionsItem v-for="column in columns" :key="column.dataIndex" :label="column.title">
            {{ current[column.dataIndex] ?? '—' }}
          </DescriptionsItem>
        </Descriptions>
        <template v-if="isContract">
          <Descriptions :column="1" bordered class="mt-3">
            <DescriptionsItem label="签署IP"> {{ current.signIp ?? '尚未签署' }} </DescriptionsItem
            ><DescriptionsItem label="设备标识"> {{ current.signDeviceUid ?? '—' }} </DescriptionsItem
            ><DescriptionsItem label="签署设备信息">
              {{ current.signUserAgent ?? '—' }}
            </DescriptionsItem>
          </Descriptions>
          <Space class="my-3">
            <Button v-if="current.unsignedFileId" @click="openGymFile(current.unsignedFileId)"> 合同原件 </Button
            ><Button v-if="current.signedFileId" @click="openGymFile(current.signedFileId)"> 已签合同 </Button>
          </Space>
          <Table
            :data-source="current.events"
            row-key="id"
            :pagination="false"
            :columns="[
              { title: '事件', dataIndex: 'type' },
              { title: '时间', dataIndex: 'occurredAt' },
              { title: 'IP', dataIndex: 'ip' },
            ]"
          />
          <Table
            :data-source="reminders"
            row-key="id"
            :pagination="false"
            :columns="[
              { title: '提醒时间', dataIndex: 'scheduledAt' },
              { title: '状态', dataIndex: 'status' },
              { title: '失败原因', dataIndex: 'failureReason' },
            ]"
          />
        </template>
        <template v-else>
          <Descriptions :column="1" bordered class="my-3">
            <DescriptionsItem label="原价"> {{ current.requestSnapshot.originalPrice }} </DescriptionsItem
            ><DescriptionsItem label="申请价"> {{ current.requestSnapshot.requestedPrice }} </DescriptionsItem
            ><DescriptionsItem label="原因">
              {{ current.requestSnapshot.reason }}
            </DescriptionsItem> </Descriptions
          ><Table
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
          />
        </template>
      </template>
    </AdminDrawer>
  </div>
</template>
