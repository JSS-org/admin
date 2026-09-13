<script setup lang="ts">
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Button, Form, FormItem, Input, InputNumber, Select, Upload } from 'ant-design-vue';

import { canGym, gymApi, openGymFile } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields, isTemplate, title, writeCode } from './data';
import { usePage } from './use-page';

const page = useTemplateRef<ResourcePageHandle>('page');

const {
  visible,
  mode,
  busy,
  contractName,
  applicableType,
  reminderDays,
  filename,
  createContract,
  upload,
  newVersion,
  replaceFile,
  save,
} = usePage(page);
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="title"
      endpoint="contract-templates"
      :fields="fields"
      :columns="columns"
      :write-code="writeCode"
      :create="false"
      :edit="isTemplate"
      :editable="(row) => row.status === 'draft'"
      :store-filter="false"
      :time-filter="false"
    >
      <template #toolbar>
        <Button v-if="canGym(writeCode)" type="primary" @click="createContract"> 上传合同模板 </Button>
      </template>
      <template #actions="{ row, reload }">
        <template v-if="canGym(writeCode)">
          <Button type="link" @click="newVersion(row)">新版本</Button>
          <Button
            type="link"
            @click="
              async () => {
                await gymApi.patch(`contract-templates/${row.id}`, {
                  status: row.status === 'published' ? 'inactive' : 'published',
                });
                await reload();
              }
            "
            >{{ row.status === 'published' ? '停用' : '发布' }}</Button
          >
          <Button type="link" @click="openGymFile(row.fileId)"> 查看PDF </Button>
          <Button v-if="row.status === 'draft'" type="link" @click="replaceFile(row)"> 替换PDF </Button>
        </template>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      title="管理操作"
      :width="760"
      :footer="undefined"
      :confirm-loading="busy"
      @ok="save"
    >
      <Form layout="vertical">
        <template v-if="mode === 'contract'">
          <FormItem label="模板名称">
            <Input v-model:value="contractName" />
          </FormItem>
          <FormItem label="适用类型">
            <Select
              v-model:value="applicableType"
              :options="[
                { label: '会员卡', value: 'card' },
                { label: '课程', value: 'course' },
              ]"
            />
          </FormItem>
          <FormItem label="提前提醒天数">
            <InputNumber v-model:value="reminderDays" :min="0" :max="365" />
          </FormItem>
        </template>
        <FormItem label="合同PDF">
          <Upload :before-upload="upload" :show-upload-list="false" accept=".pdf">
            <Button :loading="busy">上传PDF</Button>
          </Upload>
          {{ filename }}</FormItem
        >
      </Form>
    </AdminDrawer>
  </div>
</template>
