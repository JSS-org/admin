<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Alert, Button, DatePicker, Empty, Form, FormItem, Input, InputNumber, Select, Space } from 'ant-design-vue';

import { canGym } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import PercentageInput from '#/views/gym/components/percentage-input.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { labels, templateColumns } from './data';
import { usePage } from './use-page';

const list = useTemplateRef<ResourcePageHandle>('list');

const { visible, busy, form, edit, saveTemplate, publish } = usePage(list);

function rowTemplateAction(row: GymRow) {
  return row.status === 'draft' ? 'edit' : 'detail';
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="list"
      title="薪资模板"
      endpoint="salary-templates"
      :fields="[]"
      :columns="templateColumns"
      :create="false"
      :edit="false"
    >
      <template #create>
        <Button v-if="canGym('payroll:templates')" type="primary" @click="edit()"> 新增模板 </Button>
      </template>
      <template #actions="{ row }">
        <Space>
          <TableAction :action="rowTemplateAction(row)" @click="edit(row)" />
          <TableAction action="publish" v-if="row.status === 'draft'" @click="publish(row)" />
          <TableAction action="version" @click="edit(row, true)" />
        </Space>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      title="薪资模板规则"
      width="850px"
      :confirm-loading="busy"
      :ok-button-props="{
        disabled: form.status === 'published' && !form.newVersion,
      }"
      @ok="saveTemplate"
    >
      <Alert message="底薪和固定加扣项按整月；提成使用百分比。销售区间留空时计算全部净业绩。" type="info" />
      <Form layout="vertical" :disabled="busy || (form.status === 'published' && !form.newVersion)">
        <FormItem label="模板名称">
          <Input v-model:value="form.name" />
        </FormItem>
        <FormItem label="整月底薪">
          <InputNumber v-model:value="form.baseSalary" :min="0" :precision="2" />
        </FormItem>
        <FormItem label="生效日期">
          <DatePicker v-model:value="form.effectiveFrom" value-format="YYYY-MM-DD" />
        </FormItem>
        <FormItem label="失效日期（不含）">
          <DatePicker v-model:value="form.effectiveTo" value-format="YYYY-MM-DD" />
        </FormItem>
        <Empty
          v-if="!form.rules?.length"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          description="暂无提成或加扣规则，当前仅计算底薪"
        />
        <section v-for="(rule, index) in form.rules" :key="index" class="gym-rule-card">
          <FormItem :label="`规则 ${Number(index) + 1} · 工资组成`" required>
            <Select
              v-model:value="rule.component"
              :options="
                Object.entries(labels).map(([value, label]) => ({
                  label,
                  value,
                }))
              "
            />
          </FormItem>
          <template v-if="['card_sales', 'pt_sales'].includes(rule.component)">
            <FormItem label="提成比例" required><PercentageInput v-model:value="rule.rate" /></FormItem>
            <FormItem label="业绩区间下限（元，留空为0）"
              ><InputNumber v-model:value="rule.lowerBound" :min="0" :precision="2"
            /></FormItem>
            <FormItem label="业绩区间上限（元，留空为不限）"
              ><InputNumber v-model:value="rule.upperBound" :min="0" :precision="2"
            /></FormItem>
          </template>
          <FormItem v-else-if="rule.component === 'lessons'" label="每课时金额（元）" required>
            <InputNumber
              v-model:value="rule.unitAmount"
              aria-label="每课时金额"
              placeholder="每课时金额"
              :min="0"
              :precision="2"
            />
          </FormItem>
          <FormItem v-else :label="rule.component === 'deduction' ? '固定扣款（元）' : '固定补贴（元）'" required>
            <InputNumber
              v-model:value="rule.fixedAmount"
              aria-label="固定金额"
              placeholder="固定金额"
              :min="0"
              :precision="2"
            />
          </FormItem>
          <Button danger @click="form.rules.splice(Number(index), 1)">移除此规则</Button>
        </section>
        <Button class="gym-form-add" type="dashed" @click="form.rules.push({ component: 'card_sales', rate: 0 })">
          添加规则
        </Button>
      </Form>
    </AdminDrawer>
  </div>
</template>
