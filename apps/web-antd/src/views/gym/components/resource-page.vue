<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { computed, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';

export interface Field {
  key: string;
  label: string;
  type?:
    | 'date'
    | 'datetime'
    | 'money'
    | 'multi'
    | 'number'
    | 'password'
    | 'select'
    | 'text'
    | 'textarea';
  required?: boolean;
  options?: { label: string; value: any }[];
  source?: string;
  default?: any;
  immutable?: boolean;
  hidden?: boolean;
}
const props = withDefaults(
  defineProps<{
    title: string;
    endpoint: string;
    fields: Field[];
    columns: { title: string; dataIndex: string }[];
    writeCode?: string;
    create?: boolean;
    edit?: boolean;
    storeFilter?: boolean;
    timeFilter?: boolean;
    prepare?: (
      values: Record<string, any>,
      row?: GymRow,
    ) => Record<string, any>;
    initial?: (row: GymRow) => GymRow;
    editable?: (row: GymRow) => boolean;
  }>(),
  {
    create: true,
    edit: true,
    writeCode: undefined,
    prepare: undefined,
    initial: undefined,
    editable: undefined,
  },
);
const emit = defineEmits<{ changed: []; detail: [row: GymRow] }>();
const items = ref<GymRow[]>([]);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const filters = reactive<Record<string, any>>({ keyword: '' });
const timeMode = ref('date');
const response = ref<Record<string, any>>({});
const visible = ref(false);
const current = ref<GymRow>();
const form = reactive<Record<string, any>>({});
const options = reactive<Record<string, { label: string; value: any }[]>>({});
const sourceRows = reactive<Record<string, GymRow[]>>({});
const formRef = ref();
const stores = ref<{ label: string; value: string }[]>([]);
const writable = computed(() => !!props.writeCode && canGym(props.writeCode));
const visibleFields = computed(() =>
  props.fields.filter((f) => !f.hidden && !(current.value && f.immutable)),
);
const displayColumns = computed(() => [
  ...props.columns,
  { title: '操作', dataIndex: '_actions', width: 180 },
]);
const statuses: Record<string, string> = {
  active: '启用',
  inactive: '停用',
  draft: '草稿',
  published: '已发布',
  lead: '潜客',
  member: '会员',
  hq: '总部',
  store: '门店',
  period: '期限卡',
  count: '次卡',
  all: '全部门店',
  selected: '指定门店',
  male: '男',
  female: '女',
  unspecified: '未填写',
  pending: '待处理',
  approved: '已通过',
  rejected: '已拒绝',
  signed: '已签署',
  cancelled: '已取消',
  confirmed: '已确认',
  completed: '已完成',
  failed: '失败',
  succeeded: '成功',
  queued: '排队中',
  frozen: '冻结',
  expired: '已过期',
  group: '操课',
  personal: '私教',
  scheduled: '待上课',
  attended: '已上课',
  missed: '未到课',
  face: '刷脸',
  qr: '扫码',
  manual: '人工',
  device: '设备',
  guest: '访客',
  unknown: '陌生访客',
  miniapp: '小程序',
  app: 'App',
  course: '课程',
};
async function load() {
  loading.value = true;
  try {
    const data = await gymApi.list(props.endpoint, {
      ...filters,
      page: page.value,
      pageSize: pageSize.value,
    });
    items.value = data.items;
    response.value = data;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}
async function loadOptions() {
  const sources = [
    ...new Set(props.fields.flatMap((f) => (f.source ? [f.source] : []))),
  ];
  if (props.storeFilter && !sources.includes('stores')) sources.push('stores');
  await Promise.all(
    sources.map(async (source) => {
      // Options are paged too; do not silently truncate references to the first 100 records.
      let all: GymRow[] = [];
      let n = 1;
      let count = Infinity;
      while (all.length < count) {
        const result = await gymApi.list(source, { page: n++, pageSize: 100 });
        all = [...all, ...result.items];
        count = result.total;
        if (result.items.length === 0) break;
      }
      const values = all.map((r) => ({
        label: r.name ?? r.title ?? r.code,
        value: r.id,
      }));
      sourceRows[source] = all;
      props.fields
        .filter((f) => f.source === source)
        .forEach((f) => {
          options[f.key] = values;
        });
      if (source === 'stores') stores.value = values;
    }),
  );
}
function fieldOptions(field: Field) {
  if (field.options) return field.options;
  if (!field.source || !form.storeId || field.source === 'stores')
    return options[field.key] ?? [];
  return (sourceRows[field.source] ?? [])
    .filter((r) => {
      if (
        field.source === 'course-products' &&
        (r.kind !== 'group' || r.status !== 'active')
      )
        return false;
      if (field.source === 'members')
        return (
          r.storeIds?.includes(form.storeId) ||
          r.registeredStoreId === form.storeId
        );
      return r.storeId === form.storeId || r.storeIds?.includes(form.storeId);
    })
    .map((r) => ({ label: r.name ?? r.title ?? r.code, value: r.id }));
}
async function open(row?: GymRow) {
  current.value = row;
  for (const key of Object.keys(form)) Reflect.deleteProperty(form, key);
  const raw = row ? await gymApi.get(`${props.endpoint}/${row.id}`) : undefined;
  const detail = raw && props.initial ? props.initial(raw) : raw;
  for (const f of props.fields)
    form[f.key] =
      detail?.[f.key] ??
      structuredClone(f.default ?? (f.type === 'multi' ? [] : undefined));
  visible.value = true;
}
async function save() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    const payload: Record<string, any> = {};
    for (const f of visibleFields.value)
      if (form[f.key] !== undefined && form[f.key] !== '')
        payload[f.key] = form[f.key];
    const data = props.prepare
      ? props.prepare(payload, current.value)
      : payload;
    await (current.value
      ? gymApi.patch(`${props.endpoint}/${current.value.id}`, data)
      : gymApi.post(props.endpoint, data));
    message.success('已保存');
    visible.value = false;
    await load();
    emit('changed');
  } finally {
    saving.value = false;
  }
}
function display(value: any, key: string) {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value))
    return value
      .map(
        (v) =>
          options[key]?.find((o) => o.value === v)?.label ?? statuses[v] ?? v,
      )
      .join('、');
  if (typeof value === 'boolean') return value ? '是' : '否';
  const label =
    options[key]?.find((o) => o.value === value)?.label ??
    props.fields
      .find((f) => f.key === key)
      ?.options?.find((o) => o.value === value)?.label;
  if (label) return label;
  if (statuses[value]) return statuses[value];
  if (typeof value === 'object') return Object.values(value).join(' / ');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  return value;
}
function search() {
  page.value = 1;
  void load();
}
function resetFilters() {
  Object.keys(filters).forEach((key) => Reflect.deleteProperty(filters, key));
  search();
}
function changeTimeMode() {
  for (const key of ['date', 'month', 'from', 'to'])
    Reflect.deleteProperty(filters, key);
  search();
}
watch(
  () => props.endpoint,
  () => {
    page.value = 1;
    Object.keys(filters).forEach((key) => Reflect.deleteProperty(filters, key));
    void load();
    void loadOptions();
  },
  { immediate: true },
);
defineExpose({ load, open, items });
</script>

