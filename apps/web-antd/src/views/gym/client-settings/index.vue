<script setup lang="ts">
import { Alert, Button, Checkbox, Form, FormItem, Input, Select, Space, Upload } from 'ant-design-vue';

import { openGymFile } from '#/api/gym';
import Page from '#/views/gym/components/admin-page.vue';
import FilterBar from '#/views/gym/components/filter-bar.vue';

import { title } from './data';
import { usePage } from './use-page';

const { stores, data, busy, load, upload, save, scopeFilter } = usePage();
</script>
<template>
  <div class="gym-view">
    <Page :title="title">
      <Alert type="info" message="当前仅管理展示资料，尚未提供小程序/App前台服务。" class="mb-4" />
      <FilterBar
        v-model="scopeFilter"
        :keyword="false"
        immediate
        :fields="[
          {
            key: 'platform',
            label: '展示平台',
            type: 'select',
            clearable: false,
            options: [
              { label: '小程序', value: 'miniapp' },
              { label: 'App', value: 'app' },
            ],
          },
          {
            key: 'storeId',
            label: '配置门店',
            type: 'select',
            placeholder: '总部默认配置',
            options: stores.map((s) => ({ label: s.name, value: s.id })),
          },
        ]"
        @search="load"
      />
      <Form layout="vertical">
        <FormItem label="展示名称">
          <Input v-model:value="data.systemName" />
        </FormItem>
        <FormItem label="应用ID">
          <Input v-model:value="data.appId" />
        </FormItem>
        <FormItem label="欢迎文字">
          <Input.TextArea v-model:value="data.welcomeText" />
        </FormItem>
        <FormItem label="客服信息">
          <Input v-model:value="data.customerService" />
        </FormItem>
        <FormItem label="App下载链接">
          <Input v-model:value="data.appDownloadUrl" />
        </FormItem>
        <FormItem label="封面">
          <Upload
            :before-upload="(file) => upload(file, data, 'coverFileId')"
            :show-upload-list="false"
            accept=".png,.jpg,.jpeg"
          >
            <Button>上传封面</Button>
          </Upload>
          <Button v-if="data.coverFileId" type="link" @click="openGymFile(data.coverFileId)"> 查看封面 </Button>
        </FormItem>
        <Checkbox v-model:checked="data.enabled">启用展示</Checkbox>
        <div v-for="(block, index) in data.blocks" :key="index" class="my-4">
          <Space wrap>
            <Select
              v-model:value="block.blockType"
              :options="[
                { label: '文字', value: 'text' },
                { label: '图片', value: 'banner' },
                { label: '视频', value: 'video' },
                { label: '链接', value: 'link' },
              ]"
              style="min-width: 120px"
            />
            <Input v-model:value="block.title" placeholder="标题" />
            <Checkbox v-model:checked="block.enabled"> 启用 </Checkbox>
            <Button @click="data.blocks.splice(index, 1)"> 移除区块 </Button>
          </Space>
          <Input.TextArea v-model:value="block.body" placeholder="内容" class="my-2" />
          <Input v-model:value="block.linkUrl" placeholder="跳转链接（链接区块必填）" />
          <Space class="my-2">
            <Upload
              :before-upload="(file) => upload(file, block, 'fileId')"
              :show-upload-list="false"
              accept=".png,.jpg,.jpeg,.mp4"
            >
              <Button>上传图片/视频</Button>
            </Upload>
            <Button v-if="block.fileId" @click="openGymFile(block.fileId)"> 查看媒体 </Button>
          </Space>
        </div>
        <Button
          class="my-3"
          @click="
            data.blocks.push({
              blockType: 'text',
              title: '',
              body: '',
              enabled: true,
            })
          "
        >
          增加内容区块
        </Button>
        <FormItem>
          <Button type="primary" :loading="busy" @click="save"> 保存配置 </Button>
        </FormItem>
      </Form>
    </Page>
  </div>
</template>
