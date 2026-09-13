<script setup lang="ts">
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="会员汇总"
      endpoint="reports/members"
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
