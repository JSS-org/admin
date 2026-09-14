<script setup lang="ts">
import { TabPane, Tabs } from 'ant-design-vue';

import { canGym } from '#/api/gym';
import Page from '#/views/gym/components/admin-page.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import QuotaBatches from '#/views/gym/coupon-quota-batches/index.vue';
import QuotaLedger from '#/views/gym/coupon-quota-ledger/index.vue';

import { config } from './data';
</script>
<template>
  <div class="gym-view">
    <Page title="优惠券额度管理" description="在同一处查看门店额度、批量分配和变动记录。">
      <Tabs destroy-inactive-tab-pane>
        <TabPane key="quotas" tab="门店额度">
          <ResourcePage
            :title="config.title"
            endpoint="coupon-store-quotas"
            :fields="config.fields"
            :columns="config.columns"
            :create="false"
            :edit="false"
            :idempotent="false"
            :store-filter="true"
            time-filter
          />
        </TabPane>
        <TabPane v-if="canGym('coupons:allocate')" key="batches" tab="批量维护"><QuotaBatches /></TabPane>
        <TabPane key="ledger" tab="额度流水"><QuotaLedger /></TabPane>
      </Tabs>
    </Page>
  </div>
</template>
