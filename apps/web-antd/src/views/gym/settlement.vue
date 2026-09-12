<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Table,
} from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import AdminDrawer from './components/admin-drawer.vue';
import Page from './components/admin-page.vue';
import FilterBar from './components/filter-bar.vue';
import ResourcePage from './components/resource-page.vue';

const props = defineProps<{ resource: string }>();
const stores = ref<GymRow[]>([]);
const accounts = ref<GymRow[]>([]);
const storeId = ref<string>();
const rules = ref<GymRow[]>([]);
const visible = ref(false);
const busy = ref(false);
const form = ref<Record<string, any>>({});
const detail = ref<GymRow>();
const showDetail = ref(false);
async function all(path: string) {
  const result: GymRow[] = [];
  for (let page = 1; ; page++) {
    const data = await gymApi.list(path, { page, pageSize: 100 });
    result.push(...data.items);
    if (result.length >= data.total) return result;
  }
}
async function loadRules() {
  if (storeId.value)
    rules.value = await all(`stores/${storeId.value}/settlement-rules`);
}
onMounted(async () => {
  if (props.resource === 'settlement-rules') {
    stores.value = await all('stores');
    accounts.value = await all('payment-accounts');
    storeId.value = stores.value[0]?.id;
    await loadRules();
  }
});
function edit(row?: Record<string, any>) {
  form.value = row
    ? JSON.parse(JSON.stringify(row))
    : {
        cycleUnit: 'day',
        cycleValue: 1,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        items: [{ paymentAccountId: undefined, ratio: 1 }],
      };
  visible.value = true;
}
async function save() {
  busy.value = true;
  try {
    const { cycleUnit, cycleValue, effectiveFrom, effectiveTo, items } =
      form.value;
    const body = {
      cycleUnit,
      cycleValue,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      items,
    };
    await (form.value.id
      ? gymApi.patch(`settlement-rules/${form.value.id}`, body)
      : gymApi.post(`stores/${storeId.value}/settlement-rules`, body));
    visible.value = false;
    await loadRules();
    message.success('草稿已保存');
  } finally {
    busy.value = false;
  }
}
async function activate(row: Record<string, any>) {
  await gymApi.patch(`settlement-rules/${row.id}`, { status: 'active' });
  await loadRules();
}
async function bind(row: GymRow) {
  await gymApi.post(`payment-accounts/${row.id}/bindings`, {});
}
async function details(row: GymRow) {
  detail.value = await gymApi.get(`settlements/${row.id}`);
  showDetail.value = true;
}
function accountBody(values: Record<string, any>, row?: GymRow) {
  if (row)
    return {
      accountName: values.accountName,
      credentialRef: values.credentialRef,
    };
  const { lastFour, credentialRef, ...rest } = values;
  return { ...rest, accountDetails: { lastFour, credentialRef } };
}
const scopeFilter = computed({
  get: () => ({ storeId: storeId.value }),
  set: (value: Record<string, any>) => {
    storeId.value = value.storeId;
  },
});
</script>

<template>
  <div class="gym-view">
    <Page v-if="resource === 'settlement-rules'" title="分账规则">
      <Alert
        message="有效期含开始日、不含结束日。只有渠道已绑定账户可以启用；启用版本不可修改。"
        type="info"
      />
      <FilterBar
        v-model="scopeFilter"
        :keyword="false"
        immediate
        :fields="[
          {
            key: 'storeId',
            label: '配置门店',
            type: 'select',
            clearable: false,
            options: stores.map((s) => ({ label: s.name, value: s.id })),
          },
        ]"
        @search="loadRules"
      />
      <div class="gym-toolbar">
        <Button type="primary" :disabled="!storeId" @click="edit()">
          新增版本
        </Button>
      </div>
      <Table
        row-key="id"
        :data-source="rules"
        :columns="[
          { title: '版本', dataIndex: 'version' },
          { title: '周期', dataIndex: 'cycleUnit' },
          { title: '间隔', dataIndex: 'cycleValue' },
          { title: '生效', dataIndex: 'effectiveFrom' },
          { title: '失效', dataIndex: 'effectiveTo' },
          { title: '状态', dataIndex: 'status' },
          { title: '操作', key: 'action' },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <Space v-if="column.key === 'action'">
            <Button @click="edit(record)">
              {{ record.status === 'draft' ? '编辑' : '查看' }}
