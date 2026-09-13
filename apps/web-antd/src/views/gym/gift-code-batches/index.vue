<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { ref } from 'vue';

import { Alert, Button, Input, Table } from 'ant-design-vue';

import { gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { config, initial, prepare } from './data';

const visible = ref(false);

const mode = ref('');

const busy = ref(false);

const current = ref<GymRow>();

const items = ref<GymRow[]>([]);

const codes = ref<string[]>([]);

async function details(row: GymRow) {
  current.value = await gymApi.get(`gift-code-batches/${row.id}`);
  items.value = current.value?.recipients ?? current.value?.codes ?? [];
  mode.value = 'detail';
  visible.value = true;
}

function saved(row: GymRow) {
  if (row.plainCodes) {
    codes.value = row.plainCodes;
    mode.value = 'codes';
    visible.value = true;
  }
}

function downloadCodes() {
  const url = URL.createObjectURL(new Blob([codes.value.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gift-codes.txt';
  link.click();
  URL.revokeObjectURL(url);
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      :title="config.title"
      endpoint="gift-code-batches"
      :fields="config.fields"
      :columns="config.columns"
      :write-code="config.code"
      :create="true"
      :edit="false"
      :prepare="prepare"
      :initial="initial"
      :idempotent="true"
      :store-filter="false"
      time-filter
      @saved="saved"
    >
      <template #actions="{ row }">
        <Button type="link" @click="details(row)"> 逐项结果 </Button>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="mode === 'codes' ? '礼品码（仅本次显示）' : '批次结果'"
      :width="900"
      :footer="null"
      :confirm-loading="busy"
    >
      <template v-if="mode === 'codes'">
        <Alert type="warning" message="请现在下载或保存，关闭后仅可查询掩码，无法再次读取完整礼品码。" />
        <Input.TextArea :value="codes.join('\n')" :rows="12" readonly class="my-3" />
        <Button @click="downloadCodes">下载礼品码</Button>
      </template>
      <template v-else>
        <Alert type="info" :message="`批次状态：${current?.status ?? '—'}`" class="mb-3" />
        <Table
          :data-source="items"
          row-key="id"
          :columns="[
            { title: '门店', dataIndex: 'storeName' },
            { title: '会员', dataIndex: 'memberName' },
            { title: '数量', dataIndex: 'quantity' },
            { title: '礼品码掩码', dataIndex: 'codeMasked' },
            { title: '结果', dataIndex: 'status' },
            { title: '失败原因', dataIndex: 'failureReason' },
            { title: '阅读结果', dataIndex: 'readStatus' },
          ]"
        />
      </template>
    </AdminDrawer>
  </div>
</template>
