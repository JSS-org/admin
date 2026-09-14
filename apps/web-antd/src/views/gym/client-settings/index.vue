<script setup lang="ts">
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Card,
  Collapse,
  CollapsePanel,
  Empty,
  Form,
  FormItem,
  Input,
  Segmented,
  Select,
  Skeleton,
  Switch,
  Tag,
} from 'ant-design-vue';

import Page from '#/views/gym/components/admin-page.vue';
import FileMedia from '#/views/gym/components/file-media.vue';
import FileUpload from '#/views/gym/components/file-upload.vue';

import { usePage } from './use-page';
const {
  stores,
  storeId,
  platform,
  data,
  busy,
  loading,
  saving,
  uploading,
  error,
  dirty,
  activeBlocks,
  load,
  save,
  restore,
  addBlock,
  moveBlock,
} = usePage();
const blockTypes = [
  { label: '文字', value: 'text', icon: 'lucide:type' },
  { label: '图片', value: 'banner', icon: 'lucide:image' },
  { label: '视频', value: 'video', icon: 'lucide:video' },
  { label: '链接', value: 'link', icon: 'lucide:link' },
];
const visibleBlocks = computed(() => data.value.blocks.filter((block: any) => block.enabled));
function changeType(block: Record<string, any>) {
  block.fileId = null;
  block.body = '';
  block.linkUrl = '';
}
</script>
<template>
  <div class="gym-view">
    <Page title="展示配置" description="编排小程序与 App 的首页内容，预览当前草稿的展示效果。">
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
      </div>
      <Alert v-if="dirty" type="info" show-icon message="有未保存的更改，保存或还原后可切换平台和门店。" />
      <Alert v-if="error" type="error" message="展示配置加载失败"
        ><template #action><Button @click="load">重试</Button></template></Alert
      >
      <Skeleton v-else-if="loading" active :paragraph="{ rows: 10 }" />
      <div v-else class="content-layout">
        <Form layout="vertical" :disabled="busy" class="content-editor">
          <Card title="基础信息">
            <template #extra
              ><Switch
                v-model:checked="data.enabled"
                checked-children="已启用"
                un-checked-children="已关闭"
                aria-label="展示开关"
            /></template>
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
          <Card title="内容编排" class="mt-5">
            <template #extra
              ><span class="text-sm text-muted-foreground">{{ data.blocks.length }}/50 个区块</span></template
            >
            <div class="block-types">
              <Button
                v-for="type in blockTypes"
                :key="type.value"
                :disabled="busy || data.blocks.length >= 50"
                @click="addBlock(type.value)"
                ><span class="flex items-center gap-2"
                  ><IconifyIcon :icon="type.icon" class="size-4" />添加{{ type.label }}</span
                ></Button
              >
            </div>
            <Empty v-if="data.blocks.length === 0" class="my-6" description="选择一种内容开始编排，右侧同步预览。" />
            <Collapse v-else v-model:active-key="activeBlocks" class="mt-5">
              <CollapsePanel
                v-for="(block, index) in data.blocks"
                :key="block.key"
                :header="`${Number(index) + 1}. ${block.title || `${blockTypes.find((type) => type.value === block.blockType)?.label}区块`}`"
              >
                <template #extra
                  ><Tag :color="block.enabled ? 'blue' : undefined">{{
                    block.enabled ? '展示中' : '已隐藏'
                  }}</Tag></template
                >
                <div class="content-grid">
                  <FormItem label="区块类型"
                    ><Select v-model:value="block.blockType" :options="blockTypes" @change="changeType(block)"
                  /></FormItem>
                  <FormItem label="区块标题"><Input v-model:value="block.title" :maxlength="120" /></FormItem>
                </div>
                <FormItem v-if="block.blockType === 'text'" label="正文" required
                  ><Input.TextArea v-model:value="block.body" :rows="5" :maxlength="5000" show-count
                /></FormItem>
                <FormItem v-else-if="block.blockType === 'link'" label="跳转链接" required
                  ><Input v-model:value="block.linkUrl" placeholder="https://"
                /></FormItem>
                <FormItem v-else :label="block.blockType === 'video' ? '视频文件' : '展示图片'" required
                  ><FileUpload
                    v-model="block.fileId"
                    :category="block.blockType === 'video' ? 'video' : 'image'"
                    :store-id="storeId"
                    :disabled="busy"
                    @uploading="uploading = $event"
                /></FormItem>
                <div class="block-actions">
                  <Switch v-model:checked="block.enabled" checked-children="显示区块" un-checked-children="隐藏区块" />
                  <div class="flex flex-wrap gap-2">
                    <Button :disabled="busy || index === 0" @click="moveBlock(Number(index), -1)">上移</Button
                    ><Button :disabled="busy || index === data.blocks.length - 1" @click="moveBlock(Number(index), 1)"
                      >下移</Button
                    ><Button danger @click="data.blocks.splice(index, 1)">移除</Button>
                  </div>
                </div>
              </CollapsePanel>
            </Collapse>
          </Card>
        </Form>
        <aside class="content-preview" aria-label="草稿展示预览">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-semibold">草稿预览</h2>
            <Tag>{{ platform === 'app' ? 'App' : '小程序' }}</Tag>
          </div>
          <div class="preview-device">
            <div class="preview-title">{{ data.systemName || '门店名称' }}</div>
            <FileMedia v-if="data.coverFileId" :file-id="data.coverFileId" alt="首页封面" />
            <div v-else class="preview-hero">
              <IconifyIcon icon="lucide:activity" class="size-9" /><span>门店首页</span>
            </div>
            <div class="preview-content">
              <h3>{{ data.welcomeText || '欢迎来到门店' }}</h3>
              <Tag v-if="!data.enabled">展示已关闭</Tag>
              <section v-for="block in visibleBlocks" :key="block.key" class="preview-block">
                <h4 v-if="block.title">{{ block.title }}</h4>
                <p v-if="block.blockType === 'text'" class="whitespace-pre-wrap">{{ block.body || '正文内容' }}</p>
                <FileMedia
                  v-else-if="block.blockType === 'banner' || block.blockType === 'video'"
                  :file-id="block.fileId"
                  :kind="block.blockType === 'video' ? 'video' : 'image'"
                  :alt="block.blockType === 'video' ? '待上传视频' : '待上传图片'"
                />
                <div v-else class="preview-link">
                  <IconifyIcon icon="lucide:external-link" class="size-4 shrink-0" /><span>{{
                    block.linkUrl || '待填写链接'
                  }}</span>
                </div>
              </section>
              <p v-if="data.customerService" class="mt-6 text-xs text-muted-foreground">{{ data.customerService }}</p>
            </div>
          </div>
          <p class="mt-3 text-xs leading-5 text-muted-foreground">
            这里预览当前编辑内容，保存后更新配置；实际前台展示以接入端为准。
          </p>
        </aside>
      </div>
      <div v-if="!loading && !error" class="gym-save-bar">
        <span>{{ dirty ? '更改尚未保存' : '当前配置已同步' }}</span>
        <div class="flex gap-3">
          <Button :disabled="busy || !dirty" @click="restore">还原更改</Button
          ><Button type="primary" :loading="saving" :disabled="busy || !dirty" @click="save">保存配置</Button>
        </div>
      </div>
    </Page>
  </div>
</template>
<style scoped>
.content-scope {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.content-scope :deep(.ant-select) {
  min-width: 240px;
}

.content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 28px;
  align-items: start;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
  gap: 20px;
}

.content-editor {
  min-width: 0;
}

.content-editor :deep(.ant-select) {
  width: 100%;
}

.block-types,
.block-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.block-actions {
  align-items: center;
  justify-content: space-between;
}

.content-preview {
  position: sticky;
  top: 20px;
  min-width: 0;
}

.preview-device {
  overflow: hidden;
  background: hsl(var(--card));
  border: 6px solid hsl(var(--border));
  border-radius: 28px;
  box-shadow: 0 12px 36px hsl(var(--foreground) / 6%);
}

.preview-title {
  padding: 18px;
  font-weight: 600;
  text-align: center;
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

.preview-block {
  padding-block: 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.preview-block h4 {
  margin-bottom: 10px;
  font-weight: 600;
}

.preview-block p {
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.preview-link {
  display: flex;
  gap: 8px;
  align-items: center;
  color: hsl(var(--primary));
  overflow-wrap: anywhere;
}

@media (width <= 1100px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .content-preview {
    position: static;
    width: min(100%, 390px);
    margin-inline: auto;
  }
}
</style>
