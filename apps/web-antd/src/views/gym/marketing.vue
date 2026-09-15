<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import { computed, ref } from 'vue';

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
  Table,
} from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';

import ResourcePage from './components/resource-page.vue';

const props = defineProps<{ resource: string }>();
const f = (
  key: string,
  label: string,
  type: Field['type'] = 'text',
  extra: Partial<Field> = {},
): Field => ({ key, label, type, ...extra });
const source = (
  key: string,
  label: string,
  source: string,
  required = false,
): Field => f(key, label, 'select', { source, required });
const choices = (
  key: string,
  label: string,
  values: string[][],
  value?: string,
): Field =>
  f(key, label, 'select', {
    options: values.map(([label = '', value = '']) => ({ label, value })),
    default: value,
    required: true,
  });
const configs: Record<
  string,
  {
    title: string;
    code?: string;
    fields: Field[];
    columns: string[][];
    editable?: boolean;
  }
> = {
  'coupon-templates': {
    title: '优惠券模板',
    code: 'coupons:manage',
    fields: [
      f('name', '名称', 'text', { required: true }),
      choices(
        'kind',
        '优惠方式',
        [
          ['满减', 'amount'],
          ['折扣', 'rate'],
        ],
        'amount',
      ),
      f('discountAmount', '满减金额（元）'),
      f('discountRate', '折扣比例（如0.8为八折）'),
      f('minimumSpend', '最低消费（元）', 'money', {
        default: '0.00',
        required: true,
      }),
      f('startsAt', '开始时间', 'datetime', { required: true }),
      f('expiresAt', '过期时间', 'datetime', { required: true }),
      f('totalLimit', '总发行张数上限（空为不限）', 'number'),
      f('perMemberLimit', '每人最多领取张数', 'number', {
        default: 1,
        required: true,
      }),
      choices(
        'scope',
        '适用门店',
        [
          ['全部门店', 'all'],
          ['指定门店', 'selected'],
        ],
        'all',
      ),
      f('storeIds', '指定门店', 'multi', { source: 'stores' }),
    ],
    columns: [
      ['名称', 'name'],
      ['类型', 'kind'],
      ['开始', 'startsAt'],
      ['到期', 'expiresAt'],
      ['总限额', 'totalLimit'],
      ['已分配', 'allocatedCount'],
      ['已发放', 'issuedCount'],
      ['状态', 'status'],
    ],
  },
  'coupon-store-quotas': {
    title: '门店优惠券额度',
    fields: [],
    columns: [
      ['门店', 'storeName'],
      ['券模板', 'templateName'],
      ['分配张数', 'allocatedCount'],
      ['预占张数', 'reservedCount'],
      ['已发张数', 'issuedCount'],
      ['可发张数', 'availableCount'],
    ],
  },
  'coupon-quota-batches': {
    title: '一键维护：批量分配门店额度',
    fields: [],
    columns: [
      ['批次', 'id'],
      ['目标店数', 'targetCount'],
      ['每店张数', 'quantityPerStore'],
      ['总张数', 'totalQuantity'],
      ['成功门店', 'successCount'],
      ['状态', 'status'],
      ['完成时间', 'completedAt'],
    ],
  },
  'coupon-quota-ledger': {
    title: '券额度流水',
    fields: [],
    columns: [
      ['门店', 'storeName'],
      ['动作', 'action'],
      ['分配变化', 'allocatedDelta'],
      ['预占变化', 'reservedDelta'],
      ['已发变化', 'issuedDelta'],
      ['时间', 'occurredAt'],
    ],
  },
  'coupon-batches': {
    title: '批量发券',
    fields: [],
    columns: [
      ['批次', 'id'],
      ['人数', 'recipientCount'],
      ['成功', 'successCount'],
      ['失败', 'failureCount'],
      ['状态', 'status'],
      ['时间', 'createdAt'],
    ],
  },
  'member-coupons': {
    title: '会员优惠券',
    fields: [],
    columns: [
      ['会员', 'memberName'],
      ['发行门店', 'storeName'],
      ['优惠券', 'templateName'],
      ['券号', 'couponNo'],
      ['状态', 'status'],
      ['到期', 'expiresAt'],
    ],
  },
  'gift-code-batches': {
    title: '礼品码生成',
    code: 'gifts:manage',
    editable: false,
    fields: [
      f('name', '批次名称', 'text', { required: true }),
      choices(
        'rewardType',
        '礼品类型',
        [
          ['会员卡', 'card'],
          ['课程', 'course'],
          ['积分', 'points'],
        ],
        'card',
      ),
      source('cardTemplateId', '会员卡', 'card-templates'),
      source('courseProductId', '课程', 'course-products'),
      f('pointAmount', '积分数', 'number'),
      f('count', '生成数量', 'number', { required: true, default: 10 }),
      f('expiresAt', '过期时间', 'datetime', { required: true }),
    ],
    columns: [
      ['名称', 'name'],
      ['类型', 'rewardType'],
      ['数量', 'count'],
      ['到期', 'expiresAt'],
    ],
  },
  'message-batches': {
    title: '私信与批量通知',
    fields: [],
    columns: [
      ['标题', 'title'],
      ['类型', 'kind'],
      ['渠道', 'channel'],
      ['内容', 'content'],
      ['人数', 'recipientCount'],
      ['状态', 'status'],
      ['时间', 'createdAt'],
    ],
  },
  'point-rules': {
    title: '积分规则',
    code: 'points:manage',
    fields: [
      f('name', '名称', 'text', { required: true }),
      choices(
        'eventType',
        '事件',
        [
          ['运动打卡', 'checkin'],
          ['消费', 'consumption'],
          ['邀请', 'invitation'],
        ],
        'checkin',
      ),
      f('thresholdAmount', '每消费多少元奖励一次', 'money'),
      f('points', '每次积分', 'number', { required: true, default: 10 }),
      f('dailyLimit', '每天上限（空为不限）', 'number'),
      f('effectiveFrom', '生效时间', 'datetime', { required: true }),
      f('effectiveTo', '结束时间', 'datetime'),
    ],
    columns: [
      ['名称', 'name'],
      ['事件', 'eventType'],
      ['积分', 'points'],
      ['每日上限', 'dailyLimit'],
      ['版本', 'version'],
      ['状态', 'status'],
    ],
  },
  'point-products': {
    title: '积分兑换商品',
    code: 'points:manage',
    fields: [
      f('name', '名称', 'text', { required: true }),
      choices(
        'kind',
        '商品类型',
        [
          ['会员卡', 'card'],
          ['课程', 'course'],
          ['周边', 'merchandise'],
        ],
        'card',
      ),
      source('cardTemplateId', '卡种', 'card-templates'),
      source('courseProductId', '课程', 'course-products'),
      f('pointsPrice', '兑换所需积分', 'number', { required: true }),
      f('stock', '库存（空为不限）', 'number'),
    ],
    columns: [
      ['名称', 'name'],
      ['类型', 'kind'],
      ['兑换积分', 'pointsPrice'],
      ['库存', 'stock'],
      ['状态', 'status'],
    ],
  },
  'point-ledger': {
    title: '积分流水',
    fields: [],
    columns: [
      ['会员', 'memberName'],
      ['门店', 'storeName'],
      ['事件', 'eventType'],
      ['变动积分', 'delta'],
      ['变动后余额', 'balanceAfter'],
      ['时间', 'occurredAt'],
    ],
  },
  'point-redemptions': {
    title: '积分兑换记录',
    fields: [],
    columns: [
      ['会员', 'memberName'],
      ['门店', 'storeName'],
      ['数量', 'quantity'],
      ['消耗积分', 'pointsSpent'],
      ['状态', 'status'],
      ['时间', 'createdAt'],
    ],
  },
};
const config = computed(() => {
  const value = configs[props.resource];
  if (!value) throw new Error('未知营销页面');
  if (props.resource === 'point-products')
    return {
      ...value,
      fields: value.fields.map((field) => ({
        ...field,
        immutable: ['cardTemplateId', 'courseProductId', 'kind'].includes(
          field.key,
        ),
      })),
    };
  return value;
});
function prepare(values: Record<string, any>) {
  const data = { ...values };
  for (const key of ['startsAt', 'expiresAt', 'effectiveFrom', 'effectiveTo'])
    if (data[key]) data[key] = new Date(data[key]).toISOString();
  if (
    props.resource === 'gift-code-batches' ||
    props.resource === 'point-products'
  ) {
    const kind = data.rewardType ?? data.kind;
    for (const key of ['cardTemplateId', 'courseProductId', 'pointAmount'])
      if (
        key !==
        (
          {
            card: 'cardTemplateId',
            course: 'courseProductId',
            points: 'pointAmount',
          } as Record<string, string>
        )[kind]
      )
        Reflect.deleteProperty(data, key);
  }
  if (props.resource === 'coupon-templates') {
    if (data.kind === 'amount') Reflect.deleteProperty(data, 'discountRate');
    else Reflect.deleteProperty(data, 'discountAmount');
    if (data.scope === 'all') data.storeIds = [];
  }
  if (props.resource === 'point-rules' && data.eventType !== 'consumption')
    Reflect.deleteProperty(data, 'thresholdAmount');
  return data;
}
function initial(row: GymRow) {
  const data = { ...row };
  for (const key of ['startsAt', 'expiresAt', 'effectiveFrom', 'effectiveTo'])
    if (data[key]) {
      const time = new Date(data[key]);
      data[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
    }
  return data;
}
function editable(row: GymRow) {
  if (props.resource === 'coupon-templates') return row.allocatedCount === 0;
  if (props.resource === 'point-rules') return row.status === 'draft';
  return config.value.editable !== false;
}
const page = ref();
const visible = ref(false);
const mode = ref('');
const busy = ref(false);
const current = ref<GymRow>();
const items = ref<GymRow[]>([]);
const codes = ref<string[]>([]);
const stores = ref<GymRow[]>([]);
const templates = ref<GymRow[]>([]);
const members = ref<GymRow[]>([]);
const templateId = ref<string>();
const targetMode = ref('allEligible');
const storeIds = ref<string[]>([]);
const quantity = ref(100);
const targets = ref<{ storeId?: string; memberIds: string[] }[]>([]);
const messageKind = ref('bulk');
const channel = ref('miniapp');
const subject = ref('');
const content = ref('');
let requestKey = '';
async function all(path: string) {
  let records: GymRow[] = [];
  for (let n = 1; ; n++) {
    const data = await gymApi.list(path, { page: n, pageSize: 100 });
    records = [...records, ...data.items];
    if (records.length >= data.total || data.items.length === 0) return records;
  }
}
async function start() {
  mode.value = 'create';
  current.value = undefined;
  items.value = [];
  templateId.value = undefined;
  storeIds.value = [];
  targets.value = [{ memberIds: [] }];
  requestKey = crypto.randomUUID();
  subject.value = '';
  content.value = '';
  stores.value = await all('stores');
  if (props.resource !== 'message-batches')
    templates.value = await all('coupon-templates');
  if (props.resource !== 'coupon-quota-batches')
    members.value = await all('members');
  visible.value = true;
}
async function details(row: GymRow) {
  current.value = await gymApi.get(`${props.resource}/${row.id}`);
  if (props.resource === 'coupon-quota-batches') {
    const data = await gymApi.list(`${props.resource}/${row.id}/items`, {
      pageSize: 100,
    });
    items.value = data.items;
  } else items.value = current.value?.recipients ?? current.value?.codes ?? [];
  mode.value = 'detail';
  visible.value = true;
}
function saved(row: GymRow) {
  if (row.plainCodes) {
    codes.value = row.plainCodes;
    mode.value = 'codes';
    visible.value = true;
  }
}
function downloadCodes() {
  const url = URL.createObjectURL(
    new Blob([codes.value.join('\n')], { type: 'text/plain;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gift-codes.txt';
  link.click();
  URL.revokeObjectURL(url);
}
async function submit() {
  busy.value = true;
  try {
    let data: Record<string, any> = {};
    if (props.resource === 'coupon-quota-batches')
      data = {
        templateId: templateId.value,
        targetMode: targetMode.value,
        quantityPerStore: quantity.value,
        ...(targetMode.value === 'selected'
          ? { storeIds: storeIds.value }
          : {}),
      };
    else if (props.resource === 'coupon-batches')
      data = {
        templateId: templateId.value,
        targets: targets.value.flatMap((t) =>
          t.memberIds.map((memberId) => ({ memberId, storeId: t.storeId })),
        ),
      };
    else {
      const target = targets.value[0];
      data = {
        kind: messageKind.value,
        channel: channel.value,
        title: subject.value,
        content: content.value,
        storeId: target?.storeId,
        memberIds: target?.memberIds ?? [],
      };
    }
    const result = await gymApi.post(props.resource, data, requestKey);
    await page.value?.load();
    await details(result);
    message.success('批次已创建，请查看逐项结果');
  } finally {
    busy.value = false;
  }
}
const canCreateBatch = computed(
  () =>
    ({
      'coupon-quota-batches': 'coupons:allocate',
      'coupon-batches': 'coupons:issue',
      'message-batches': 'messages:send',
    })[props.resource],
);
async function newVersion(row: GymRow) {
  const next = await gymApi.post(`point-rules/${row.id}/versions`, {});
  await page.value?.load();
  await page.value?.open(next);
}
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
      :create="!!config.code"
      :edit="config.editable !== false"
      :editable="editable"
      :prepare="prepare"
      :initial="initial"
      :idempotent="resource === 'gift-code-batches'"
      :store-filter="
        [
          'coupon-store-quotas',
          'coupon-quota-ledger',
          'member-coupons',
          'message-batches',
          'coupon-batches',
          'point-ledger',
          'point-redemptions',
        ].includes(resource)
      "
      time-filter
      @saved="saved"
    >
      <template v-if="canCreateBatch && canGym(canCreateBatch)" #toolbar>
        <Button
          v-if="canCreateBatch && canGym(canCreateBatch)"
          type="primary"
          @click="start"
        >
          {{
            resource === 'coupon-quota-batches'
              ? '批量分配门店额度'
              : '创建批次'
          }}
        </Button>
      </template>
      <template
        v-if="
          resource.endsWith('batches') || (config.code && canGym(config.code))
        "
        #actions="{ row, reload }"
      >
        <Button
          v-if="resource.endsWith('batches')"
          type="link"
          @click="details(row)"
        >
          逐项结果 </Button
        ><Button
          v-if="resource === 'point-rules' && canGym('points:manage')"
          type="link"
          @click="newVersion(row)"
        >
          新版本 </Button
        ><Button
          v-if="
            ['point-rules', 'point-products', 'coupon-templates'].includes(
              resource,
            ) &&
            config.code &&
            canGym(config.code)
          "
          type="link"
          @click="
            async () => {
              await gymApi.patch(`${resource}/${row.id}`, {
                status: row.status === 'active' ? 'inactive' : 'active',
              });
              await reload();
            }
          "
        >
          {{ row.status === 'active' ? '停用' : '启用' }}
        </Button>
      </template>
    </ResourcePage>
    <Modal
      wrap-class-name="gym-dialog"
      v-model:open="visible"
      :title="
        mode === 'create'
          ? '批量操作'
          : mode === 'codes'
            ? '礼品码（仅本次显示）'
            : '批次结果'
      "
      :width="900"
      :footer="mode === 'create' ? undefined : null"
      :confirm-loading="busy"
      @ok="submit"
    >
      <template v-if="mode === 'codes'">
        <Alert
          type="warning"
          message="请现在下载或保存，关闭后仅可查询掩码，无法再次读取完整礼品码。"
        /><Input.TextArea
          :value="codes.join('\n')"
          :rows="12"
          readonly
          class="my-3"
        /><Button @click="downloadCodes">下载礼品码</Button>
      </template>
      <Form v-else-if="mode === 'create'" layout="vertical">
        <FormItem v-if="resource !== 'message-batches'" label="优惠券模板">
          <Select
            v-model:value="templateId"
            :options="templates.map((t) => ({ label: t.name, value: t.id }))"
          />
        </FormItem>
        <template v-if="resource === 'coupon-quota-batches'">
          <FormItem label="分配范围">
            <Select
              v-model:value="targetMode"
              :options="[
                { label: '所有启用且适用的门店', value: 'allEligible' },
                { label: '指定门店', value: 'selected' },
              ]"
            /> </FormItem
          ><FormItem v-if="targetMode === 'selected'" label="目标门店">
            <Select
              v-model:value="storeIds"
              mode="multiple"
              :options="stores.map((s) => ({ label: s.name, value: s.id }))"
            /> </FormItem
          ><FormItem label="每店追加可发张数">
            <InputNumber
              v-model:value="quantity"
              :min="1"
              :max="1000000"
            /> </FormItem
          ><Alert
            type="info"
            message="本操作只分配门店发券额度；实际发给会员时才消耗额度。"
          />
        </template>
        <template v-else>
          <div v-for="(target, index) in targets" :key="index">
            <FormItem label="发行 / 发送门店">
              <Select
                v-model:value="target.storeId"
                :options="stores.map((s) => ({ label: s.name, value: s.id }))"
                @change="target.memberIds = []"
              /> </FormItem
            ><FormItem label="本店会员">
              <Select
                v-model:value="target.memberIds"
                mode="multiple"
                show-search
                option-filter-prop="label"
                :options="
                  members
                    .filter((m) => m.storeIds?.includes(target.storeId))
                    .map((m) => ({
                      label: `${m.name} ${m.phone}`,
                      value: m.id,
                    }))
                "
              /> </FormItem
            ><Button
              v-if="targets.length > 1"
              @click="targets.splice(index, 1)"
            >
              移除此门店
            </Button>
          </div>
          <Button
            v-if="resource === 'coupon-batches'"
            @click="targets.push({ memberIds: [] })"
          >
            增加发行门店
          </Button>
        </template>
        <template v-if="resource === 'message-batches'">
          <FormItem label="消息类型">
            <Select
              v-model:value="messageKind"
              :options="[
                { label: '私信（一位会员）', value: 'private' },
                { label: '批量通知', value: 'bulk' },
              ]"
            /> </FormItem
          ><FormItem label="发送渠道">
            <Select
              v-model:value="channel"
              :options="[
                { label: '小程序', value: 'miniapp' },
                { label: 'App', value: 'app' },
                { label: '短信', value: 'sms' },
              ]"
            /> </FormItem
          ><FormItem label="标题"><Input v-model:value="subject" /></FormItem
          ><FormItem label="内容">
            <Input.TextArea v-model:value="content" :rows="4" /> </FormItem
          ><Alert
            type="info"
            message="未配置真实渠道的消息会记录发送失败，不会发送到会员。"
          />
        </template>
      </Form>
      <template v-else>
        <Alert
          type="info"
          :message="`批次状态：${current?.status ?? '—'}`"
          class="mb-3"
        /><Table
          :data-source="items"
          row-key="id"
          :columns="[
            { title: '门店', dataIndex: 'storeName' },
            { title: '会员', dataIndex: 'memberName' },
            { title: '数量', dataIndex: 'quantity' },
            { title: '礼品码掩码', dataIndex: 'codeMasked' },
            { title: '结果', dataIndex: 'status' },
            { title: '失败原因', dataIndex: 'failureReason' },
            { title: '阅读结果', dataIndex: 'readStatus' },
          ]"
        />
      </template>
    </Modal>
  </div>
</template>
