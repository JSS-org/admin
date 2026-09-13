<script setup lang="ts">
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  Space,
  TabPane,
  Tabs,
} from 'ant-design-vue';

import Page from '#/views/gym/components/admin-page.vue';
import FilterBar from '#/views/gym/components/filter-bar.vue';

import { usePage } from './use-page';

const { stores, storeId, tab, settings, busy, loadSettings, cardOptions, addSetting, saveSettings, scopeFilter } =
  usePage();
</script>
<template>
  <div class="gym-view">
    <Page title="在线售卡与核销设置">
      <Alert type="info" message="当前为Mock配置，不会向支付渠道发起扣款。" class="mb-4" />
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
        @search="loadSettings"
      />
      <Tabs v-model:active-key="tab" @change="loadSettings">
        <TabPane key="online-sales-settings" tab="在线售卡" />
        <TabPane key="subscription-settings" tab="连续包月" />
        <TabPane key="verification-settings" tab="自助核销" />
      </Tabs>
      <Form v-if="storeId" layout="vertical">
        <FormItem v-if="tab !== 'subscription-settings'" label="功能开关">
          <Checkbox v-model:checked="settings.enabled">启用</Checkbox>
        </FormItem>
        <FormItem v-if="tab === 'online-sales-settings'" label="合同">
          <Checkbox v-model:checked="settings.contractRequired"> 要求签署合同 </Checkbox>
        </FormItem>
        <template v-if="tab === 'verification-settings'">
          <FormItem label="入场要求">
            <Checkbox v-model:checked="settings.requireCheckin"> 核销前须签到 </Checkbox>
          </FormItem>
          <FormItem label="支持渠道">
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
          </FormItem>
          <Space>
            <FormItem label="允许开始时间">
              <Input v-model:value="settings.allowedStart" type="time" />
            </FormItem>
            <FormItem label="允许结束时间">
              <Input v-model:value="settings.allowedEnd" type="time" />
            </FormItem>
          </Space>
        </template>
        <template v-else>
          <div
            v-for="(item, index) in tab === 'online-sales-settings' ? settings.offers : settings.items"
            :key="index"
            class="mb-4"
          >
            <Space wrap>
              <FormItem label="卡种">
                <Select v-model:value="item.cardTemplateId" :options="cardOptions" style="min-width: 220px" />
              </FormItem>
              <FormItem label="售价（元）">
                <Input v-if="tab === 'online-sales-settings'" v-model:value="item.salePrice" />
                <Input v-else v-model:value="item.price" />
              </FormItem>
              <Checkbox v-model:checked="item.enabled">启用</Checkbox>
              <Button
                danger
                @click="(tab === 'online-sales-settings' ? settings.offers : settings.items).splice(index, 1)"
              >
                移除
              </Button>
            </Space>
            <Space v-if="tab === 'subscription-settings'" wrap>
              <FormItem label="每月扣款日（空为授权日）">
                <InputNumber v-model:value="item.billingDay" :min="1" :max="28" />
              </FormItem>
              <FormItem label="提前通知天数">
                <InputNumber v-model:value="item.renewalNoticeDays" :min="0" :max="30" />
              </FormItem>
              <FormItem label="宽限天数">
                <InputNumber v-model:value="item.graceDays" :min="0" :max="30" />
              </FormItem>
            </Space>
          </div>
          <Button class="mb-4" @click="addSetting">增加卡种配置</Button>
        </template>
        <FormItem>
          <Button type="primary" :loading="busy" @click="saveSettings"> 保存设置 </Button>
        </FormItem>
      </Form>
    </Page>
  </div>
</template>
