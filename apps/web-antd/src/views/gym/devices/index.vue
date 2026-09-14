<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Alert, Button, Form, FormItem, Input, Select, Table } from 'ant-design-vue';

import { canGym } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { code, columns, fields, title } from './data';
import { usePage } from './use-page';

const page = useTemplateRef<ResourcePageHandle>('page');

const { prepare, visible, mode, current, busy, compartments, commands, reason, compartmentId, result, open, save } =
  usePage(page);
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="title"
      endpoint="devices"
      :fields="fields"
      :columns="columns"
      :write-code="code"
      :store-filter="true"
      :prepare="prepare"
      :editable="(row) => !row.revokedAt"
    >
      <template #actions="{ row }">
        <Button v-if="row.type === 'locker' && canGym('devices:write')" type="link" @click="open(row, 'compartments')">
          配置柜格
        </Button>
        <Button v-if="['door', 'locker'].includes(row.type)" type="link" @click="open(row, 'command')">
          远程操作 / 记录
        </Button>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="current?.name"
      :width="850"
      :footer="mode === 'compartments' ? undefined : null"
      :confirm-loading="busy"
      @ok="save"
    >
      <Form v-if="mode === 'compartments'" layout="vertical">
        <div v-for="(cell, index) in compartments" :key="index" class="gym-rule-card">
          <FormItem label="柜格编号" required>
            <Input v-model:value="cell.number" placeholder="柜号" />
          </FormItem>
          <FormItem label="柜格状态" required>
            <Select
              v-model:value="cell.status"
              :options="[
                { label: '可用', value: 'available' },
                { label: '停用', value: 'inactive' },
              ]"
            />
          </FormItem>
          <Button danger @click="compartments.splice(index, 1)"> 移除 </Button>
        </div>
        <Button class="gym-form-add" type="dashed" @click="compartments.push({ number: '', status: 'available' })">
          增加柜格
        </Button>
      </Form>
      <template v-if="mode === 'command'">
        <Alert
          v-if="current?.provider === 'mock'"
          type="info"
          show-icon
          message="模拟设备：指令仅在Mock中演示，不控制真实门禁或柜子。"
        />
        <Form v-if="canGym('devices:command')" layout="vertical" class="mt-3">
          <FormItem v-if="current?.type === 'locker'" label="柜格">
            <Select
              v-model:value="compartmentId"
              :options="
                current?.compartments.map((c: GymRow) => ({
                  label: c.number,
                  value: c.id,
                }))
              "
              @change="result = undefined"
            />
          </FormItem>
          <FormItem label="操作原因">
            <Input.TextArea v-model:value="reason" />
          </FormItem>
          <Button type="primary" :loading="busy" @click="save">{{
            current?.provider === 'mock' ? '执行模拟指令' : '提交远程指令'
          }}</Button>
        </Form>
        <Alert
          v-if="result"
          class="my-3"
          :type="result.status === 'succeeded' ? 'success' : 'error'"
          :message="
            result.simulated && result.status === 'succeeded'
              ? '模拟执行成功（未控制真实设备）'
              : (result.failureReason ?? result.status)
          "
        />
        <Table
          :data-source="commands"
          row-key="id"
          :columns="[
            { title: '时间', dataIndex: 'requestedAt' },
            { title: '操作人', dataIndex: 'requesterName' },
            { title: '指令', dataIndex: 'command' },
            { title: '原因', dataIndex: 'reason' },
            { title: '结果', dataIndex: 'status' },
            { title: '失败原因', dataIndex: 'failureReason' },
          ]"
        />
      </template>
    </AdminDrawer>
  </div>
</template>
