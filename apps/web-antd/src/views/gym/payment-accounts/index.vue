<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { Alert, Button } from 'ant-design-vue';

import { gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields } from './data';

async function bind(row: GymRow) {
  await gymApi.post(`payment-accounts/${row.id}/bindings`, {});
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
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="收款账户"
      endpoint="payment-accounts"
      write-code="settlement:manage"
      store-filter
      :prepare="accountBody"
      :fields="fields"
      :columns="columns"
    >
      <template #toolbar>
        <Alert message="仅保存脱敏账号与凭据引用；真实支付渠道未配置。" type="info" />
      </template>
      <template #actions="{ row }">
        <Button @click="bind(row)">渠道绑定</Button>
      </template>
    </ResourcePage>
  </div>
</template>
