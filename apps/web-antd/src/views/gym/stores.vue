<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import { ref } from 'vue';

import { Button, message, Space, Table, Upload } from 'ant-design-vue';

import { canGym, gymApi, openGymFile, uploadGymFile } from '#/api/gym';

import AdminDrawer from './components/admin-drawer.vue';
import ResourcePage from './components/resource-page.vue';
const fields: Field[] = [
  { key: 'code', label: '门店编码', required: true },
  { key: 'name', label: '门店名称', required: true },
  { key: 'description', label: '简介', type: 'textarea', default: '' },
  {
    key: 'areaSqm',
    label: '面积（平方米）',
    type: 'money',
    required: true,
    default: '0.00',
  },
  { key: 'featureText', label: '特色项目（用逗号分隔）' },
  { key: 'address', label: '详细地址', required: true },
  { key: 'longitude', label: '经度' },
  { key: 'latitude', label: '纬度' },
  { key: 'servicePhone', label: '客服电话' },
  { key: 'serviceWechat', label: '客服微信' },
  {
    key: 'opens',
    label: '营业开始（HH:mm）',
    default: '06:00',
    required: true,
  },
  {
    key: 'closes',
    label: '营业结束（HH:mm）',
    default: '23:00',
    required: true,
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    default: 'active',
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'inactive' },
    ],
  },
];
const selected = ref<GymRow>();
const media = ref<GymRow[]>([]);
const visible = ref(false);
const busy = ref(false);
function prepare(values: Record<string, any>) {
  const { featureText, opens, closes, ...data } = values;
  return {
    ...data,
    features: String(featureText ?? '')
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
    businessHours: { opens, closes },
  };
}
function initial(row: GymRow) {
  return {
    ...row,
    featureText: row.features.join('，'),
    opens: row.businessHours.opens,
    closes: row.businessHours.closes,
  };
}
async function showMedia(row: GymRow) {
  selected.value = row;
  const result = await gymApi.get(`stores/${row.id}`);
  media.value = result.media;
  visible.value = true;
}
async function saveMedia(next: GymRow[]) {
  if (!selected.value) return;
  await gymApi.put(`stores/${selected.value.id}/media`, {
    items: next.map((r, i) => ({
      fileId: r.fileId,
      caption: r.caption ?? '',
      isCover: !!r.isCover,
      sortOrder: i,
    })),
  });
  const result = await gymApi.get(`stores/${selected.value.id}`);
  media.value = result.media;
}
async function upload(file: File) {
  if (!selected.value) return false;
  busy.value = true;
  try {
    const result = await uploadGymFile(file, file.type.startsWith('video/') ? 'video' : 'image', selected.value.id);
    await saveMedia([...media.value, { ...result, fileId: result.id, isCover: media.value.length === 0 }]);
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
      :columns="[
        { title: '编码', dataIndex: 'code' },
        { title: '名称', dataIndex: 'name' },
        { title: '面积', dataIndex: 'areaSqm' },
        { title: '地址', dataIndex: 'address' },
        { title: '客服', dataIndex: 'servicePhone' },
        { title: '状态', dataIndex: 'status' },
      ]"
      write-code="stores:write"
      :prepare="prepare"
      :initial="initial"
    >
      <template #actions="{ row }">
        <Button type="link" @click="showMedia(row)"> 环境照片/视频 </Button>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" :title="`${selected?.name} 环境媒体`" :footer="null" :width="720">
      <Upload
        v-if="canGym('stores:write')"
        :before-upload="upload"
        :show-upload-list="false"
        accept="image/png,image/jpeg,video/mp4"
      >
        <Button :loading="busy">上传图片或视频</Button>
      </Upload>
      <Table
        :data-source="media"
        row-key="fileId"
        :pagination="false"
        :columns="[
          { title: '文件', dataIndex: 'name' },
          { title: '封面', dataIndex: 'isCover' },
          { title: '操作', dataIndex: '_actions' },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <span v-if="column.dataIndex === 'isCover'">{{ record.isCover ? '是' : '否' }}</span>
          <Space v-if="column.dataIndex === '_actions'">
            <Button type="link" @click="openGymFile(record.fileId)">查看</Button
            ><Button
              v-if="canGym('stores:write')"
              type="link"
              @click="
                saveMedia(
                  media.map((m) => ({
                    ...m,
                    isCover: m.fileId === record.fileId,
                  })),
                )
              "
            >
              设为封面 </Button
            ><Button
              v-if="canGym('stores:write')"
              danger
              type="link"
              @click="saveMedia(media.filter((m) => m.fileId !== record.fileId))"
            >
              移除
            </Button>
          </Space>
        </template>
      </Table>
    </AdminDrawer>
  </div>
</template>
