<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
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
const page = ref();
const store: Field = {
  key: 'storeId',
  label: '门店',
  source: 'stores',
  type: 'select',
  required: true,
  immutable: true,
};
const member: Field = {
  key: 'memberId',
  label: '会员',
  source: 'members',
  type: 'select',
  required: true,
  immutable: true,
};
const configs: Record<
  string,
  {
    title: string;
    code?: string;
    fields: Field[];
    columns: string[][];
    create?: boolean;
    edit?: boolean;
  }
> = {
  'course-products': {
    title: '课程产品',
    code: 'courses:write',
    fields: [
      store,
      { key: 'name', label: '课程名称', required: true },
      { key: 'description', label: '介绍', type: 'textarea' },
      {
        key: 'sessionCount',
        label: '课次',
        type: 'number',
        required: true,
        default: 1,
      },
      {
        key: 'durationMinutes',
        label: '时长（分钟）',
        type: 'number',
        required: true,
        default: 60,
      },
      {
        key: 'price',
        label: '价格（元）',
        type: 'money',
        required: true,
        default: '0.00',
      },
    ],
    columns: [
      ['门店', 'storeName'],
      ['课程', 'name'],
      ['类型', 'kind'],
      ['课次', 'sessionCount'],
      ['时长', 'durationMinutes'],
      ['价格', 'price'],
      ['状态', 'status'],
    ],
  },
  'course-sessions': {
    title: '课程安排',
    code: 'courses:write',
    fields: [
      store,
      {
        key: 'courseProductId',
        label: '操课产品',
        source: 'course-products',
        type: 'select',
        required: true,
        immutable: true,
      },
      {
        key: 'coachId',
        label: '教练',
        source: 'coaches',
        type: 'select',
        required: true,
        immutable: true,
      },
      { key: 'room', label: '场地' },
      { key: 'startsAt', label: '开始时间', type: 'datetime', required: true },
      { key: 'endsAt', label: '结束时间', type: 'datetime', required: true },
      {
        key: 'capacity',
        label: '容量',
        type: 'number',
        required: true,
        default: 20,
      },
    ],
    columns: [
      ['门店', 'storeName'],
      ['课程', 'courseName'],
      ['教练', 'coachName'],
      ['场地', 'room'],
      ['开始', 'startsAt'],
      ['结束', 'endsAt'],
      ['容量', 'capacity'],
      ['已预约', 'reservedCount'],
      ['状态', 'status'],
    ],
  },
  bookings: {
    title: '预约管理',
    code: 'bookings:write',
    create: false,
    edit: false,
    fields: [],
    columns: [
      ['门店', 'storeName'],
      ['会员', 'memberName'],
      ['课程', 'courseName'],
      ['上课时间', 'sessionStartsAt'],
      ['预约时间', 'bookedAt'],
      ['状态', 'status'],
      ['备注', 'note'],
    ],
  },
  checkins: {
    title: '签到记录',
    create: false,
    edit: false,
    fields: [],
    columns: [
      ['门店', 'storeName'],
      ['会员', 'memberName'],
      ['入场时间', 'enteredAt'],
      ['离场时间', 'exitedAt'],
      ['方式', 'method'],
      ['访客类型', 'visitorType'],
      ['状态', 'status'],
    ],
  },
  'lesson-records': {
    title: '上课记录',
    create: false,
    edit: false,
    fields: [],
    columns: [
      ['门店', 'storeName'],
      ['会员', 'memberName'],
      ['教练', 'coachName'],
      ['确认时间', 'confirmedAt'],
      ['扣课次数', 'sessionUnits'],
      ['方式', 'method'],
      ['状态', 'status'],
    ],
  },
  'body-measurements': {
    title: '体测记录',
    code: 'measurements:write',
    fields: [
      store,
      member,
      {
        key: 'measuredAt',
        label: '体测时间',
        type: 'datetime',
        required: true,
        immutable: true,
      },
      { key: 'heightCm', label: '身高（cm）' },
      { key: 'weightKg', label: '体重（kg）' },
      { key: 'bodyFatPercent', label: '体脂率（%）' },
      { key: 'muscleMassKg', label: '肌肉量（kg）' },
      { key: 'note', label: '备注', type: 'textarea' },
    ],
    columns: [
      ['门店', 'storeName'],
      ['会员', 'memberName'],
      ['体测时间', 'measuredAt'],
      ['身高', 'heightCm'],
      ['体重', 'weightKg'],
      ['体脂率', 'bodyFatPercent'],
      ['肌肉量', 'muscleMassKg'],
    ],
  },
  'qr-codes': {
    title: '小程序 / App 码',
    code: 'courses:write',
    edit: false,
    fields: [
      store,
      {
        key: 'platform',
        label: '平台',
        type: 'select',
        required: true,
        default: 'miniapp',
        options: [
          { label: '小程序', value: 'miniapp' },
          { label: 'App', value: 'app' },
        ],
      },
      {
        key: 'sceneType',
        label: '场景',
        type: 'select',
        required: true,
        default: 'store',
        options: [
          { label: '门店', value: 'store' },
          { label: '课程', value: 'course' },
        ],
      },
      {
        key: 'sceneId',
        label: '课程（课程场景必选）',
        source: 'course-sessions',
        type: 'select',
      },
    ],
    columns: [
      ['门店', 'storeName'],
      ['平台', 'platform'],
      ['场景', 'sceneType'],
      ['状态', 'status'],
      ['创建时间', 'createdAt'],
    ],
  },
};
const config = computed(() => {
  const selected = configs[props.resource];
  if (!selected) throw new Error('未知课程页面');
  return selected;
});
function editable(row: GymRow) {
  if (props.resource === 'course-products') return row.kind === 'group';
  if (props.resource === 'course-sessions') return row.status === 'scheduled';
  return true;
}
function initial(row: GymRow) {
  const data = { ...row };
  for (const key of ['startsAt', 'endsAt', 'measuredAt'])
    if (data[key]) {
      const time = new Date(data[key]);
      data[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
    }
  return data;
}
function prepare(values: Record<string, any>) {
  const result = { ...values };
  for (const key of ['startsAt', 'endsAt', 'measuredAt'])
    if (result[key]) result[key] = new Date(result[key]).toISOString();
  if (props.resource === 'qr-codes' && result.sceneType === 'store')
    Reflect.deleteProperty(result, 'sceneId');
  return result;
}
const visible = ref(false);
const mode = ref('');
const current = ref<GymRow>();
const members = ref<GymRow[]>([]);
const sessions = ref<GymRow[]>([]);
const rights = ref<{ label: string; value: string; type: string }[]>([]);
const sessionId = ref<string>();
const memberId = ref<string>();
const rightId = ref<string>();
const note = ref('');
const saving = ref(false);
async function all(endpoint: string, query = {}) {
  let records: GymRow[] = [];
  for (let n = 1; ; n++) {
    const result = await gymApi.list(endpoint, {
      ...query,
      page: n,
      pageSize: 100,
    });
    records = [...records, ...result.items];
    if (records.length >= result.total || result.items.length === 0)
      return records;
  }
}
async function openBooking() {
  sessions.value = await all('course-sessions', {
    status: 'scheduled',
    from: new Date().toISOString(),
  });
  sessionId.value = undefined;
  memberId.value = undefined;
  rightId.value = undefined;
  rights.value = [];
  members.value = [];
  note.value = '';
  mode.value = 'booking';
  visible.value = true;
}
async function changeSession() {
  memberId.value = undefined;
  rightId.value = undefined;
  rights.value = [];
  const session = sessions.value.find((s) => s.id === sessionId.value);
  members.value = session
    ? await all('members', { storeId: session.storeId })
    : [];
}
async function changeMember() {
  rights.value = [];
  rightId.value = undefined;
  if (!memberId.value) return;
  const session = sessions.value.find((s) => s.id === sessionId.value);
  const [cards, packs] = await Promise.all([
    all(`members/${memberId.value}/cards`),
    all(`members/${memberId.value}/course-packs`),
  ]);
  rights.value = [
    ...cards
      .filter(
        (c) =>
          c.status === 'active' &&
          (c.accessScope === 'all' || c.storeIds.includes(session?.storeId)),
      )
      .map((c) => ({
        label: `${c.name} ${c.cardNo}`,
        value: c.id,
        type: 'memberCardId',
      })),
    ...packs
      .filter(
        (p) =>
          p.status === 'active' &&
          p.courseProductId === session?.courseProductId,
      )
      .map((p) => ({
        label: `${p.name} 可约${p.remainingSessions - p.reservedSessions}次`,
        value: p.id,
        type: 'memberCoursePackId',
      })),
  ];
}
async function saveBooking() {
  const right = rights.value.find((r) => r.value === rightId.value);
  if (!sessionId.value || !memberId.value || !right) {
    message.error('请选择课程、会员和预约权益');
    return;
  }
  saving.value = true;
  try {
    await gymApi.post('bookings', {
      sessionId: sessionId.value,
      memberId: memberId.value,
      [right.type]: right.value,
      note: note.value,
    });
    message.success('预约成功');
    visible.value = false;
    await page.value?.load();
  } finally {
    saving.value = false;
  }
}
async function cancel(row: GymRow) {
  await gymApi.patch(`${props.resource}/${row.id}`, { status: 'cancelled' });
  message.success('已取消');
  await page.value?.load();
}
async function detail(row: GymRow) {
  current.value = await gymApi.get(`${props.resource}/${row.id}`);
  mode.value = 'detail';
  visible.value = true;
}
async function report(file: File) {
  if (!current.value) return false;
  saving.value = true;
  try {
    const uploaded = await uploadGymFile(
      file,
      'body_report',
      current.value.storeId,
    );
    await gymApi.patch(`body-measurements/${current.value.id}`, {
      reportFileId: uploaded.id,
    });
    await detail(current.value);
    message.success('报告已保存');
  } finally {
    saving.value = false;
  }
  return false;
}
const summary = ref<Record<string, number>>();
async function refreshCheckins() {
  if (props.resource !== 'checkins') return;
  await page.value?.load();
  summary.value = await gymApi.get('checkins/summary');
}
let timer: ReturnType<typeof setInterval> | undefined;
function start() {
  if (props.resource === 'checkins' && !timer) {
    void refreshCheckins();
    timer = setInterval(() => {
      if (!document.hidden) void refreshCheckins();
    }, 15_000);
  }
}
function stop() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
onMounted(start);
onActivated(start);
onDeactivated(stop);
onUnmounted(stop);
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :key="resource"
      :title="config.title"
      :endpoint="resource"
      :fields="config.fields"
      :columns="
        config.columns.map(([title = '', dataIndex = '']) => ({
          title,
          dataIndex,
        }))
      "
      :write-code="config.code"
      :create="config.create !== false"
      :edit="config.edit !== false"
      :editable="editable"
      :initial="initial"
      :prepare="prepare"
      store-filter
      time-filter
    >
      <template
        v-if="
          (resource === 'bookings' && canGym('bookings:write')) ||
          (resource === 'checkins' && summary)
        "
        #toolbar
      >
        <Button
          v-if="resource === 'bookings' && canGym('bookings:write')"
          type="primary"
          @click="openBooking"
        >
          代会员预约
        </Button>
        <span v-if="resource === 'checkins' && summary">今日授权门店：入场 {{ summary.entries }} 次，会员
          {{ summary.members }} 人，陌生访客 {{ summary.visitors }} 次，昨日
          {{ summary.yesterdayEntries }} 次（每15秒刷新）</span>
      </template>
      <template
        v-if="!['checkins', 'lesson-records'].includes(resource)"
        #actions="{ row, reload }"
      >
        <Button
          v-if="
            resource === 'course-products' &&
            row.kind === 'group' &&
            canGym('courses:write')
          "
          type="link"
          @click="
            async () => {
              await gymApi.patch(`course-products/${row.id}`, {
                status: row.status === 'active' ? 'inactive' : 'active',
              });
              await reload();
            }
          "
        >
          {{ row.status === 'active' ? '停用' : '启用' }}
        </Button>
        <Button
          v-if="
            (resource === 'bookings' &&
              row.status === 'confirmed' &&
              canGym('bookings:write')) ||
            (resource === 'course-sessions' &&
              row.status === 'scheduled' &&
              canGym('courses:write'))
          "
          type="link"
          danger
          @click="cancel(row)"
        >
          取消{{ resource === 'bookings' ? '预约' : '排课' }}
        </Button>
        <Button
          v-if="resource === 'body-measurements'"
          type="link"
          @click="detail(row)"
        >
          详情 / 报告
        </Button>
        <Button
          v-if="resource === 'qr-codes' && row.providerCodeFileId"
          type="link"
          @click="openGymFile(row.providerCodeFileId)"
        >
          查看码
        </Button>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="mode === 'booking' ? '代会员预约' : '体测详情'"
      :confirm-loading="saving"
      :footer="mode === 'booking' ? undefined : null"
      @ok="saveBooking"
    >
      <Form v-if="mode === 'booking'" layout="vertical">
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
      <template v-else-if="current">
        <Descriptions :column="1" bordered>
          <DescriptionsItem
            v-for="[title, key] in config.columns"
            :key="key"
            :label="title"
          >
            {{ current[key ?? ''] ?? '—' }}
</DescriptionsItem><DescriptionsItem label="备注">
            {{ current.note }}
          </DescriptionsItem>
        </Descriptions>
        <Table
          v-if="current.measurements?.length"
          :data-source="current.measurements"
          :pagination="false"
          :columns="[
            { title: '测量项', dataIndex: 'name' },
            { title: '值', dataIndex: 'value' },
            { title: '单位', dataIndex: 'unit' },
          ]"
        />
        <Space class="mt-4">
          <Button
            v-if="current.reportFileId"
            @click="openGymFile(current.reportFileId)"
          >
            查看报告
</Button><Upload
            v-if="canGym('measurements:write')"
            :before-upload="report"
            :show-upload-list="false"
            accept=".pdf,.png,.jpg,.jpeg"
          >
            <Button :loading="saving">上传 / 更新报告</Button>
          </Upload>
        </Space>
      </template>
    </AdminDrawer>
    <Alert
      v-if="resource === 'qr-codes'"
      type="info"
      message="生成二维码需要配置真实小程序/App渠道或落地链接，当前 Mock 未接入渠道。"
    />
  </div>
</template>
