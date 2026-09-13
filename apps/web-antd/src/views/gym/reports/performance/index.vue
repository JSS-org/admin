<script setup lang="ts">
import { Alert } from 'ant-design-vue';

import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="门店与员工业绩"
      endpoint="reports/performance"
      :fields="[]"
      :columns="columns"
      :create="false"
      :edit="false"
      store-filter
      time-filter
      :keyword-filter="false"
      :filter-fields="
        'reports/performance' === 'reports/performance'
          ? [
              {
                key: 'groupBy',
                label: '汇总方式',
                type: 'select',
                placeholder: '按门店',
                options: [
                  { label: '按门店', value: 'store' },
                  { label: '按员工', value: 'employee' },
                ],
              },
            ]
          : []
      "
    >
      <template #summary="{ data }">
        <Alert
          v-if="'reports/performance' === 'reports/performance' && data.summary"
          class="mb-4"
          type="info"
          :message="`期间净实收 ${data.summary.netAmount} 元，收款订单 ${data.summary.orderCount} 笔。按支付与退款实际发生时间统计。`"
        />
      </template>
    </ResourcePage>
  </div>
</template>
