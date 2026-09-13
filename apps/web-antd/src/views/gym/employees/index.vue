<script setup lang="ts">
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Button, Form, FormItem, Input, Select, Space } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields } from './data';
import { usePage } from './use-page';

const view = useTemplateRef<ResourcePageHandle>('view');

const {
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
      :fields="fields"
      :columns="columns"
      write-code="employees:write"
      store-filter
      :prepare="prepare"
    >
      <template #actions="{ row, reload }">
        <Button v-if="canGym('employees:write')" type="link" @click="open(row, 'stores')"> 所属门店 </Button>
        <template v-if="canGym('accounts:write')">
          <Button v-if="!row.accountId" type="link" @click="open(row, 'account')"> 创建账号 </Button>
          <template v-else>
            <Button type="link" @click="open(row, 'roles')">授权</Button>
            <Button type="link" @click="open(row, 'password')">密码</Button>
            <Button
              type="link"
              @click="
                async () => {
                  await gymApi.patch(`accounts/${row.accountId}`, {
                    status: row.accountStatus === 'active' ? 'inactive' : 'active',
                  });
                  await reload();
                }
              "
            >
              {{ row.accountStatus === 'active' ? '停用账号' : '启用账号' }}
            </Button>
          </template>
        </template>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" :title="titles[mode]" :confirm-loading="saving" @ok="save">
      <template v-if="mode === 'roles'">
        <Space v-for="(link, index) in links" :key="index" wrap class="mb-3">
          <Select
            v-model:value="link.roleId"
            placeholder="角色"
            :options="roles.map((r) => ({ label: r.name, value: r.id }))"
            style="min-width: 150px"
          />
          <Select
            v-if="roles.find((r) => r.id === link.roleId)?.scopeType === 'store'"
            v-model:value="link.storeId"
            placeholder="授权门店"
            :options="
              stores.filter((s) => current?.storeIds.includes(s.id)).map((s) => ({ label: s.name, value: s.id }))
            "
            style="min-width: 150px"
          />
          <Button danger @click="links.splice(index, 1)">移除</Button>
        </Space>
        <Button @click="links.push({})">增加授权</Button>
      </template>
      <Select
        v-else-if="mode === 'stores'"
        v-model:value="selectedStores"
        mode="multiple"
        :options="stores.map((s) => ({ label: s.name, value: s.id }))"
        style="width: 100%"
      />
      <Form v-else layout="vertical">
        <FormItem v-if="mode === 'account'" label="用户名">
          <Input v-model:value="username" />
        </FormItem>
        <FormItem label="密码（至少6位）">
          <Input.Password v-model:value="password" />
        </FormItem>
      </Form>
    </AdminDrawer>
  </div>
</template>
