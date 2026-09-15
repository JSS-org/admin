<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import { computed, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Upload,
} from 'ant-design-vue';

import { canGym, gymApi, openGymFile, uploadGymFile } from '#/api/gym';

import ResourcePage from './components/resource-page.vue';

const props = defineProps<{ resource: string }>();
const yesNo = [
  { label: '是', value: true },
  { label: '否', value: false },
];
const status = {
  key: 'status',
  label: '状态',
  type: 'select',
  default: 'active',
  options: [
    { label: '启用', value: 'active' },
    { label: '停用', value: 'inactive' },
  ],
} satisfies Field;
const store = {
  key: 'storeId',
  label: '门店',
  type: 'select',
  source: 'stores',
  required: true,
  immutable: true,
} satisfies Field;
const title = computed(
  () =>
    ({ devices: '智能设备', equipment: '器械教学', blacklists: '全店黑名单' })[
      props.resource
    ] ?? '设备',
);
const code = computed(
  () =>
    ({
      devices: 'devices:write',
      equipment: 'equipment:write',
      blacklists: 'blacklist:write',
    })[props.resource] ?? '',
);
const fields = computed<Field[]>(() => {
  if (props.resource === 'blacklists')
    return [
      {
        key: 'memberId',
        label: '会员',
        type: 'select',
        source: 'members',
        required: true,
        immutable: true,
      },
      {
        key: 'blockEntry',
        label: '禁止进入',
        type: 'select',
        options: yesNo,
        default: true,
        required: true,
      },
      {
        key: 'blockPurchase',
        label: '禁止购买',
        type: 'select',
        options: yesNo,
        default: true,
        required: true,
      },
      { key: 'reason', label: '原因', type: 'textarea', required: true },
      {
        key: 'startsAt',
        label: '生效时间',
        type: 'datetime',
        required: true,
        immutable: true,
      },
      { key: 'endsAt', label: '结束时间（留空长期有效）', type: 'datetime' },
    ];
  if (props.resource === 'equipment')
    return [
      store,
      { key: 'code', label: '器械编码', required: true, immutable: true },
      { key: 'name', label: '名称', required: true },
      { key: 'model', label: '型号' },
      status,
    ];
  return [
    store,
    { key: 'name', label: '名称', required: true },
    {
      key: 'type',
      label: '类型',
      type: 'select',
      required: true,
      immutable: true,
      default: 'door',
      options: [
        { label: '门禁', value: 'door' },
        { label: '柜子', value: 'locker' },
        { label: '摄像头', value: 'camera' },
        { label: '人脸设备', value: 'face_reader' },
      ],
    },
    {
      key: 'provider',
      label: '厂商（mock为开发模拟设备）',
      required: true,
      immutable: true,
      default: 'mock',
    },
    {
      key: 'deviceUid',
      label: '设备唯一编号',
      required: true,
      immutable: true,
    },
    { key: 'location', label: '安装位置' },
    status,
  ];
});
const columns = computed(() => {
  let values = [
    ['门店', 'storeName'],
    ['名称', 'name'],
    ['类型', 'type'],
    ['设备编号', 'deviceUid'],
    ['在线', 'online'],
    ['最近在线时间', 'lastSeenAt'],
    ['状态', 'status'],
  ];
  if (props.resource === 'equipment')
    values = [
      ['门店', 'storeName'],
      ['编号', 'code'],
      ['名称', 'name'],
      ['型号', 'model'],
      ['状态', 'status'],
    ];
  if (props.resource === 'blacklists')
    values = [
      ['会员', 'memberName'],
      ['禁止进入', 'blockEntry'],
      ['禁止购买', 'blockPurchase'],
      ['原因', 'reason'],
      ['生效', 'startsAt'],
      ['结束', 'endsAt'],
      ['状态', 'status'],
    ];
  return values.map(([title = '', dataIndex = '']) => ({ title, dataIndex }));
});
function prepare(values: Record<string, any>, row?: GymRow) {
  const result = { ...values };
  if (!row && props.resource !== 'blacklists')
    Reflect.deleteProperty(result, 'status');
  for (const key of ['startsAt', 'endsAt'])
    if (result[key]) result[key] = new Date(result[key]).toISOString();
  return result;
}
function initial(row: GymRow) {
  const result = { ...row };
  for (const key of ['startsAt', 'endsAt'])
    if (result[key]) {
      const time = new Date(result[key]);
      result[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
    }
  return result;
}
const page = ref();
const visible = ref(false);
const mode = ref('');
const current = ref<GymRow>();
const busy = ref(false);
const compartments = ref<{ number: string; status: string }[]>([]);
const commands = ref<GymRow[]>([]);
const reason = ref('');
const compartmentId = ref<string>();
const result = ref<GymRow>();
let requestKey = '';
watch([reason, compartmentId], () => {
  requestKey = crypto.randomUUID();
  result.value = undefined;
});
const tutorials = ref<GymRow[]>([]);
const tutorialTitle = ref('');
const instructions = ref('');
const fileId = ref<string>();
const filename = ref('');
async function open(row: GymRow, action: string) {
  const detail = await gymApi.get<GymRow>(`${props.resource}/${row.id}`);
  current.value = detail;
  mode.value = action;
  if (action === 'compartments')
    compartments.value = detail.compartments.map((c: GymRow) => ({
      number: c.number,
      status: c.status === 'inactive' ? 'inactive' : 'available',
    }));
  if (action === 'command') {
    reason.value = '';
    compartmentId.value = undefined;
    result.value = undefined;
    requestKey = crypto.randomUUID();
    const data = await gymApi.list(`devices/${row.id}/commands`);
    commands.value = data.items;
  }
  if (action === 'tutorials') {
    const data = await gymApi.list(`equipment/${row.id}/tutorials`);
    tutorials.value = data.items;
    tutorialTitle.value = '';
    instructions.value = '';
    fileId.value = undefined;
    filename.value = '';
  }
  visible.value = true;
}
async function save() {
  if (!current.value) return;
  busy.value = true;
  try {
    if (mode.value === 'compartments') {
      await gymApi.put(`devices/${current.value.id}/compartments`, {
        compartments: compartments.value,
      });
      visible.value = false;
      message.success('柜格已保存');
    }
    if (mode.value === 'command') {
      result.value = await gymApi.post(
        `devices/${current.value.id}/commands`,
        {
          command:
            current.value.type === 'locker' ? 'open_locker' : 'open_door',
          ...(current.value.type === 'locker'
            ? { compartmentId: compartmentId.value }
            : {}),
          reason: reason.value,
        },
        requestKey,
      );
      const data = await gymApi.list(`devices/${current.value.id}/commands`);
      commands.value = data.items;
    }
    if (mode.value === 'tutorials') {
      await gymApi.post(`equipment/${current.value.id}/tutorials`, {
        title: tutorialTitle.value,
        fileId: fileId.value,
        instructions: instructions.value,
        sortOrder: tutorials.value.length,
      });
      await open(current.value, 'tutorials');
      message.success('教学已上传');
    }
    await page.value?.load();
  } finally {
    busy.value = false;
  }
}
async function upload(file: File) {
  if (!current.value) return false;
  busy.value = true;
  try {
    const data = await uploadGymFile(
      file,
      file.type.startsWith('video/') ? 'video' : 'image',
      current.value.storeId,
    );
    fileId.value = data.id;
    filename.value = file.name;
  } finally {
    busy.value = false;
  }
  return false;
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
      :write-code="code"
      :store-filter="resource !== 'blacklists'"
      :prepare="prepare"
      :initial="initial"
      :editable="(row) => !row.revokedAt"
    >
      <template #actions="{ row, reload }">
        <template v-if="resource === 'devices'">
          <Button
            v-if="row.type === 'locker' && canGym('devices:write')"
            type="link"
            @click="open(row, 'compartments')"
          >
            配置柜格 </Button
          ><Button
            v-if="['door', 'locker'].includes(row.type)"
            type="link"
            @click="open(row, 'command')"
          >
            远程操作 / 记录
          </Button>
        </template>
        <Button
          v-if="resource === 'equipment'"
          type="link"
          @click="open(row, 'tutorials')"
        >
          教学资料
        </Button>
        <Button
          v-if="resource === 'blacklists' && !row.revokedAt && canGym(code)"
          type="link"
          @click="
            async () => {
              await gymApi.patch(`blacklists/${row.id}`, { revoked: true });
              await reload();
            }
          "
        >
          撤销限制
        </Button>
      </template>
    </ResourcePage>
    <Modal
      wrap-class-name="gym-dialog"
      v-model:open="visible"
      :title="current?.name"
      :width="850"
      :footer="mode === 'compartments' ? undefined : null"
      :confirm-loading="busy"
      @ok="save"
    >
      <template v-if="mode === 'compartments'">
        <Space v-for="(cell, index) in compartments" :key="index" class="mb-3">
          <Input v-model:value="cell.number" placeholder="柜号" /><Select
            v-model:value="cell.status"
            :options="[
              { label: '可用', value: 'available' },
              { label: '停用', value: 'inactive' },
            ]"
            style="min-width: 120px"
          /><Button danger @click="compartments.splice(index, 1)">
            移除
          </Button> </Space
        ><Button
          @click="compartments.push({ number: '', status: 'available' })"
        >
          增加柜格
        </Button>
      </template>
      <template v-if="mode === 'command'">
        <Alert
          v-if="current?.provider === 'mock'"
          type="info"
          show-icon
          message="模拟设备：指令仅在Mock中演示，不控制真实门禁或柜子。"
        />
        <Form v-if="canGym('devices:command')" layout="vertical" class="mt-3">
          <FormItem v-if="current?.type === 'locker'" label="柜格">
            <Select
              v-model:value="compartmentId"
              :options="
                current?.compartments.map((c: GymRow) => ({
                  label: c.number,
                  value: c.id,
                }))
              "
              @change="result = undefined"
            />
          </FormItem>
          <FormItem label="操作原因">
            <Input.TextArea v-model:value="reason" />
          </FormItem>
          <Button type="primary" :loading="busy" @click="save">
            {{ current?.provider === 'mock' ? '执行模拟指令' : '提交远程指令' }}
          </Button>
        </Form>
        <Alert
          v-if="result"
          class="my-3"
          :type="result.status === 'succeeded' ? 'success' : 'error'"
          :message="
            result.simulated && result.status === 'succeeded'
              ? '模拟执行成功（未控制真实设备）'
              : (result.failureReason ?? result.status)
          "
        />
        <Table
          :data-source="commands"
          row-key="id"
          :columns="[
            { title: '时间', dataIndex: 'requestedAt' },
            { title: '操作人', dataIndex: 'requesterName' },
            { title: '指令', dataIndex: 'command' },
            { title: '原因', dataIndex: 'reason' },
            { title: '结果', dataIndex: 'status' },
            { title: '失败原因', dataIndex: 'failureReason' },
          ]"
        />
      </template>
      <template v-if="mode === 'tutorials'">
        <Form v-if="canGym('equipment:write')" layout="vertical">
          <FormItem label="教学标题">
            <Input v-model:value="tutorialTitle" /> </FormItem
          ><FormItem label="说明">
            <Input.TextArea v-model:value="instructions" /> </FormItem
          ><FormItem label="图片/视频">
            <Upload
              :before-upload="upload"
              :show-upload-list="false"
              accept=".png,.jpg,.jpeg,.mp4"
            >
              <Button :loading="busy">上传教学文件</Button>
            </Upload>
            {{ filename }} </FormItem
          ><Button type="primary" :loading="busy" @click="save">
            保存教学
          </Button>
        </Form>
        <Table
          :data-source="tutorials"
          row-key="id"
          :columns="[
            { title: '标题', dataIndex: 'title' },
            { title: '说明', dataIndex: 'instructions' },
            { title: '状态', dataIndex: 'status' },
            { title: '操作', dataIndex: 'actions' },
          ]"
        >
          <template #bodyCell="{ column, record }">
            <Space v-if="column.dataIndex === 'actions'">
              <Button type="link" @click="openGymFile(record.fileId)">
                查看 </Button
              ><Button
                v-if="canGym('equipment:write')"
                type="link"
                @click="
                  async () => {
                    await gymApi.patch(
                      `equipment/${current?.id}/tutorials/${record.id}`,
                      {
                        status:
                          record.status === 'active' ? 'inactive' : 'active',
                      },
                    );
                    if (current) await open(current, 'tutorials');
                  }
                "
              >
                {{ record.status === 'active' ? '停用' : '启用' }}
              </Button>
            </Space>
          </template>
        </Table>
      </template>
    </Modal>
  </div>
</template>
