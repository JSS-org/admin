<script setup lang="ts">
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Alert, Button, Form, FormItem, Input, InputNumber, Select, Space } from 'ant-design-vue';

import { canGym } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { labels, templateColumns } from './data';
import { usePage } from './use-page';

const list = useTemplateRef<ResourcePageHandle>('list');

const { visible, busy, form, edit, saveTemplate, publish } = usePage(list);
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
      <template #toolbar>
        <Button v-if="canGym('payroll:templates')" type="primary" @click="edit()"> 新增模板 </Button>
      </template>
      <template #actions="{ row }">
        <Space>
          <Button @click="edit(row)">{{ row.status === 'draft' ? '编辑' : '查看规则' }}</Button>
          <Button v-if="row.status === 'draft'" @click="publish(row)"> 发布 </Button>
          <Button @click="edit(row, true)">创建新版本</Button>
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
      <Alert
        message="底薪和固定加扣项按整月；比例填0到1。销售区间为空表示全部净业绩，有区间时仅计算该区间内金额。"
        type="info"
      />
      <Form layout="vertical">
        <FormItem label="模板名称">
          <Input v-model:value="form.name" />
        </FormItem>
        <FormItem label="整月底薪">
          <InputNumber v-model:value="form.baseSalary" :min="0" :precision="2" />
        </FormItem>
        <Space>
          <FormItem label="生效日期">
            <Input v-model:value="form.effectiveFrom" type="date" />
          </FormItem>
          <FormItem label="失效日期（不含）">
            <Input v-model:value="form.effectiveTo" type="date" />
          </FormItem>
        </Space>
        <FormItem v-for="(rule, index) in form.rules" :key="index" :label="`规则 ${Number(index) + 1}`">
          <Space wrap>
            <Select
              v-model:value="rule.component"
              style="width: 160px"
              :options="
                Object.entries(labels).map(([value, label]) => ({
                  label,
                  value,
                }))
              "
            />
            <template v-if="['card_sales', 'pt_sales'].includes(rule.component)">
              <InputNumber
                v-model:value="rule.rate"
                aria-label="提成比例"
                placeholder="比例"
                :min="0"
                :max="1"
                :step="0.01"
              />
              <InputNumber v-model:value="rule.lowerBound" aria-label="区间下限" placeholder="金额下限" :min="0" />
              <InputNumber v-model:value="rule.upperBound" aria-label="区间上限" placeholder="金额上限" :min="0" />
            </template>
            <InputNumber
              v-else-if="rule.component === 'lessons'"
              v-model:value="rule.unitAmount"
              aria-label="每课时金额"
              placeholder="每课时金额"
              :min="0"
              :precision="2"
            />
            <InputNumber
              v-else
              v-model:value="rule.fixedAmount"
              aria-label="固定金额"
              placeholder="固定金额"
              :min="0"
              :precision="2"
            />
            <Button @click="form.rules.splice(Number(index), 1)">移除</Button>
          </Space>
        </FormItem>
        <Button @click="form.rules.push({ component: 'card_sales', rate: 0 })"> 添加规则 </Button>
      </Form>
    </AdminDrawer>
  </div>
</template>
