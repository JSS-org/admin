<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  TabPane,
  Tabs,
} from 'ant-design-vue';

import { gymApi } from '#/api/gym';

import ResourcePage from './components/resource-page.vue';

const props = defineProps<{ resource: string }>();
const configs: Record<string, { title: string; columns: string[][] }> = {
  'self-service-card-orders': {
    title: '自主办卡记录',
    columns: [
      ['订单号', 'orderNo'],
      ['门店', 'storeName'],
      ['会员', 'memberName'],
      ['来源', 'channel'],
      ['应付', 'payableAmount'],
      ['已付', 'paidAmount'],
      ['已退', 'refundedAmount'],
      ['状态', 'status'],
      ['下单时间', 'orderedAt'],
    ],
  },
  subscriptions: {
    title: '连续包月记录',
    columns: [
      ['门店', 'storeName'],
      ['会员', 'memberName'],
      ['状态', 'status'],
      ['授权时间', 'signedAt'],
      ['下次扣款', 'nextChargeAt'],
    ],
  },
  verifications: {
    title: '自助核销记录',
    columns: [
      ['门店', 'storeName'],
      ['会员', 'memberName'],
      ['类型', 'type'],
      ['渠道', 'channel'],
      ['结果', 'status'],
      ['核销时间', 'verifiedAt'],
    ],
  },
  'reports/performance': {
    title: '门店与员工业绩',
    columns: [
      ['门店 / 员工', 'name'],
      ['净实收', 'netAmount'],
      ['会员卡净额', 'cardAmount'],
      ['私教净额', 'ptAmount'],
      ['收款订单数', 'orderCount'],
      ['员工数', 'employeeCount'],
      ['员工业绩平均', 'averageEmployeeAmount'],
      ['订单均额', 'averageOrderAmount'],
    ],
  },
  'reports/members': {
    title: '会员汇总',
    columns: [
      ['门店', 'storeName'],
      ['总会员', 'totalMembers'],
      ['期间新增', 'newMembers'],
      ['潜客', 'leads'],
      ['30天内卡到期人数', 'expiringCards'],
      ['30天内课程到期人数', 'expiringCourses'],
    ],
  },
  'reports/member-cards': {
    title: '会员卡报表',
    columns: [
      ['卡种', 'name'],
      ['版本', 'version'],
      ['期间售出', 'soldCount'],
      ['期间净实收', 'netAmount'],
      ['持卡人数', 'holderCount'],
      ['期间使用次数', 'usageCount'],
    ],
  },
};
const config = computed(
  () => configs[props.resource] ?? { title: '售卡设置', columns: [] },
);
const columns = computed(() =>
  config.value.columns.map(([title = '', dataIndex = '']) => ({
    title,
    dataIndex,
  })),
);
const visible = ref(false);
const current = ref<GymRow>();
const cycles = ref<GymRow[]>([]);
async function details(row: GymRow) {
  current.value = await gymApi.get(`${props.resource}/${row.id}`);
  if (props.resource === 'subscriptions') {
    const data = await gymApi.list(`subscriptions/${row.id}/cycles`, {
      pageSize: 100,
    });
    cycles.value = data.items;
  }
  visible.value = true;
}
const stores = ref<GymRow[]>([]);
const cards = ref<GymRow[]>([]);
const storeId = ref<string>();
const tab = ref('online-sales-settings');
const settings = ref<Record<string, any>>({});
const busy = ref(false);
async function all(path: string, query = {}) {
  let result: GymRow[] = [];
  for (let n = 1; ; n++) {
    const data = await gymApi.list(path, { ...query, page: n, pageSize: 100 });
    result = [...result, ...data.items];
    if (result.length >= data.total || data.items.length === 0) return result;
  }
}
async function loadSettings() {
  if (!storeId.value) return;
  busy.value = true;
  try {
    settings.value = await gymApi.get(`stores/${storeId.value}/${tab.value}`);
    cards.value = await all('card-templates', {
      storeId: storeId.value,
      status: 'published',
    });
  } finally {
    busy.value = false;
  }
}
onMounted(async () => {
  if (props.resource === 'settings') {
    stores.value = await all('stores');
    storeId.value = stores.value[0]?.id;
    await loadSettings();
  }
});
const cardOptions = computed(() =>
  cards.value
    .filter(
      (c) =>
        tab.value !== 'subscription-settings' ||
        (c.kind === 'period' && c.durationDays >= 28 && c.durationDays <= 31),
    )
    .map((c) => ({ label: `${c.name} v${c.version}`, value: c.id })),
);
function addSetting() {
  if (tab.value === 'online-sales-settings')
    settings.value.offers.push({
      cardTemplateId: undefined,
      salePrice: '0.00',
      enabled: true,
    });
  else
    settings.value.items.push({
      cardTemplateId: undefined,
      price: '0.00',
      billingDay: null,
      renewalNoticeDays: 3,
      graceDays: 3,
      enabled: true,
    });
}
async function saveSettings() {
  if (!storeId.value) return;
  busy.value = true;
  try {
    let data: Record<string, any> = {
      enabled: settings.value.enabled,
      requireCheckin: settings.value.requireCheckin,
      supportedChannels: settings.value.supportedChannels,
      allowedStart: settings.value.allowedStart || null,
      allowedEnd: settings.value.allowedEnd || null,
    };
    if (tab.value === 'online-sales-settings')
      data = {
        enabled: settings.value.enabled,
        contractRequired: settings.value.contractRequired,
        offers: settings.value.offers.map((o: GymRow) => ({
          cardTemplateId: o.cardTemplateId,
          salePrice: o.salePrice,
          enabled: o.enabled,
          startsAt: o.startsAt || null,
          endsAt: o.endsAt || null,
        })),
      };
    if (tab.value === 'subscription-settings')
      data = {
        items: settings.value.items.map((i: GymRow) => ({
          cardTemplateId: i.cardTemplateId,
          price: i.price,
          billingDay: i.billingDay,
          renewalNoticeDays: i.renewalNoticeDays,
          graceDays: i.graceDays,
          enabled: i.enabled,
        })),
      };
    await gymApi.put(`stores/${storeId.value}/${tab.value}`, data);
    message.success('设置已保存');
    await loadSettings();
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <Page v-if="resource === 'settings'" title="在线售卡与核销设置">
    <Alert
      type="info"
      message="当前为Mock配置，不会向支付渠道发起扣款。"
      class="mb-4"
    />
    <Select
      v-model:value="storeId"
      :options="stores.map((s) => ({ label: s.name, value: s.id }))"
      style="min-width: 220px"
      @change="loadSettings"
    />
    <Tabs v-model:active-key="tab" @change="loadSettings">
<TabPane key="online-sales-settings" tab="在线售卡" /><TabPane
        key="subscription-settings"
        tab="连续包月"
/><TabPane key="verification-settings" tab="自助核销" />
</Tabs>
    <Form v-if="storeId" layout="vertical">
      <FormItem v-if="tab !== 'subscription-settings'" label="功能开关">
<Checkbox v-model:checked="settings.enabled">启用</Checkbox>
</FormItem>
      <FormItem v-if="tab === 'online-sales-settings'" label="合同">
<Checkbox v-model:checked="settings.contractRequired">
要求签署合同
</Checkbox>
</FormItem>
      <template v-if="tab === 'verification-settings'">
<FormItem label="入场要求">
<Checkbox v-model:checked="settings.requireCheckin">
核销前须签到
</Checkbox>
</FormItem><FormItem label="支持渠道">
<Select
            v-model:value="settings.supportedChannels"
            mode="multiple"
            :options="[
              { label: '小程序', value: 'miniapp' },
              { label: 'App', value: 'app' },
              { label: '美团', value: 'meituan' },
              { label: '抖音', value: 'douyin' },
            ]"
/>
</FormItem><Space>
<FormItem label="允许开始时间">
<Input
              v-model:value="settings.allowedStart"
              type="time"
/>
</FormItem><FormItem label="允许结束时间">
<Input
              v-model:value="settings.allowedEnd"
              type="time"
/>
</FormItem>
</Space>
</template>
      <template v-else>
        <div
          v-for="(item, index) in tab === 'online-sales-settings'
            ? settings.offers
            : settings.items"
          :key="index"
          class="mb-4"
        >
          <Space wrap>
<FormItem label="卡种">
<Select
                v-model:value="item.cardTemplateId"
                :options="cardOptions"
                style="min-width: 220px"
/>
</FormItem><FormItem label="售价（元）">
<Input
                v-if="tab === 'online-sales-settings'"
                v-model:value="item.salePrice"
/><Input
                v-else
                v-model:value="item.price"
/>
</FormItem><Checkbox v-model:checked="item.enabled">启用</Checkbox><Button
              danger
              @click="
                (tab === 'online-sales-settings'
                  ? settings.offers
                  : settings.items
                ).splice(index, 1)
              "
              >
移除
</Button>
</Space>
          <Space v-if="tab === 'subscription-settings'" wrap>
<FormItem label="每月扣款日（空为授权日）">
<InputNumber
                v-model:value="item.billingDay"
                :min="1"
                :max="28"
/>
</FormItem><FormItem label="提前通知天数">
<InputNumber
                v-model:value="item.renewalNoticeDays"
                :min="0"
                :max="30"
/>
</FormItem><FormItem label="宽限天数">
<InputNumber
                v-model:value="item.graceDays"
                :min="0"
                :max="30"
/>
</FormItem>
</Space>
        </div>
        <Button class="mb-4" @click="addSetting">增加卡种配置</Button>
      </template>
      <FormItem>
<Button type="primary" :loading="busy" @click="saveSettings">
保存设置
</Button>
</FormItem>
    </Form>
  </Page>
  <ResourcePage
    v-else
    :key="resource"
    :title="config.title"
    :endpoint="resource"
    :fields="[]"
    :columns="columns"
    :create="false"
    :edit="false"
    store-filter
    time-filter
  >
    <template #filters="{ filters, search }">
<Select
        v-if="resource === 'reports/performance'"
        v-model:value="filters.groupBy"
        :options="[
          { label: '按门店', value: 'store' },
          { label: '按员工', value: 'employee' },
        ]"
        placeholder="按门店"
        style="min-width: 120px"
        @change="search"
    />
