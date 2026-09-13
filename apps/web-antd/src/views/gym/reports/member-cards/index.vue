<script setup lang="ts">
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="会员卡报表"
      endpoint="reports/member-cards"
      :fields="[]"
      :columns="columns"
      :create="false"
      :edit="false"
      store-filter
      time-filter
      :keyword-filter="false"
    />
  </div>
</template>
