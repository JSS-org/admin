<script setup lang="ts">
import type { FilterField } from './filter-bar.vue';

import type { GymRow } from '#/api/gym';

import { computed, getCurrentInstance, reactive, ref, useSlots, watch } from 'vue';

import { Button, Form, FormItem, Input, InputNumber, message, Select, Space, Table, Tag } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';

import AdminDrawer from './admin-drawer.vue';
import Page from './admin-page.vue';
import FilterBar from './filter-bar.vue';
import TableSelectionActions from './table-selection-actions.vue';
import { useTableSelection } from './use-table-selection';

export interface Field {
  key: string;
  label: string;
  type?: 'date' | 'datetime' | 'money' | 'multi' | 'number' | 'password' | 'select' | 'text' | 'textarea';
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
    keywordFilter?: boolean;
    filterFields?: FilterField[];
    idempotent?: boolean;
    prepare?: (values: Record<string, any>, row?: GymRow) => Record<string, any>;
    initial?: (row: GymRow) => GymRow;
    editable?: (row: GymRow) => boolean;
  }>(),
  {
    keywordFilter: true,
    filterFields: () => [],
    create: true,
    edit: true,
    writeCode: undefined,
    prepare: undefined,
    initial: undefined,
    editable: undefined,
  },
);
const emit = defineEmits<{
  changed: [];
  detail: [row: GymRow];
  saved: [row: GymRow];
}>();
const slots = useSlots();
const instance = getCurrentInstance();
let requestKey = '';
const items = ref<GymRow[]>([]);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const selectionDisabled = computed(() => loading.value || saving.value);
const {
  clear: clearSelection,
  rowSelection,
  selectAll,
  selectedKeys,
  selectedRows,
} = useTableSelection(items, selectionDisabled);
let loadRequest = 0;
const filters = reactive<Record<string, any>>({ keyword: '' });
const filterDraft = ref<Record<string, any>>({});
const response = ref<Record<string, any>>({});
const visible = ref(false);
const current = ref<GymRow>();
const form = reactive<Record<string, any>>({});
const options = reactive<Record<string, { label: string; value: any }[]>>({});
const sourceRows = reactive<Record<string, GymRow[]>>({});
const formRef = ref();
const stores = ref<{ label: string; value: string }[]>([]);
const writable = computed(() => !!props.writeCode && canGym(props.writeCode));
const visibleFields = computed(() => props.fields.filter((f) => !f.hidden && !(current.value && f.immutable)));
const displayColumns = computed(() => [
  ...props.columns,
  ...((writable.value && props.edit) || slots.actions || instance?.vnode.props?.onDetail
    ? [{ title: '操作', dataIndex: '_actions', width: 240 }]
    : []),
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
  const request = ++loadRequest;
  loading.value = true;
  try {
    const data = await gymApi.list(props.endpoint, {
      ...filters,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (request !== loadRequest) return;
    items.value = data.items;
    response.value = data;
    total.value = data.total;
  } finally {
    if (request === loadRequest) loading.value = false;
  }
}
async function loadOptions() {
  const sources = [...new Set(props.fields.flatMap((f) => (f.source ? [f.source] : [])))];
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
  if (!field.source || !form.storeId || field.source === 'stores') return options[field.key] ?? [];
  return (sourceRows[field.source] ?? [])
    .filter((r) => {
      if (field.source === 'course-products' && (r.kind !== 'group' || r.status !== 'active')) return false;
      if (field.source === 'members') return r.storeIds?.includes(form.storeId) || r.registeredStoreId === form.storeId;
      if (!r.storeId && !r.storeIds) return true;
      return r.storeId === form.storeId || r.storeIds?.includes(form.storeId);
    })
    .map((r) => ({ label: r.name ?? r.title ?? r.code, value: r.id }));
}
async function open(row?: GymRow) {
  requestKey = crypto.randomUUID();
  current.value = row;
  for (const key of Object.keys(form)) Reflect.deleteProperty(form, key);
  const raw = row ? await gymApi.get(`${props.endpoint}/${row.id}`) : undefined;
  const detail = raw && props.initial ? props.initial(raw) : raw;
  for (const f of props.fields)
    form[f.key] = detail?.[f.key] ?? structuredClone(f.default ?? (f.type === 'multi' ? [] : undefined));
  visible.value = true;
}
async function save() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    const payload: Record<string, any> = {};
    for (const f of visibleFields.value)
      if (form[f.key] !== undefined && form[f.key] !== '') payload[f.key] = form[f.key];
    const data = props.prepare ? props.prepare(payload, current.value) : payload;
    const saved = await (current.value
      ? gymApi.patch(`${props.endpoint}/${current.value.id}`, data)
      : gymApi.post(props.endpoint, data, props.idempotent ? requestKey : undefined));
    message.success('已保存');
    visible.value = false;
    await load();
    emit('changed');
    emit('saved', saved);
  } finally {
    saving.value = false;
  }
}
function display(value: any, key: string) {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value))
    return value.map((v) => options[key]?.find((o) => o.value === v)?.label ?? statuses[v] ?? v).join('、');
  if (typeof value === 'boolean') return value ? '是' : '否';
  const label =
    options[key]?.find((o) => o.value === value)?.label ??
    props.fields.find((f) => f.key === key)?.options?.find((o) => o.value === value)?.label;
  if (label) return label;
  if (statuses[value]) return statuses[value];
  if (typeof value === 'object') return Object.values(value).join(' / ');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  return value;
}
function search() {
  clearSelection();
  for (const key of Object.keys(filters)) Reflect.deleteProperty(filters, key);
  Object.assign(filters, filterDraft.value);
  page.value = 1;
  void load();
}
watch(
  () => props.endpoint,
  () => {
    clearSelection();
    items.value = [];
    page.value = 1;
    filterDraft.value = {};
    Object.keys(filters).forEach((key) => Reflect.deleteProperty(filters, key));
    void load();
    void loadOptions();
  },
  { immediate: true },
);
watch([page, pageSize], clearSelection, { flush: 'sync' });
defineExpose({ load, open, items });
</script>