</template>
    <template #summary="{ data }">
<Alert
        v-if="resource === 'reports/performance' && data.summary"
        class="mb-4"
        type="info"
        :message="`期间净实收 ${data.summary.netAmount} 元，收款订单 ${data.summary.orderCount} 笔。按支付与退款实际发生时间统计。`"
    />
</template>
    <template #actions="{ row }">
<Button
        v-if="['self-service-card-orders', 'subscriptions'].includes(resource)"
        type="link"
        @click="details(row)"
        >
详情
</Button>
</template>
  </ResourcePage>
  <Modal v-model:open="visible" title="记录详情" :footer="null" :width="900">
    <template v-if="current">
      <Descriptions :column="2" bordered>
<DescriptionsItem
          v-for="column in columns"
          :key="column.dataIndex"
          :label="column.title"
          >
{{ current[column.dataIndex] ?? '—' }}
</DescriptionsItem>
</Descriptions>
      <template v-if="resource === 'self-service-card-orders'">
<Table
          :data-source="current.items"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '商品', dataIndex: 'productNameSnapshot' },
            { title: '数量', dataIndex: 'quantity' },
            { title: '单价', dataIndex: 'unitPrice' },
            { title: '应付', dataIndex: 'payableAmount' },
          ]"
/><Table
          :data-source="current.payments"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '支付金额', dataIndex: 'amount' },
            { title: '状态', dataIndex: 'status' },
            { title: '支付时间', dataIndex: 'paidAt' },
          ]"
/><Table
          :data-source="current.refunds"
          row-key="id"
          :pagination="false"
          :columns="[
            { title: '退款金额', dataIndex: 'amount' },
            { title: '状态', dataIndex: 'status' },
            { title: '退款时间', dataIndex: 'refundedAt' },
          ]"
      />
</template>
      <Table
        v-else
        :data-source="cycles"
        row-key="id"
        :columns="[
          { title: '周期开始', dataIndex: 'periodStart' },
          { title: '周期结束', dataIndex: 'periodEnd' },
          { title: '应付', dataIndex: 'amount' },
          { title: '结果', dataIndex: 'status' },
          { title: '扣款时间', dataIndex: 'chargedAt' },
        ]"
      />
    </template>
  </Modal>
</template>
