<script setup lang="ts">
import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { config, editable, initial } from './data';

function prepare(values: Record<string, any>) {
  const data = { ...values };
  for (const key of ['startsAt', 'expiresAt', 'effectiveFrom', 'effectiveTo'])
    if (data[key]) data[key] = new Date(data[key]).toISOString();
  if (data.kind === 'amount') Reflect.deleteProperty(data, 'discountRate');
  else Reflect.deleteProperty(data, 'discountAmount');
  if (data.scope === 'all') data.storeIds = [];
  return data;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="config.title"
      endpoint="coupon-templates"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="true"
      :editable="editable"
      :prepare="prepare"
      :initial="initial"
      :idempotent="false"
      :store-filter="false"
      time-filter
    >
      <template v-if="canGym('coupons:manage')" #actions="{ row, reload }">
        <TableAction
          :action="row.status === 'active' ? 'disable' : 'enable'"
          v-if="canGym('coupons:manage')"
          @click="
            async () => {
              await gymApi.patch(`coupon-templates/${row.id}`, {
                status: row.status === 'active' ? 'inactive' : 'active',
              });
              await reload();
            }
          "
        />
      </template>
    </ResourcePage>
  </div>
</template>
