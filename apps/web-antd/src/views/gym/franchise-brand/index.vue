<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { onMounted, ref } from 'vue';

import { Alert, Button, Form, FormItem, Input, message, Select, Space, Upload } from 'ant-design-vue';

import { gymApi, openGymFile, uploadGymFile } from '#/api/gym';
import Page from '#/views/gym/components/admin-page.vue';

import { title } from './data';

const data = ref<Record<string, any>>({ blocks: [], models: [] });

const busy = ref(false);

async function load() {
  busy.value = true;
  try {
    data.value = await gymApi.get('franchise-brand', undefined);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  await load();
});

async function upload(file: File, target: Record<string, any>, key: string, list = false) {
  busy.value = true;
  try {
    const result = await uploadGymFile(file, file.type.startsWith('video/') ? 'video' : 'image', undefined);
    if (list) target[key].push(result.id);
    else target[key] = result.id;
    message.success('文件已上传，请保存配置');
  } finally {
    busy.value = false;
  }
  return false;
}

async function save() {
  busy.value = true;
  try {
    let body: Record<string, any> = {};
    for (const key of ['name', 'introduction', 'contactPhone', 'logoFileId', 'status']) body[key] = data.value[key];
    body.models = data.value.models.map((m: GymRow) => ({
      modelCode: m.modelCode,
      name: m.name,
      description: m.description,
      areaSqm: m.areaSqm,
      investmentDescription: m.investmentDescription,
      fileIds: m.fileIds,
    }));
    await gymApi.put('franchise-brand', body);
    message.success('配置已保存');
    await load();
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="gym-view">
    <Page :title="title">
      <Alert type="info" message="当前仅管理展示资料，尚未提供小程序/App前台服务。" class="mb-4" />
      <Form layout="vertical">
        <FormItem label="品牌名称">
          <Input v-model:value="data.name" />
        </FormItem>
        <FormItem label="品牌介绍">
          <Input.TextArea v-model:value="data.introduction" />
        </FormItem>
        <FormItem label="联系电话">
          <Input v-model:value="data.contactPhone" />
        </FormItem>
        <FormItem label="发布状态">
          <Select
            v-model:value="data.status"
            :options="[
              { label: '草稿', value: 'draft' },
              { label: '发布（三种模型均需图片/视频）', value: 'published' },
            ]"
          />
        </FormItem>
        <FormItem label="品牌标志">
          <Upload
            :before-upload="(file) => upload(file, data, 'logoFileId')"
            :show-upload-list="false"
            accept=".png,.jpg,.jpeg"
          >
            <Button>上传标志</Button>
          </Upload>
        </FormItem>
        <div v-for="(model, index) in data.models" :key="index" class="my-4">
          <Space wrap>
            <FormItem label="模型编号">
              <Input v-model:value="model.modelCode" />
            </FormItem>
            <FormItem label="模型名称">
              <Input v-model:value="model.name" />
            </FormItem>
            <FormItem label="面积（㎡）">
              <Input v-model:value="model.areaSqm" />
            </FormItem>
            <Button @click="data.models.splice(index, 1)"> 移除模型 </Button>
          </Space>
          <FormItem label="模型说明">
            <Input.TextArea v-model:value="model.description" />
          </FormItem>
          <FormItem label="投资说明">
            <Input.TextArea v-model:value="model.investmentDescription" />
          </FormItem>
          <Upload
            :before-upload="(file) => upload(file, model, 'fileIds', true)"
            :show-upload-list="false"
            accept=".png,.jpg,.jpeg,.mp4"
          >
            <Button>上传立体图 / 视频</Button>
          </Upload>
          <Space v-for="(fileId, fileIndex) in model.fileIds" :key="fileId" class="my-2">
            <Button type="link" @click="openGymFile(fileId)"> 视图 {{ Number(fileIndex) + 1 }}</Button>
            <Button @click="model.fileIds.splice(fileIndex, 1)"> 移除 </Button>
          </Space>
        </div>
        <Button
          v-if="data.models.length < 3"
          class="my-3"
          @click="data.models.push({ modelCode: '', name: '', fileIds: [] })"
        >
          增加模型
        </Button>
        <FormItem>
          <Button type="primary" :loading="busy" @click="save"> 保存配置 </Button>
        </FormItem>
      </Form>
    </Page>
  </div>
</template>
