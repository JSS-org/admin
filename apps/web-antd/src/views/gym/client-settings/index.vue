<script setup lang="ts">
import { Alert, Button, Card, Form, FormItem, Input, Segmented, Select, Skeleton, Tag } from 'ant-design-vue';

import Page from '#/views/gym/components/admin-page.vue';
import AdminSwitch from '#/views/gym/components/admin-switch.vue';
import ConfigActions from '#/views/gym/components/config-actions.vue';
import FileMedia from '#/views/gym/components/file-media.vue';
import FileUpload from '#/views/gym/components/file-upload.vue';
import RichContent from '#/views/gym/components/rich-content.vue';
import { gymIcons } from '#/views/gym/icons';

import { usePage } from './use-page';
const { stores, storeId, platform, data, busy, loading, saving, uploading, error, dirty, load, save, restore } =
  usePage();
</script>
<template>
  <div class="gym-view content-page">
    <Page auto-content-height title="展示配置" description="编排小程序与 App 的首页内容，预览当前草稿的展示效果。">
      <div class="content-scope">
        <Segmented
          v-model:value="platform"
          :options="[
            { label: '小程序', value: 'miniapp' },
            { label: 'App', value: 'app' },
          ]"
          :disabled="busy || dirty"
          @change="load"
        />
        <Select
          v-model:value="storeId"
          placeholder="总部默认配置"
          allow-clear
          show-search
          option-filter-prop="label"
          :options="stores.map((store) => ({ label: store.name, value: store.id }))"
          :disabled="busy || dirty"
          aria-label="展示配置门店"
          @change="load"
        />
        <Tag color="blue">{{ storeId ? '门店专属配置' : '总部默认配置' }}</Tag>
        <ConfigActions
          :dirty="dirty"
          :busy="busy"
          :saving="saving"
          :error="error"
          pending-hint="有未保存的更改，保存或还原后可切换平台和门店。"
          @restore="restore"
          @save="save"
        />
      </div>
      <Alert v-if="error" type="error" message="展示配置加载失败"
        ><template #action><Button @click="load">重试</Button></template></Alert
      >
      <Skeleton v-else-if="loading" active :paragraph="{ rows: 10 }" />
      <div v-else class="content-layout">
        <Form layout="vertical" :disabled="busy" class="content-editor gym-stack">
          <Card title="基础信息">
            <template #extra><AdminSwitch v-model:checked="data.enabled" label="启用展示" /></template>
            <div class="content-grid">
              <FormItem label="展示名称" required
                ><Input v-model:value="data.systemName" :maxlength="120" show-count
              /></FormItem>
              <FormItem :label="platform === 'miniapp' ? '小程序 AppID' : '应用 ID'"
                ><Input v-model:value="data.appId"
              /></FormItem>
            </div>
            <FormItem label="欢迎语"
              ><Input.TextArea v-model:value="data.welcomeText" :rows="2" :maxlength="2000" show-count
            /></FormItem>
            <FormItem label="客服信息"
              ><Input v-model:value="data.customerService" placeholder="例如：联系电话或客服微信"
            /></FormItem>
            <FormItem v-if="platform === 'app'" label="App 下载链接"
              ><Input v-model:value="data.appDownloadUrl" placeholder="https://"
            /></FormItem>
            <FormItem label="首页封面"
              ><FileUpload
                v-model="data.coverFileId"
                category="image"
                :store-id="storeId"
                :disabled="busy"
                title="上传首页封面"
                @uploading="uploading = $event"
            /></FormItem>
          </Card>
          <Card title="内容编排"
            ><RichContent
              v-model="data.contentHtml"
              :disabled="busy"
              :store-id="storeId"
              @uploading="uploading = $event"
          /></Card>
        </Form>
        <aside class="content-preview" aria-label="草稿展示预览">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-semibold">草稿预览</h2>
            <Tag>{{ platform === 'app' ? 'App' : '小程序' }}</Tag>
          </div>
          <div class="preview-device">
            <div class="preview-title">{{ data.systemName || '门店名称' }}</div>
            <div class="preview-scroll" tabindex="0" aria-label="草稿预览内容">
              <FileMedia v-if="data.coverFileId" :file-id="data.coverFileId" alt="首页封面" />
              <div v-else class="preview-hero">
                <component :is="gymIcons.appPreview" class="size-9" /><span>门店首页</span>
              </div>
              <div class="preview-content">
                <h3>{{ data.welcomeText || '欢迎来到门店' }}</h3>
                <Tag v-if="!data.enabled">展示已关闭</Tag>
                <RichContent :model-value="data.contentHtml" :editable="false" />
                <p v-if="data.customerService" class="mt-6 text-xs text-muted-foreground">{{ data.customerService }}</p>
              </div>
            </div>
          </div>
          <p class="mt-3 text-xs leading-5 text-muted-foreground">
            这里预览当前编辑内容，保存后更新配置；实际前台展示以接入端为准。
          </p>
        </aside>
      </div>
    </Page>
  </div>
</template>
<style scoped>
.content-page {
  height: 100%;
}

.content-page :deep(.gym-page-content) {
  overflow: hidden;
}

.content-scope {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gym-space-field);
  align-items: center;
}

.content-scope :deep(.ant-select) {
  min-width: 240px;
}

.content-layout {
  display: grid;
  flex: 1;
  grid-template-rows: minmax(0, 1fr);
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--gym-space-block);
  min-height: 0;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: var(--gym-space-field);
}

.content-grid > :deep(.ant-form-item) {
  margin-bottom: 0;
}

.content-editor {
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.content-editor :deep(.ant-select) {
  width: 100%;
}

.content-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.preview-device {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border: 6px solid hsl(var(--border));
  border-radius: 28px;
  box-shadow: 0 12px 36px hsl(var(--foreground) / 6%);
}

.preview-title {
  flex-shrink: 0;
  padding: 18px;
  font-weight: 600;
  text-align: center;
}

.preview-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.preview-hero {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 32px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}

.preview-content {
  padding: 20px;
}

.preview-content h3 {
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

@media (width <= 1100px) {
  .content-layout {
    grid-template-rows: auto auto;
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .content-editor {
    height: auto;
    overflow: visible;
  }

  .content-preview {
    width: min(100%, 390px);
    height: min(700px, 80dvh);
    margin-inline: auto;
  }
}
</style>
