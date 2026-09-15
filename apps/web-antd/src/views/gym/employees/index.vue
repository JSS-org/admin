<script setup lang="ts">
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Alert, Button, Descriptions, DescriptionsItem, Form, FormItem, Input, Select, Table } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import EntityRecords from '#/views/gym/components/entity-records.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { columns } from './data';
import { usePage } from './use-page';

const view = useTemplateRef<ResourcePageHandle>('view');

const {
  editorFields,
  loadDetail,
  salaryHistory,
  current,
  mode,
  visible,
  saving,
  roles,
  links,
  password,
  username,
  selectedStores,
  stores,
  prepare,
  open,
  save,
  titles,
} = usePage(view);
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="view"
      title="员工管理"
      endpoint="employees"
      :fields="editorFields"
      :load-detail="loadDetail"
      :columns="columns"
      write-code="employees:write"
      store-filter
      :prepare="prepare"
      detail
      @detail="open($event, 'detail')"
    >
      <template #editor-extra="{ row, form }">
        <section v-if="row && canGym('payroll:read')" class="gym-stack">
          <Alert
            v-if="form.salaryMode === 'assign'"
            type="info"
            show-icon
            message="员工资料与工资配置一起保存"
            description="按月发薪请在月初切换，配置和模板须覆盖整月。新配置会结束上一段配置并保留历史；已确认工资使用的期间不能缩短。"
            class="mb-4"
          />
          <h3 class="mb-3 font-medium">工资模板历史</h3>
          <Table
            :data-source="salaryHistory"
            row-key="id"
            size="small"
            :pagination="false"
            :columns="[
              { title: '门店', dataIndex: 'storeName' },
              { title: '模板', dataIndex: 'templateName' },
              { title: '版本', dataIndex: 'templateVersion' },
              { title: '生效', dataIndex: 'effectiveFrom' },
              { title: '结束（不含）', dataIndex: 'effectiveTo' },
            ]"
          >
            <template #bodyCell="{ column, text }">
              {{ column.dataIndex === 'effectiveTo' && !text ? '长期' : text }}
            </template>
          </Table>
        </section>
      </template>
      <template #actions="{ row, reload }">
        <TableAction action="stores" v-if="canGym('employees:write')" @click="open(row, 'stores')" />
        <template v-if="canGym('accounts:write')">
          <TableAction action="account" v-if="!row.accountId" @click="open(row, 'account')" />
          <template v-else>
            <TableAction action="roles" @click="open(row, 'roles')" />
            <TableAction action="password" @click="open(row, 'password')" />
            <TableAction
              :action="row.accountStatus === 'active' ? 'disable' : 'enable'"
              :label="row.accountStatus === 'active' ? '停用账号' : '启用账号'"
              @click="
                async () => {
                  await gymApi.patch(`accounts/${row.accountId}`, {
                    status: row.accountStatus === 'active' ? 'inactive' : 'active',
                  });
                  await reload();
                }
              "
            />
          </template>
        </template>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="titles[mode]"
      :footer="mode === 'detail' ? null : undefined"
      :confirm-loading="saving"
      @ok="save"
    >
      <template v-if="mode === 'detail' && current">
        <Descriptions bordered :column="1">
          <DescriptionsItem label="工号">{{ current.employeeNo }}</DescriptionsItem>
          <DescriptionsItem label="姓名">{{ current.name }}</DescriptionsItem>
          <DescriptionsItem label="手机号">{{ current.phone }}</DescriptionsItem>
          <DescriptionsItem label="职位">{{ current.jobTitle || '—' }}</DescriptionsItem>
          <DescriptionsItem label="入职日期">{{ current.hiredOn }}</DescriptionsItem>
          <DescriptionsItem label="状态">{{ current.status === 'active' ? '在职' : '停用 / 离职' }}</DescriptionsItem>
          <DescriptionsItem label="登录账号">{{ current.username || '未创建账号' }}</DescriptionsItem>
          <DescriptionsItem label="所属门店">{{
            current.storeIds.map((id: string) => stores.find((store) => store.id === id)?.name ?? '—').join('、')
          }}</DescriptionsItem>
        </Descriptions>
        <template v-if="canGym('payroll:read')">
          <h3 class="font-medium">工资模板历史</h3>
          <EntityRecords
            endpoint="employee-salary-assignments"
            :params="{ employeeId: current.id }"
            :columns="[
              { title: '门店', dataIndex: 'storeName' },
              { title: '模板', dataIndex: 'templateName' },
              { title: '版本', dataIndex: 'templateVersion' },
              { title: '生效日期', dataIndex: 'effectiveFrom' },
              { title: '结束日期', dataIndex: 'effectiveTo' },
            ]"
          />
        </template>
      </template>
      <Form v-else-if="mode === 'roles'" layout="vertical" :disabled="saving">
        <div v-for="(link, index) in links" :key="index" class="gym-rule-card">
          <FormItem :label="`授权 ${index + 1} · 角色`" required>
            <Select
              v-model:value="link.roleId"
              placeholder="角色"
              :options="roles.map((r) => ({ label: r.name, value: r.id }))"
              show-search
              option-filter-prop="label"
              @change="link.storeId = undefined"
            />
          </FormItem>
          <FormItem v-if="roles.find((r) => r.id === link.roleId)?.scopeType === 'store'" label="授权门店" required>
            <Select
              v-model:value="link.storeId"
              placeholder="授权门店"
              :options="
                stores.filter((s) => current?.storeIds.includes(s.id)).map((s) => ({ label: s.name, value: s.id }))
              "
              show-search
              option-filter-prop="label"
            />
          </FormItem>
          <Button danger @click="links.splice(index, 1)">移除</Button>
        </div>
        <Button class="gym-form-add" type="dashed" @click="links.push({})">增加授权</Button>
      </Form>
      <Form v-else-if="mode === 'stores'" layout="vertical" :disabled="saving">
        <FormItem label="所属门店" required extra="第一项为主门店；保留门店的负责人标记和原入职日期。">
          <Select
            v-model:value="selectedStores"
            mode="multiple"
            :options="stores.map((s) => ({ label: s.name, value: s.id }))"
            style="width: 100%"
            show-search
            option-filter-prop="label"
          />
        </FormItem>
      </Form>
      <Form v-else layout="vertical" :disabled="saving">
        <FormItem v-if="mode === 'account'" label="用户名" required>
          <Input v-model:value="username" />
        </FormItem>
        <FormItem label="密码（至少6位）" required>
          <Input.Password v-model:value="password" />
        </FormItem>
      </Form>
    </AdminDrawer>
  </div>
</template>