</Button><Button v-if="record.status === 'draft'" @click="activate(record)">
              启用
            </Button>
          </Space>
        </template>
      </Table>
      <AdminDrawer
        v-model:open="visible"
        title="分账规则版本"
        :confirm-loading="busy"
        :ok-button-props="{ disabled: form.status === 'active' }"
        @ok="save"
      >
        <Form layout="vertical">
          <FormItem label="周期">
            <Select
              v-model:value="form.cycleUnit"
              :options="[
                { label: '天', value: 'day' },
                { label: '周', value: 'week' },
                { label: '月', value: 'month' },
              ]"
            />
          </FormItem>
          <FormItem label="周期间隔">
            <InputNumber v-model:value="form.cycleValue" :min="1" :max="365" />
          </FormItem>
          <FormItem label="生效日期">
            <Input v-model:value="form.effectiveFrom" type="date" />
          </FormItem>
          <FormItem label="失效日期（不含）">
            <Input v-model:value="form.effectiveTo" type="date" />
          </FormItem>
          <FormItem
            v-for="(item, index) in form.items"
            :key="index"
            :label="`接收账户 ${Number(index) + 1} / 比例`"
          >
            <Space>
              <Select
                v-model:value="item.paymentAccountId"
                style="width: 250px"
                :options="
                  accounts.map((a) => ({
                    label: `${a.accountName} ${a.accountMasked} (${a.bindingStatus})`,
                    value: a.id,
                  }))
                "
              /><InputNumber
                v-model:value="item.ratio"
                :min="0"
                :max="1"
                :step="0.01"
              /><Button @click="form.items.splice(Number(index), 1)">
                移除
              </Button>
            </Space>
          </FormItem>
          <Button @click="form.items.push({ ratio: 0 })">添加接收账户</Button>
        </Form>
      </AdminDrawer>
    </Page>
    <ResourcePage
      v-else-if="resource === 'payment-accounts'"
      title="收款账户"
      endpoint="payment-accounts"
      write-code="settlement:manage"
      store-filter
      :prepare="accountBody"
      :fields="[
        { key: 'accountName', label: '账户名称', required: true },
        {
          key: 'storeId',
          label: '所属门店（留空为总部）',
          source: 'stores',
          immutable: true,
        },
        {
          key: 'provider',
          label: '渠道',
          type: 'select',
          required: true,
          immutable: true,
          options: [
            { label: '微信', value: 'wechat' },
            { label: '支付宝', value: 'alipay' },
            { label: '银行', value: 'bank' },
          ],
        },
        { key: 'merchantId', label: '商户号', required: true, immutable: true },
        {
          key: 'lastFour',
          label: '账号末四位',
          required: true,
          immutable: true,
        },
        { key: 'credentialRef', label: '安全存储凭据引用' },
      ]"
      :columns="[
        { title: '名称', dataIndex: 'accountName' },
        { title: '门店', dataIndex: 'storeName' },
        { title: '渠道', dataIndex: 'provider' },
        { title: '商户号', dataIndex: 'merchantId' },
        { title: '账号', dataIndex: 'accountMasked' },
        { title: '绑定状态', dataIndex: 'bindingStatus' },
      ]"
    >
      <template #toolbar>
        <Alert
          message="仅保存脱敏账号与凭据引用；真实支付渠道未配置。"
          type="info"
        />
      </template>
      <template #actions="{ row }">
        <Button @click="bind(row)">渠道绑定</Button>
      </template>
    </ResourcePage>
    <ResourcePage
      v-else
      title="分账结算记录"
      endpoint="settlements"
      :fields="[]"
      :create="false"
      :edit="false"
      store-filter
      time-filter
      @detail="details"
      :columns="[
        { title: '门店', dataIndex: 'storeName' },
        { title: '订单', dataIndex: 'orderNo' },
        { title: '分账基数', dataIndex: 'baseAmount' },
        { title: '应到账时间', dataIndex: 'dueAt' },
        { title: '状态', dataIndex: 'status' },
      ]"
    />
    <AdminDrawer
      v-model:open="showDetail"
      title="分账明细"
      :footer="null"
      width="800px"
    >
      <p>分账基数：{{ detail?.baseAmount }}；状态：{{ detail?.status }}</p>
      <Table
        row-key="id"
        :data-source="detail?.items"
        :columns="[
          { title: '账户', dataIndex: 'accountName' },
          { title: '脱敏账号', dataIndex: 'accountMasked' },
          { title: '比例', dataIndex: 'ratio' },
          { title: '金额', dataIndex: 'amount' },
          { title: '状态', dataIndex: 'status' },
          { title: '到账时间', dataIndex: 'settledAt' },
          { title: '失败原因', dataIndex: 'failureReason' },
        ]"
      />
    </AdminDrawer>
  </div>
</template>
