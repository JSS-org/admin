<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { computed, onScopeDispose, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Image,
  message,
  Space,
  Table,
  TabPane,
  Tabs,
  Tag,
  Upload,
} from 'ant-design-vue';

import { canGym, getGymFileUrl, gymApi, openGymFile, uploadGymFile } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import EntityRecords from '#/views/gym/components/entity-records.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';
import TableAction from '#/views/gym/components/table-action.vue';

import { columns, fields } from './data';

const selected = ref<GymRow>();

const media = ref<GymRow[]>([]);

const visible = ref(false);

const busy = ref(false);
const previewFailed = ref(false);
const previewLoading = ref(false);
const activeTab = ref('overview');
const urls = ref<Record<string, string>>({});
let request = 0;
let detailRequest = 0;
const cover = computed(
  () => media.value.find((item) => item.isCover) ?? media.value.find((item) => item.category === 'image'),
);
const mapUrl = computed(
  () =>
    `https://uri.amap.com/search?keyword=${encodeURIComponent(selected.value?.address ?? '')}&view=map&src=jss-admin&callnative=0`,
);
function releasePreviews() {
  Object.values(urls.value).forEach((url) => URL.revokeObjectURL(url));
  urls.value = {};
}
onScopeDispose(() => {
  request++;
  detailRequest++;
  releasePreviews();
});
async function previews() {
  const current = ++request;
  releasePreviews();
  previewFailed.value = false;
  previewLoading.value = false;
  if (!canGym('files:read')) return;
  previewLoading.value = true;
  const results = await Promise.allSettled(
    media.value.map(async (item) => {
      const url = await getGymFileUrl(item.fileId);
      if (current === request) urls.value[item.fileId] = url;
      else URL.revokeObjectURL(url);
    }),
  );
  if (current === request) {
    previewFailed.value = results.some((result) => result.status === 'rejected');
    previewLoading.value = false;
  }
}

function prepare(values: Record<string, any>) {
  const { opens, closes, ...data } = values;
  return {
    ...data,
    businessHours: { opens, closes },
  };
}

function initial(row: GymRow) {
  return {
    ...row,
    opens: row.businessHours.opens,
    closes: row.businessHours.closes,
  };
}

async function showMedia(row: GymRow) {
  if (busy.value) return;
  const current = ++detailRequest;
  const result = await gymApi.get(`stores/${row.id}`);
  if (current !== detailRequest) return;
  activeTab.value = 'overview';
  media.value = result.media;
  selected.value = result;
  visible.value = true;
  await previews();
}

async function saveMedia(next: GymRow[], storeId: string) {
  await gymApi.put(`stores/${storeId}/media`, {
    items: next.map((r, i) => ({
      fileId: r.fileId,
      caption: r.caption ?? '',
      isCover: !!r.isCover,
      sortOrder: i,
    })),
  });
  const result = await gymApi.get(`stores/${storeId}`);
  if (selected.value?.id !== storeId) return;
  media.value = result.media;
  selected.value = result;
  await previews();
}

async function changeMedia(next: GymRow[]) {
  if (busy.value || !selected.value) return;
  busy.value = true;
  detailRequest++;
  try {
    await saveMedia(next, selected.value.id);
    message.success('门店展示已更新');
  } finally {
    busy.value = false;
  }
}