<template>
  <Page :title="title">
    <Alert
      type="info"
      message="开发环境：当前数据由 Mock 服务模拟，重启服务会恢复示例数据。"
      show-icon
      class="mb-4"
    />
    <Space wrap class="mb-4">
      <Input
        v-model:value="filters.keyword"
        placeholder="名称 / 编号 / 手机号"
        allow-clear
        @press-enter="search"
      />
      <Select
        v-if="storeFilter"
        v-model:value="filters.storeId"
        :options="stores"
        placeholder="全部授权门店"
        allow-clear
        style="min-width: 180px"
        @change="search"
      />
      <Input
        v-if="timeFilter && timeMode === 'date'"
        v-model:value="filters.date"
        type="date"
        @change="search"
      />
      <Select
        v-if="timeFilter"
        v-model:value="timeMode"
        :options="[
          { label: '按天', value: 'date' },
          { label: '按月', value: 'month' },
          { label: '时间范围', value: 'range' },
        ]"
        style="min-width: 120px"
        @change="changeTimeMode"
      />
      <Input
        v-if="timeFilter && timeMode === 'month'"
        v-model:value="filters.month"
        type="month"
        @change="search"
      />
      <template v-if="timeFilter && timeMode === 'range'">
<Input
          v-model:value="filters.from"
          type="date"
          placeholder="起始日期"
/><Input
          v-model:value="filters.to"
          type="date"
          placeholder="结束日期（不含）"
      />
</template>
      <slot name="filters" :filters="filters" :search="search"></slot>
      <Button @click="search">查询</Button><Button @click="resetFilters"> 重置 </Button>
      <Button
        v-if="writable && create !== false"
        type="primary"
        @click="open()"
      >
        新增
      </Button>
      <slot name="toolbar" :reload="load"></slot>
    </Space>
    <slot name="summary" :data="response"></slot>
    <Table
      :data-source="items"
      :columns="displayColumns"
      :loading="loading"
      row-key="id"
      :pagination="{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (n: number) => `共 ${n} 条`,
      }"
      @change="
        (p) => {
          page = p.current ?? 1;
          pageSize = p.pageSize ?? 20;
          load();
        }
      "
    >
      <template #bodyCell="{ column, record, text }">
        <Space v-if="column.dataIndex === '_actions'" wrap>
          <Button
            v-if="
              writable &&
              edit !== false &&
              (!editable || editable(record as GymRow))
            "
            type="link"
            @click="open(record as GymRow)"
          >
            编辑
          </Button>
          <slot name="actions" :row="record as GymRow" :reload="load"></slot>
        </Space>
        <Tag v-else-if="column.dataIndex === 'status'">
          {{ display(text, column.dataIndex) }}
        </Tag>
        <span v-else>{{ display(text, String(column.dataIndex ?? '')) }}</span>
      </template>
    </Table>
    <Modal
      v-model:open="visible"
      :title="`${current ? '编辑' : '新增'}${title}`"
      :confirm-loading="saving"
      :width="640"
      destroy-on-close
      @ok="save"
    >
      <Form ref="formRef" :model="form" layout="vertical">
        <FormItem
          v-for="field in visibleFields"
          :key="field.key"
          :name="field.key"
          :label="field.label"
          :rules="
            field.required
              ? [{ required: true, message: `请填写${field.label}` }]
              : []
          "
        >
          <Select
            v-if="field.type === 'select' || field.type === 'multi'"
            v-model:value="form[field.key]"
            :options="fieldOptions(field)"
            :mode="field.type === 'multi' ? 'multiple' : undefined"
            show-search
            option-filter-prop="label"
            allow-clear
          />
          <InputNumber
            v-else-if="field.type === 'number'"
            v-model:value="form[field.key]"
            :min="0"
            :precision="0"
            style="width: 100%"
          />
          <Input.TextArea
            v-else-if="field.type === 'textarea'"
            v-model:value="form[field.key]"
            :rows="3"
          />
          <Input
            v-else
            v-model:value="form[field.key]"
            :type="
              field.type === 'date'
                ? 'date'
                : field.type === 'datetime'
                  ? 'datetime-local'
                  : field.type === 'password'
                    ? 'password'
                    : 'text'
            "
          />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
