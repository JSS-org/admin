<script setup lang="ts">
import { Button } from 'ant-design-vue';

import { openGymFile } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

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
        <Button v-if="row.providerCodeFileId" type="link" @click="openGymFile(row.providerCodeFileId)"> 查看码 </Button>
      </template>
    </ResourcePage>
  </div>
</template>