async function upload(file: File) {
  if (busy.value || !selected.value) return false;
  const storeId = selected.value.id;
  detailRequest++;
  busy.value = true;
  try {
    const result = await uploadGymFile(file, file.type.startsWith('video/') ? 'video' : 'image', storeId);
    await saveMedia([...media.value, { ...result, fileId: result.id, isCover: media.value.length === 0 }], storeId);
    message.success('已上传');
  } finally {
    busy.value = false;
  }
  return false;
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      title="门店资料"
      endpoint="stores"
      :fields="fields"
      :columns="columns"
      write-code="stores:write"
      :prepare="prepare"
      :initial="initial"
      detail
      @detail="showMedia"
    />
    <AdminDrawer
      v-model:open="visible"
      :title="selected?.name ?? '门店详情'"
      :footer="null"
      :width="900"
      :confirm-loading="busy"
    >
      <Alert v-if="previewFailed" type="warning" show-icon message="部分媒体加载失败" class="mb-4">
        <template #action><Button size="small" :loading="previewLoading" @click="previews">重新加载</Button></template>
      </Alert>
      <div class="store-cover">
        <Image
          v-if="cover?.category === 'image' && urls[cover.fileId]"
          :src="urls[cover.fileId]"
          :alt="`${selected?.name}封面`"
          :preview="false"
          class="cursor-pointer"
          @click="openGymFile(cover.fileId)"
        />
        <video
          v-else-if="cover?.category === 'video' && urls[cover.fileId]"
          :src="urls[cover.fileId]"
          class="cursor-pointer"
          muted
          @click="openGymFile(cover.fileId)"
          preload="metadata"
        ></video>
        <div v-else class="store-cover-placeholder">
          <IconifyIcon icon="lucide:building-2" class="size-12" /><span>门店环境展示</span
          ><span class="text-xs">上传门店环境照片，展示真实到店体验</span>
        </div>
      </div>
      <div class="store-heading">
        <div>
          <h2>{{ selected?.name }}</h2>
          <p>{{ selected?.code }} · {{ selected?.areaSqm }} ㎡</p>
        </div>
        <Tag :color="selected?.status === 'active' ? 'success' : undefined">{{
          selected?.status === 'active' ? '启用' : '已停用'
        }}</Tag>
      </div>
      <Tabs v-model:active-key="activeTab" class="store-detail-tabs">
        <TabPane key="overview" tab="门店概览">
          <div class="gym-stack">
            <p class="leading-7 text-muted-foreground">{{ selected?.description || '暂未填写门店介绍' }}</p>
            <div v-if="selected?.features?.length" class="flex flex-wrap gap-2">
              <Tag v-for="feature in selected?.features" :key="feature" color="blue">{{ feature }}</Tag>
            </div>
            <Descriptions bordered :column="1">
              <DescriptionsItem label="门店位置"
                ><div class="flex items-start gap-3">
                  <IconifyIcon icon="lucide:map-pin" class="size-5 shrink-0 text-primary" />
                  <div>
                    <p>{{ selected?.address || '暂未填写地址' }}</p>
                    <a v-if="selected?.address" :href="mapUrl" target="_blank" rel="noopener noreferrer"
                      >高德地图查看位置</a
                    >
                  </div>
                </div></DescriptionsItem
              >
              <DescriptionsItem label="位置坐标"
                >{{ selected?.longitude ?? '—' }}，{{ selected?.latitude ?? '—' }}</DescriptionsItem
              >
              <DescriptionsItem label="营业时间"
                >{{ selected?.businessHours?.opens ?? '—' }} –
                {{ selected?.businessHours?.closes ?? '—' }}</DescriptionsItem
              >
              <DescriptionsItem label="联系电话">{{ selected?.servicePhone || '—' }}</DescriptionsItem>
              <DescriptionsItem label="客服微信">{{ selected?.serviceWechat || '—' }}</DescriptionsItem>
            </Descriptions>
          </div>
        </TabPane>
        <TabPane key="media" tab="环境照片与视频">
          <div class="gym-stack">
            <Upload
              v-if="canGym('stores:write') && canGym('files:upload')"
              :before-upload="upload"
              :disabled="busy"
              :show-upload-list="false"
              accept="image/png,image/jpeg,video/mp4"
            >
              <Button :loading="busy">上传图片或视频</Button>
            </Upload>
            <Table
              :data-source="media"
              :loading="busy"
              row-key="fileId"
              :pagination="false"
              :columns="[
                { title: '预览', dataIndex: 'preview', width: 100 },
                { title: '文件', dataIndex: 'name' },
                { title: '封面', dataIndex: 'isCover' },
                { title: '操作', dataIndex: '_actions' },
              ]"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'preview'">
                  <Image
                    v-if="record.category === 'image' && urls[record.fileId]"
                    :src="urls[record.fileId]"
                    :width="72"
                    :height="52"
                    :preview="false"
                    class="store-thumbnail"
                    @click="openGymFile(record.fileId)"
                  />
                  <Tag v-else>{{ record.category === 'video' ? '视频' : '图片' }}</Tag>
                </template>
                <span v-if="column.dataIndex === 'isCover'">{{ record.isCover ? '是' : '否' }}</span>
                <Space v-if="column.dataIndex === '_actions'">
                  <TableAction action="preview" v-if="canGym('files:read')" @click="openGymFile(record.fileId)" />
                  <TableAction
                    action="setCover"
                    v-if="canGym('stores:write')"
                    :disabled="busy || record.isCover"
                    @click="
                      changeMedia(
                        media.map((m) => ({
                          ...m,
                          isCover: m.fileId === record.fileId,
                        })),
                      )
                    "
                  />
                  <TableAction
                    action="remove"
                    v-if="canGym('stores:write')"
                    danger
                    :disabled="busy"
                    @click="changeMedia(media.filter((m) => m.fileId !== record.fileId))"
                  />
                </Space>
              </template>
            </Table>
          </div>
        </TabPane>
        <TabPane v-if="selected && canGym('employees:read')" key="employees" tab="本店员工"
          ><EntityRecords
            endpoint="employees"
            :params="{ storeId: selected.id }"
            :columns="[
              { title: '工号', dataIndex: 'employeeNo' },
              { title: '姓名', dataIndex: 'name' },
              { title: '职位', dataIndex: 'jobTitle' },
              { title: '联系电话', dataIndex: 'phone' },
              { title: '状态', dataIndex: 'status' },
            ]"
        /></TabPane>
      </Tabs>
    </AdminDrawer>
  </div>
</template>

<style scoped>
.store-detail-tabs :deep(.ant-descriptions-view > table) {
  min-width: 0;
}

.store-detail-tabs :deep(.store-thumbnail) {
  object-fit: cover;
  border-radius: 6px;
}

.store-cover {
  overflow: hidden;
  background: hsl(var(--muted));
  border-radius: 12px;
}

.store-cover :deep(.ant-image),
.store-cover video {
  width: 100%;
}

.store-cover :deep(img),
.store-cover video {
  width: 100%;
  height: 260px;
  object-fit: cover;
}

.store-cover-placeholder {
  display: flex;
  flex-direction: column;
  gap: var(--gym-space-action);
  align-items: center;
  justify-content: center;
  height: 220px;
  color: hsl(var(--primary));
  background: linear-gradient(130deg, hsl(var(--primary) / 12%), hsl(var(--card)));
}

.store-heading {
  display: flex;
  gap: var(--gym-space-field);
  align-items: center;
  justify-content: space-between;
}

.store-heading h2 {
  font-size: 24px;
  font-weight: 600;
}

.store-heading p {
  margin-top: 4px;
  color: hsl(var(--muted-foreground));
}
</style>
