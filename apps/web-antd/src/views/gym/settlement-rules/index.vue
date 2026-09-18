<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { Alert, Button, DatePicker, Empty, Form, FormItem, InputNumber, Select, Space, Table } from 'ant-design-vue';

import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import Page from '#/views/gym/components/admin-page.vue';
import FilterBar from '#/views/gym/components/filter-bar.vue';
import PercentageInput from '#/views/gym/components/percentage-input.vue';
import TableAction from '#/views/gym/components/table-action.vue';
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

function rowRuleAction(record: GymRow) {
  return record.status === 'draft' ? 'edit' : 'detail';
}

function handleRulesChange(p: { current?: number; pageSize?: number }) {
  clearRulesSelection();
  rulesPage.value = p.current ?? 1;
  rulesPageSize.value = p.pageSize ?? 20;
}
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
        @change="handleRulesChange"
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
            <TableAction :action="rowRuleAction(record as GymRow)" @click="edit(record)" />
            <TableAction action="enable" v-if="record.status === 'draft'" @click="activate(record)" />
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
        <Form layout="vertical" :disabled="busy || form.status === 'active'">
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
            <DatePicker v-model:value="form.effectiveFrom" value-format="YYYY-MM-DD" />
          </FormItem>
          <FormItem label="失效日期（不含）">
            <DatePicker v-model:value="form.effectiveTo" value-format="YYYY-MM-DD" />
          </FormItem>
          <Empty
            v-if="!form.items?.length"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="请添加至少一个接收账户"
          />
          <section v-for="(item, index) in form.items" :key="index" class="gym-rule-card">
            <FormItem :label="`接收账户 ${Number(index) + 1}`" required>
              <Select
                v-model:value="item.paymentAccountId"
                show-search
                option-filter-prop="label"
                :options="
                  accounts.map((a) => ({
                    label: `${a.accountName} ${a.accountMasked} (${a.bindingStatus})`,
                    value: a.id,
                  }))
                "
              />
            </FormItem>
            <FormItem label="分账比例" required><PercentageInput v-model:value="item.ratio" /></FormItem>
            <Button @click="form.items.splice(Number(index), 1)"> 移除 </Button>
          </section>
          <Alert
            class="mb-4"
            :type="
              Math.abs(
                form.items?.reduce((sum: number, item: Record<string, any>) => sum + Number(item.ratio ?? 0), 0) - 1,
              ) < 0.000001
                ? 'success'
                : 'warning'
            "
            :message="`当前合计 ${((form.items ?? []).reduce((sum: number, item: Record<string, any>) => sum + Number(item.ratio ?? 0), 0) * 100).toFixed(2)}%，须为 100%`"
          />
          <Button class="gym-form-add" type="dashed" @click="form.items.push({ ratio: 0 })">添加接收账户</Button>
        </Form>
      </AdminDrawer>
    </Page>
  </div>
</template>
