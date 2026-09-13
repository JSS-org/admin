<script setup lang="ts">
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="自助核销记录"
      endpoint="verifications"
      :fields="[]"
      :columns="columns"
      :create="false"
      :edit="false"
      store-filter
      time-filter
      :keyword-filter="true"
    />
  </div>
</template>
