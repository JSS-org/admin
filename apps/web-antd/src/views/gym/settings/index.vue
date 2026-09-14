<script setup lang="ts">
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

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
  Switch,
  Tag,
  TimePicker,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import Page from '#/views/gym/components/admin-page.vue';

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
const enabledCount = computed(() => entries.value.filter((item) => item.enabled).length);
function saleWindow(item: Record<string, any>): [string, string] | undefined {
  return item.startsAt && item.endsAt
    ? [dayjs(item.startsAt).format('YYYY-MM-DDTHH:mm:ss'), dayjs(item.endsAt).format('YYYY-MM-DDTHH:mm:ss')]
    : undefined;
}
function setWindow(item: Record<string, any>, values: any) {
  item.startsAt = values?.[0];
  item.endsAt = values?.[1];
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
      </div>
      <Alert v-if="dirty" type="info" show-icon message="有未保存的更改，保存或还原后可切换门店及配置类型。" />
      <Alert v-if="error" type="error" show-icon message="设置加载失败，当前无法保存"
        ><template #action><Button @click="loadSettings">重新加载</Button></template></Alert
      >
      <Skeleton v-else-if="loading" active :paragraph="{ rows: 8 }" />
      <Empty v-else-if="!storeId" description="暂无可配置的门店" />
      <template v-else>
        <Form class="sales-config" layout="vertical" :disabled="busy">
          <Card class="settings-intro" :bordered="false">
            <template #title
              ><span class="flex items-center gap-2"
                ><IconifyIcon
                  :icon="tab === 'verification-settings' ? 'lucide:scan-line' : 'lucide:credit-card'"
                  class="size-5 text-primary"
                />{{
                  tab === 'online-sales-settings'
                    ? '在线售卡'
                    : tab === 'subscription-settings'
                      ? '连续包月方案'
                      : '自助核销'
                }}</span
              ></template
            >
            <template #extra
              ><Switch
                v-if="tab !== 'subscription-settings'"
                v-model:checked="settings.enabled"
                checked-children="已启用"
                un-checked-children="已关闭"
                aria-label="功能启用状态"
              /><Tag v-else color="blue">已启用 {{ enabledCount }} 个方案</Tag></template
            >
            <p class="text-muted-foreground">
              {{
                tab === 'online-sales-settings'
                  ? '选择本店可售卡种，设置价格与上架时间；关闭功能时保留已配置方案。'
                  : tab === 'subscription-settings'
                    ? '仅支持已发布的 28～31 天期限卡。每个方案独立设置扣款日、通知与宽限规则。'
                    : '设置会员自助核销的渠道、每日开放时段及入场要求。'
              }}
            </p>
            <FormItem v-if="tab === 'online-sales-settings'" label="合同签署" class="mt-4"
              ><Switch
                v-model:checked="settings.contractRequired"
                checked-children="购卡须签约"
                un-checked-children="无需签约"
            /></FormItem>
          </Card>
          <template v-if="tab === 'verification-settings'">
            <Card title="核销条件" class="mt-5">
              <FormItem label="入场要求"
                ><Switch
                  v-model:checked="settings.requireCheckin"
                  checked-children="核销前须签到"
                  un-checked-children="无需签到"
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
            <Card v-for="(item, index) in entries" :key="index" class="mt-5" :title="`方案 ${index + 1}`">
              <template #extra
                ><div class="flex items-center gap-3">
                  <Switch v-model:checked="item.enabled" :aria-label="`方案 ${index + 1} 启用状态`" /><Button
                    danger
                    type="text"
                    @click="entries.splice(index, 1)"
                    >移除方案</Button
                  >
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
                    @change="(values) => setWindow(item, values)"
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
                    @change="(event) => (item.billingDay = event.target.value === 'fixed' ? 1 : null)"
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
            <Button block type="dashed" class="mt-5" :disabled="busy || cardOptions.length === 0" @click="addSetting"
              >添加{{ tab === 'online-sales-settings' ? '售卡' : '包月' }}方案</Button
            >
            <p v-if="cardOptions.length === 0" class="mt-3 text-sm text-muted-foreground">
              暂无适用卡种，请先在会员卡模板中创建并发布{{ tab === 'subscription-settings' ? '月卡' : '卡种' }}。
            </p>
          </template>
        </Form>
        <div class="gym-save-bar">
          <span>{{ dirty ? '更改尚未保存' : '当前配置已同步' }}</span>
          <div class="flex gap-3">
            <Button :disabled="busy || !dirty" @click="restore">还原更改</Button
            ><Button type="primary" :loading="saving" :disabled="loading || !dirty" @click="saveSettings"
              >保存设置</Button
            >
          </div>
        </div>
      </template>
    </Page>
  </div>
</template>
<style scoped>
.settings-scope {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
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
  gap: 20px;
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
  gap: 16px;
}
</style>
