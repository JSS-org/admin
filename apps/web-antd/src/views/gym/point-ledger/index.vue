<script setup lang="ts">
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { config } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="config.title"
      endpoint="point-ledger"
      :fields="config.fields"
      :columns="config.columns"
      :create="false"
      :edit="false"
      :idempotent="false"
      :store-filter="true"
      time-filter
    />
  </div>
</template>
