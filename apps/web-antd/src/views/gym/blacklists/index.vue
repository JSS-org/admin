<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { Button } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { code, columns, fields, title } from './data';

function prepare(values: Record<string, any>) {
  const result = { ...values };
  for (const key of ['startsAt', 'endsAt']) if (result[key]) result[key] = new Date(result[key]).toISOString();
  return result;
}

function initial(row: GymRow) {
  const result = { ...row };
  for (const key of ['startsAt', 'endsAt'])
    if (result[key]) {
      const time = new Date(result[key]);
      result[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    }
  return result;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="title"
      endpoint="blacklists"
      :fields="fields"
      :columns="columns"
      :write-code="code"
      :store-filter="false"
      :prepare="prepare"
      :initial="initial"
      :editable="(row) => !row.revokedAt"
    >
      <template #actions="{ row, reload }">
        <Button
          v-if="!row.revokedAt && canGym(code)"
          type="link"
          @click="
            async () => {
              await gymApi.patch(`blacklists/${row.id}`, { revoked: true });
              await reload();
            }
          "
        >
          撤销限制
        </Button>
      </template>
    </ResourcePage>
  </div>
</template>
