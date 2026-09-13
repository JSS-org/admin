<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref, useTemplateRef } from 'vue';

import { Button, Form, FormItem, Input, message, Space, Table, Upload } from 'ant-design-vue';

import { canGym, gymApi, openGymFile, uploadGymFile } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { code, columns, fields, title } from './data';

function prepare(values: Record<string, any>, row?: GymRow) {
  const result = { ...values };
  if (!row && true) Reflect.deleteProperty(result, 'status');
  for (const key of ['startsAt', 'endsAt']) if (result[key]) result[key] = new Date(result[key]).toISOString();
  return result;
}

const page = useTemplateRef<ResourcePageHandle>('page');

const visible = ref(false);

const current = ref<GymRow>();

const busy = ref(false);

const tutorials = ref<GymRow[]>([]);

const tutorialTitle = ref('');

const instructions = ref('');

const fileId = ref<string>();

const filename = ref('');

async function open(row: GymRow) {
  const detail = await gymApi.get<GymRow>(`equipment/${row.id}`);
  current.value = detail;
  const data = await gymApi.list(`equipment/${row.id}/tutorials`);
  tutorials.value = data.items;
  tutorialTitle.value = '';
  instructions.value = '';
  fileId.value = undefined;
  filename.value = '';
  visible.value = true;
}

async function save() {
  if (!current.value) return;
  busy.value = true;
  try {
    await gymApi.post(`equipment/${current.value.id}/tutorials`, {
      title: tutorialTitle.value,
      fileId: fileId.value,
      instructions: instructions.value,
      sortOrder: tutorials.value.length,
    });
    await open(current.value);
    message.success('教学已上传');
    await page.value?.load();
  } finally {
    busy.value = false;
  }
}

async function upload(file: File) {
  if (!current.value) return false;
  busy.value = true;
  try {
    const data = await uploadGymFile(file, file.type.startsWith('video/') ? 'video' : 'image', current.value.storeId);
    fileId.value = data.id;
    filename.value = file.name;
  } finally {
    busy.value = false;
  }
  return false;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="title"
      endpoint="equipment"
      :fields="fields"
      :columns="columns"
      :write-code="code"
      :store-filter="true"
      :prepare="prepare"
      :editable="(row) => !row.revokedAt"
    >
      <template #actions="{ row }">
        <Button type="link" @click="open(row)"> 教学资料 </Button>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      :title="current?.name"
      :width="850"
      :footer="null"
      :confirm-loading="busy"
      @ok="save"
    >
      <Form v-if="canGym('equipment:write')" layout="vertical">
        <FormItem label="教学标题">
          <Input v-model:value="tutorialTitle" />
        </FormItem>
        <FormItem label="说明">
          <Input.TextArea v-model:value="instructions" />
        </FormItem>
        <FormItem label="图片/视频">
          <Upload :before-upload="upload" :show-upload-list="false" accept=".png,.jpg,.jpeg,.mp4">
            <Button :loading="busy">上传教学文件</Button>
          </Upload>
          {{ filename }}</FormItem
        >
        <Button type="primary" :loading="busy" @click="save"> 保存教学 </Button>
      </Form>
      <Table
        :data-source="tutorials"
        row-key="id"
        :columns="[
          { title: '标题', dataIndex: 'title' },
          { title: '说明', dataIndex: 'instructions' },
          { title: '状态', dataIndex: 'status' },
          { title: '操作', dataIndex: 'actions' },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <Space v-if="column.dataIndex === 'actions'">
            <Button type="link" @click="openGymFile(record.fileId)"> 查看 </Button>
            <Button
              v-if="canGym('equipment:write')"
              type="link"
              @click="
                async () => {
                  await gymApi.patch(`equipment/${current?.id}/tutorials/${record.id}`, {
                    status: record.status === 'active' ? 'inactive' : 'active',
                  });
                  if (current) await open(current);
                }
              "
              >{{ record.status === 'active' ? '停用' : '启用' }}</Button
            >
          </Space>
        </template>
      </Table>
    </AdminDrawer>
  </div>
</template>
