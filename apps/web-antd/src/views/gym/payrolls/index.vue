<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { onMounted, ref, useTemplateRef } from 'vue';

import { Alert, Button, Form, FormItem, Input, Modal, Select, Space, Table } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, itemColumns } from './data';

const list = useTemplateRef<ResourcePageHandle>('list');

const calculateVisible = ref(false);

const busy = ref(false);

const stores = ref<GymRow[]>([]);

const storeId = ref<string>();

const month = ref(new Date().toISOString().slice(0, 7));

const detail = ref<GymRow>();

const showDetail = ref(false);

const selectedItem = ref<Record<string, any>>();

onMounted(async () => {
  stores.value = await gymApi.listAll('stores');
  storeId.value = stores.value[0]?.id;
});

async function calculate(row?: GymRow) {
  busy.value = true;
  try {
    const result = row
      ? await gymApi.post(`payrolls/${row.id}/calculations`, {})
      : await gymApi.post('payrolls', {
          storeId: storeId.value,
          month: month.value,
        });
    calculateVisible.value = false;
    await list.value?.load();
    await details(result);
  } finally {
    busy.value = false;
  }
}

async function details(row: GymRow) {
  detail.value = await gymApi.get(`payrolls/${row.id}`);
  selectedItem.value = undefined;
  showDetail.value = true;
}

function confirm(row: GymRow) {
  Modal.confirm({
    title: `确认${row.month}工资？`,
    content: '确认后该店本月工资将冻结，不能重算覆盖。',
    onOk: async () => {
      await gymApi.patch(`payrolls/${row.id}`, { status: 'confirmed' });
      await list.value?.load();
    },
  });
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="list"
      title="门店工资表"
      endpoint="payrolls"
      :fields="[]"
      :create="false"
      :edit="false"
      store-filter
      detail
      @detail="details"
      :columns="columns"
    >
      <template #toolbar>
        <Button v-if="canGym('payroll:calculate')" type="primary" @click="calculateVisible = true"> 计算月工资 </Button>
      </template>
      <template #actions="{ row }">
        <Space>
          <Button
            v-if="canGym('payroll:calculate') && row.status !== 'confirmed'"
            :loading="busy"
            @click="calculate(row)"
          >
            重算
          </Button>
          <Button v-if="canGym('payroll:confirm') && row.status === 'calculated'" @click="confirm(row)">
            确认工资
          </Button>
        </Space>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="calculateVisible" title="计算月工资" :confirm-loading="busy" @ok="calculate()">
      <Alert message="须为每位员工配置覆盖整月的唯一已发布模板。未全部计算成功时保留原工资。" type="info" />
      <Form layout="vertical">
        <FormItem label="门店">
          <Select v-model:value="storeId" :options="stores.map((s) => ({ label: s.name, value: s.id }))" />
        </FormItem>
        <FormItem label="月份">
          <Input v-model:value="month" type="month" />
        </FormItem>
      </Form>
    </AdminDrawer>
    <AdminDrawer v-model:open="showDetail" title="工资明细" width="1200px" :footer="null">
      <p>{{ detail?.storeName }} / {{ detail?.month }} / {{ detail?.status }}；实发合计 {{ detail?.netAmount }}</p>
      <Table row-key="id" :data-source="detail?.items" :columns="itemColumns" :pagination="false">
        <template #bodyCell="{ column, record }">
          <Button v-if="column.key === 'action'" @click="selectedItem = record"> 计算来源 </Button>
        </template>
      </Table>
      <template v-if="selectedItem">
        <p>{{ selectedItem.employeeName }}：{{ selectedItem.calculationSnapshot.basis }}</p>
        <p>
          模板 {{ selectedItem.calculationSnapshot.template.name }}，版本
          {{ selectedItem.calculationSnapshot.template.version }}
        </p>
        <Table
          row-key="id"
          :data-source="selectedItem.components"
          :pagination="false"
          :columns="[
            { title: '组成', dataIndex: 'label' },
            { title: '基础金额', dataIndex: 'basisAmount' },
            { title: '课时', dataIndex: 'basisQuantity' },
            { title: '比例', dataIndex: 'rate' },
            { title: '金额', dataIndex: 'amount' },
          ]"
        />
        <details v-for="component in selectedItem.components" :key="component.id">
          <summary>{{ component.label }}来源</summary>
          <pre>{{ JSON.stringify(component.sourceSnapshot, null, 2) }}</pre>
        </details>
      </template>
    </AdminDrawer>
  </div>
</template>
