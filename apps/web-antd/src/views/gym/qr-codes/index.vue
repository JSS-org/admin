<script setup lang="ts">
import { openGymFile } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { config, initial, prepare } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="config.title"
      endpoint="qr-codes"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="false"
      :initial="initial"
      :prepare="prepare"
      store-filter
      time-filter
    >
      <template #actions="{ row }">
        <TableAction action="preview" v-if="row.providerCodeFileId" @click="openGymFile(row.providerCodeFileId)" />
      </template>
    </ResourcePage>
  </div>
</template>
