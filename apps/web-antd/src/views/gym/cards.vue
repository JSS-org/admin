<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import { Button, message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';

import ResourcePage from './components/resource-page.vue';
const fields: Field[] = [
  { key: 'name', label: '卡种名称', required: true },
  {
    key: 'kind',
    label: '类型',
    type: 'select',
    required: true,
    default: 'period',
    options: [
      { label: '期限卡', value: 'period' },
      { label: '次卡', value: 'count' },
    ],
  },
  {
    key: 'durationDays',
    label: '有效天数（期限卡）',
    type: 'number',
    default: 30,
  },
  { key: 'includedUses', label: '次数（次卡）', type: 'number', default: 10 },
  { key: 'price', label: '售价（元）', required: true, default: '0.00' },
  { key: 'memberPrefix', label: '通卡会员前缀' },
  {
    key: 'accessScope',
    label: '适用范围',
    type: 'select',
    default: 'all',
    required: true,
    options: [
      { label: '所有门店', value: 'all' },
      { label: '指定门店', value: 'selected' },
    ],
  },
  {
    key: 'storeIds',
    label: '适用门店（指定门店时必选）',
    type: 'multi',
    source: 'stores',
    default: [],
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    default: 'draft',
    options: [
      { label: '草稿', value: 'draft' },
      { label: '发布', value: 'published' },
      { label: '停用', value: 'inactive' },
    ],
  },
];
</script>
<template>
  <ResourcePage
    title="会员卡种"
    endpoint="card-templates"
    :fields="fields"
    :columns="[
      { title: '名称', dataIndex: 'name' },
      { title: '版本', dataIndex: 'version' },
      { title: '类型', dataIndex: 'kind' },
      { title: '售价', dataIndex: 'price' },
      { title: '范围', dataIndex: 'accessScope' },
      { title: '状态', dataIndex: 'status' },
    ]"
    write-code="cards:write"
    :editable="(row) => row.status === 'draft'"
  >
    <template #actions="{ row, reload }">
      <template v-if="canGym('cards:write')">
        <Button
          type="link"
          @click="
            async () => {
              await gymApi.post(`card-templates/${row.id}/versions`, {});
              message.success('已复制为新版本草稿，可编辑');
              await reload();
            }
          "
        >
          新版本
</Button><Button
          type="link"
          @click="
            async () => {
              await gymApi.patch(`card-templates/${row.id}`, {
                status: row.status === 'published' ? 'inactive' : 'published',
              });
              await reload();
            }
          "
        >
          {{ row.status === 'published' ? '停用' : '发布' }}
        </Button>
      </template>
    </template>
  </ResourcePage>
</template>
