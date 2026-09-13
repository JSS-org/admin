<script setup lang="ts">
import { Button } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { config, initial, prepare } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="config.title"
      endpoint="point-products"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="true"
      :prepare="prepare"
      :initial="initial"
      :idempotent="false"
      :store-filter="false"
      time-filter
    >
      <template v-if="canGym('points:manage')" #actions="{ row, reload }">
        <Button
          v-if="canGym('points:manage')"
          type="link"
          @click="
            async () => {
              await gymApi.patch(`point-products/${row.id}`, {
                status: row.status === 'active' ? 'inactive' : 'active',
              });
              await reload();
            }
          "
          >{{ row.status === 'active' ? '停用' : '启用' }}</Button
        >
      </template>
    </ResourcePage>
  </div>
</template>
