<script setup lang="ts">
import { Alert, Button, Form, FormItem, Input, InputNumber, Select, Space, Table } from 'ant-design-vue';

import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import Page from '#/views/gym/components/admin-page.vue';
import FilterBar from '#/views/gym/components/filter-bar.vue';
import TableSelectionActions from '#/views/gym/components/table-selection-actions.vue';

import { usePage } from './use-page';

const {
  stores,
  accounts,
  storeId,
  rules,
  visible,
  busy,
  rulesLoading,
  rulesPage,
  rulesPageSize,
  currentRules,
  rulesSelectionDisabled,
  clearRulesSelection,
  rulesRowSelection,
  selectAllRules,
  selectedRuleKeys,
  form,
  loadRules,
  edit,
  save,
  activate,
  scopeFilter,
} = usePage();
</script>
<template>
  <div class="gym-view">
    <Page title="分账规则">
      <Alert message="有效期含开始日、不含结束日。只有渠道已绑定账户可以启用；启用版本不可修改。" type="info" />
      <FilterBar
        v-model="scopeFilter"
        :keyword="false"
        immediate
        :fields="[
          {
            key: 'storeId',
            label: '配置门店',
            type: 'select',
            clearable: false,
            options: stores.map((s) => ({ label: s.name, value: s.id })),
          },
        ]"
        @search="loadRules"
      />
      <div class="gym-toolbar">
        <Button type="primary" :disabled="!storeId" @click="edit()"> 新增版本 </Button>
        <TableSelectionActions
          :selected="selectedRuleKeys.length"
          :total="currentRules.length"
          :disabled="rulesSelectionDisabled"
          @select-all="selectAllRules"
          @clear="clearRulesSelection"
        />
      </div>
      <Table
        row-key="id"
        :data-source="rules"
        :loading="rulesLoading"
        :row-selection="rulesRowSelection"
        :pagination="{
          current: rulesPage,
          pageSize: rulesPageSize,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
        }"
        @change="
          (p) => {
            clearRulesSelection();
            rulesPage = p.current ?? 1;
            rulesPageSize = p.pageSize ?? 20;
          }
        "
        :columns="[
          { title: '版本', dataIndex: 'version' },
          { title: '周期', dataIndex: 'cycleUnit' },
          { title: '间隔', dataIndex: 'cycleValue' },
          { title: '生效', dataIndex: 'effectiveFrom' },
          { title: '失效', dataIndex: 'effectiveTo' },
          { title: '状态', dataIndex: 'status' },
          { title: '操作', key: 'action' },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <Space v-if="column.key === 'action'">
            <Button @click="edit(record)">{{ record.status === 'draft' ? '编辑' : '查看' }}</Button>
            <Button v-if="record.status === 'draft'" @click="activate(record)"> 启用 </Button>
          </Space>
        </template>
      </Table>
      <AdminDrawer
        v-model:open="visible"
        title="分账规则版本"
        :confirm-loading="busy"
        :ok-button-props="{ disabled: form.status === 'active' }"
        @ok="save"
      >
        <Form layout="vertical">
          <FormItem label="周期">
            <Select
              v-model:value="form.cycleUnit"
              :options="[
                { label: '天', value: 'day' },
                { label: '周', value: 'week' },
                { label: '月', value: 'month' },
              ]"
            />
          </FormItem>
          <FormItem label="周期间隔">
            <InputNumber v-model:value="form.cycleValue" :min="1" :max="365" />
          </FormItem>
          <FormItem label="生效日期">
            <Input v-model:value="form.effectiveFrom" type="date" />
          </FormItem>
          <FormItem label="失效日期（不含）">
            <Input v-model:value="form.effectiveTo" type="date" />
          </FormItem>
          <FormItem v-for="(item, index) in form.items" :key="index" :label="`接收账户 ${Number(index) + 1} / 比例`">
            <Space>
              <Select
                v-model:value="item.paymentAccountId"
                style="width: 250px"
                :options="
                  accounts.map((a) => ({
                    label: `${a.accountName} ${a.accountMasked} (${a.bindingStatus})`,
                    value: a.id,
                  }))
                "
              />
              <InputNumber v-model:value="item.ratio" :min="0" :max="1" :step="0.01" />
              <Button @click="form.items.splice(Number(index), 1)"> 移除 </Button>
            </Space>
          </FormItem>
          <Button @click="form.items.push({ ratio: 0 })">添加接收账户</Button>
        </Form>
      </AdminDrawer>
    </Page>
  </div>
</template>