<template>
  <Page :title="title">
    <FilterBar
      v-model="filterDraft"
      :keyword="keywordFilter"
      :store-options="storeFilter ? stores : undefined"
      :time="timeFilter"
      :fields="filterFields"
      :loading="loading"
      @search="search"
      @reset="search"
    />
    <div class="gym-toolbar">
      <Button v-if="writable && create" type="primary" @click="open()"> 新增 </Button>
      <TableSelectionActions
        :selected="selectedKeys.length"
        :total="items.length"
        :disabled="selectionDisabled"
        @select-all="selectAll"
        @clear="clearSelection"
      />
      <slot name="toolbar" :reload="load" :selected-rows="selectedRows" :selected-row-keys="selectedKeys"></slot>
    </div>
    <slot name="summary" :data="response"></slot>
    <Table
      :data-source="items"
      :columns="displayColumns"
      :scroll="{ x: 'max-content' }"
      :loading="loading"
      :row-selection="rowSelection"
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
            v-if="writable && edit !== false && (!editable || editable(record as GymRow))"
            type="link"
            @click="open(record as GymRow)"
          >
            编辑
          </Button>
          <Button v-if="instance?.vnode.props?.onDetail" type="link" @click="emit('detail', record as GymRow)">
            详情
          </Button>
          <slot name="actions" :row="record as GymRow" :reload="load"></slot>
        </Space>
        <Tag v-else-if="column.dataIndex === 'status'">
          {{ display(text, column.dataIndex) }}
        </Tag>
        <span v-else>{{ display(text, String(column.dataIndex ?? '')) }}</span>
      </template>
    </Table>
    <AdminDrawer
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
          :rules="field.required ? [{ required: true, message: `请填写${field.label}` }] : []"
        >
          <Select
            v-if="field.source || field.type === 'select' || field.type === 'multi'"
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
          <Input.TextArea v-else-if="field.type === 'textarea'" v-model:value="form[field.key]" :rows="3" />
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
    </AdminDrawer>
  </Page>
</template>
