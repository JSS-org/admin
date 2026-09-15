<script setup lang="ts">
import type { ResourcePageHandle } from '#/views/gym/types';

import { useTemplateRef } from 'vue';

import { Button, Form, FormItem, Input, InputNumber, Select } from 'ant-design-vue';

import { canGym, gymApi, openGymFile } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import FileUpload from '#/views/gym/components/file-upload.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

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
  fileId,
  createContract,
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
      <template #create>
        <Button v-if="canGym(writeCode)" type="primary" @click="createContract"> 新增合同模板 </Button>
      </template>
      <template #actions="{ row, reload }">
        <template v-if="canGym(writeCode)">
          <TableAction action="version" @click="newVersion(row)" />
          <TableAction
            :action="row.status === 'published' ? 'disable' : 'publish'"
            @click="
              async () => {
                await gymApi.patch(`contract-templates/${row.id}`, {
                  status: row.status === 'published' ? 'inactive' : 'published',
                });
                await reload();
              }
            "
          />
          <TableAction action="replace" v-if="row.status === 'draft'" @click="replaceFile(row)" />
        </template>
        <TableAction action="preview" v-if="canGym('files:read')" @click="openGymFile(row.fileId)" />
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="mode === 'contract' ? '上传合同模板' : '替换合同 PDF'"
      :width="760"
      :footer="undefined"
      :confirm-loading="busy"
      @ok="save"
    >
      <Form layout="vertical" :disabled="busy">
        <template v-if="mode === 'contract'">
          <FormItem label="模板名称" required>
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
        <FormItem label="合同 PDF" required extra="上传后可点击文件名预览，确认无误后保存模板。">
          <FileUpload
            v-model="fileId"
            category="contract"
            title="点击或拖入合同 PDF"
            :disabled="busy"
            @uploading="busy = $event"
          />
        </FormItem>
      </Form>
    </AdminDrawer>
  </div>
</template>
