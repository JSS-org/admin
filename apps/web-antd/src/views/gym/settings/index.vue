<script setup lang="ts">
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  FormItem,
  InputNumber,
  Radio,
  Segmented,
  Select,
  Skeleton,
  TimePicker,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import Page from '#/views/gym/components/admin-page.vue';
import AdminSwitch from '#/views/gym/components/admin-switch.vue';
import ConfigActions from '#/views/gym/components/config-actions.vue';

import { usePage } from './use-page';
const {
  stores,
  storeId,
  tab,
  settings,
  busy,
  loading,
  saving,
  error,
  dirty,
  entries,
  restore,
  loadSettings,
  cardOptions,
  addSetting,
  saveSettings,
} = usePage();
const channels = [
  { label: '小程序', value: 'miniapp' },
  { label: 'App', value: 'app' },
  { label: '美团', value: 'meituan' },
  { label: '抖音', value: 'douyin' },
];
function saleWindow(item: Record<string, any>): [string, string] | undefined {
  return item.startsAt && item.endsAt
    ? [dayjs(item.startsAt).format('YYYY-MM-DDTHH:mm:ss'), dayjs(item.endsAt).format('YYYY-MM-DDTHH:mm:ss')]
    : undefined;
}
function setWindow(item: Record<string, any>, values: any) {
  item.startsAt = values?.[0];
  item.endsAt = values?.[1];
}
function setContractRequired(item: Record<string, any>, value: boolean) {
  item.contractRequired = value;
  if (!value) item.approvalRequired = false;
}
function setBillingDay(item: Record<string, any>, event: { target?: { value?: unknown } }) {
  item.billingDay = event.target?.value === 'fixed' ? 1 : null;
}
</script>
<template>
  <div class="gym-view">
    <Page title="售卡与核销设置" description="按门店配置售卖方案、连续包月规则和到店核销条件。">
      <div class="settings-scope">
        <div>
          <label for="sales-store">配置门店</label
          ><Select
            id="sales-store"
            v-model:value="storeId"
            :options="stores.map((store) => ({ label: store.name, value: store.id }))"
            show-search
            option-filter-prop="label"
            :disabled="busy || dirty"
            @change="loadSettings"
          />
        </div>
        <Segmented
          v-model:value="tab"
          :disabled="busy || dirty"
          :options="[
            { label: '在线售卡', value: 'online-sales-settings' },
            { label: '连续包月', value: 'subscription-settings' },
            { label: '自助核销', value: 'verification-settings' },
          ]"
          @change="loadSettings"
        />
        <ConfigActions
          :dirty="dirty"
          :busy="busy"
          :saving="saving"
          :error="error"
          pending-hint="有未保存的更改，保存或还原后可切换门店及配置类型。"
          @restore="restore"
          @save="saveSettings"
        />
      </div>
      <Alert v-if="error" type="error" show-icon message="设置加载失败，当前无法保存"
        ><template #action><Button @click="loadSettings">重新加载</Button></template></Alert
      >
      <Skeleton v-else-if="loading" active :paragraph="{ rows: 8 }" />
      <Empty v-else-if="!storeId" description="暂无可配置的门店" />
      <template v-else>
        <Form class="sales-config gym-stack" layout="vertical" :disabled="busy">
          <template v-if="tab === 'verification-settings'">
            <Card title="核销条件">
              <FormItem label="功能状态"
                ><AdminSwitch label="启用自助核销" v-model:checked="settings.enabled"
              /></FormItem>
              <FormItem label="入场要求"
                ><AdminSwitch label="核销前须签到" v-model:checked="settings.requireCheckin"
              /></FormItem>
              <FormItem label="支持渠道" :required="settings.enabled"
                ><Checkbox.Group v-model:value="settings.supportedChannels" :options="channels" class="channel-options"
              /></FormItem>
              <FormItem label="每日开放时段"
                ><Radio.Group
                  v-model:value="settings.timeMode"
                  option-type="button"
                  :options="[
                    { label: '全天开放', value: 'all' },
                    { label: '指定时段', value: 'limited' },
                  ]"
              /></FormItem>
              <div v-if="settings.timeMode === 'limited'" class="settings-grid">
                <FormItem label="开始时间" required
                  ><TimePicker v-model:value="settings.allowedStart" format="HH:mm" value-format="HH:mm"
                /></FormItem>
                <FormItem label="结束时间" required
                  ><TimePicker v-model:value="settings.allowedEnd" format="HH:mm" value-format="HH:mm"
                /></FormItem>
              </div>
            </Card>
          </template>
          <template v-else>
            <Empty v-if="entries.length === 0" class="my-8" description="尚未添加方案，从已发布的卡种开始配置。" />
            <Card v-for="(item, index) in entries" :key="index" :title="`方案 ${index + 1}`">
              <template #extra
                ><div class="flex flex-wrap items-center gap-3">
                  <AdminSwitch label="启用方案" v-model:checked="item.enabled" /><AdminSwitch
                    label="需要签约"
                    :checked="item.contractRequired"
                    @update:checked="setContractRequired(item, $event)"
                  /><AdminSwitch
                    v-if="item.contractRequired"
                    label="签约需要审批"
                    v-model:checked="item.approvalRequired"
                  /><Button danger type="text" @click="entries.splice(index, 1)">移除方案</Button>
                </div></template
              >
              <div class="settings-grid">
                <FormItem label="会员卡种" required
                  ><Select
                    v-model:value="item.cardTemplateId"
                    :options="
                      cardOptions.map((option) => ({
                        ...option,
                        disabled: entries.some((other) => other !== item && other.cardTemplateId === option.value),
                      }))
                    "
                    placeholder="选择本店已发布卡种"
                    show-search
                    option-filter-prop="label"
                /></FormItem>
                <FormItem :label="tab === 'online-sales-settings' ? '售卖价格（元）' : '每月价格（元）'" required>
                  <InputNumber
                    v-if="tab === 'online-sales-settings'"
                    v-model:value="item.salePrice"
                    :min="0"
                    :precision="2"
                    string-mode
                    addon-before="¥"
                  />
                  <InputNumber v-else v-model:value="item.price" :min="0" :precision="2" string-mode addon-before="¥" />
                </FormItem>
              </div>
              <template v-if="tab === 'online-sales-settings'">
                <FormItem label="售卖时间"
                  ><Radio.Group
                    v-model:value="item.timing"
                    option-type="button"
                    :options="[
                      { label: '长期售卖', value: 'always' },
                      { label: '指定时段', value: 'scheduled' },
                    ]"
                /></FormItem>
                <FormItem v-if="item.timing === 'scheduled'" label="上架时段" required
                  ><DatePicker.RangePicker
                    :value="saleWindow(item)"
                    show-time
                    value-format="YYYY-MM-DDTHH:mm:ss"
                    :placeholder="['开始售卖', '结束售卖']"
                    @change="setWindow(item, $event)"
                /></FormItem>
              </template>
              <template v-else>
                <FormItem label="每月扣款日"
                  ><Radio.Group
                    :value="item.billingDay ? 'fixed' : 'authorization'"
                    option-type="button"
                    :options="[
                      { label: '授权当日', value: 'authorization' },
                      { label: '固定日期', value: 'fixed' },
                    ]"
                    @change="setBillingDay(item, $event)"
                /></FormItem>
                <div class="settings-grid">
                  <FormItem v-if="item.billingDay" label="固定扣款日" required
                    ><InputNumber v-model:value="item.billingDay" :min="1" :max="28" :precision="0" addon-after="日"
                  /></FormItem>
                  <FormItem label="提前通知"
                    ><InputNumber
                      v-model:value="item.renewalNoticeDays"
                      :min="0"
                      :max="30"
                      :precision="0"
                      addon-after="天"
                  /></FormItem>
                  <FormItem label="扣款宽限期"
                    ><InputNumber v-model:value="item.graceDays" :min="0" :max="30" :precision="0" addon-after="天"
                  /></FormItem>
                </div>
              </template>
            </Card>
            <Button block type="dashed" :disabled="busy || cardOptions.length === 0" @click="addSetting"
              >添加{{ tab === 'online-sales-settings' ? '售卡' : '包月' }}方案</Button
            >
            <p v-if="cardOptions.length === 0" class="mt-3 text-sm text-muted-foreground">
              暂无适用卡种，请先在会员卡模板中创建并发布{{ tab === 'subscription-settings' ? '月卡' : '卡种' }}。
            </p>
          </template>
        </Form>
      </template>
    </Page>
  </div>
</template>
<style scoped>
.settings-scope {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gym-space-field);
  align-items: flex-end;
}

.settings-scope > div:first-child {
  min-width: 240px;
}

.settings-scope label {
  display: block;
  margin-bottom: 8px;
}

.settings-scope :deep(.ant-select) {
  width: 100%;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: var(--gym-space-field);
}

.settings-grid > :deep(.ant-form-item) {
  margin-bottom: 0;
}

.sales-config {
  max-width: none;
  padding: 0;
  border: 0;
}

.sales-config :deep(.ant-select),
.sales-config :deep(.ant-picker),
.sales-config :deep(.ant-input-number-group-wrapper),
.sales-config :deep(.ant-input-number) {
  width: 100%;
}

.channel-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gym-space-action);
}
</style>
