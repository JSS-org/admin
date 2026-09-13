<script setup lang="ts">
import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { onMounted, ref, useTemplateRef } from 'vue';

import { Button, message, Table, Upload } from 'ant-design-vue';

import { canGym, gymApi, openGymFile, uploadGymFile } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns, fields, initial, prepare, title } from './data';

const data = ref<Record<string, any>>({ blocks: [], models: [] });

const busy = ref(false);

const page = useTemplateRef<ResourcePageHandle>('page');

const visible = ref(false);

const current = ref<GymRow>();

const registrations = ref<GymRow[]>([]);

const mode = ref('');

async function load() {
  busy.value = true;
  try {
    data.value = await gymApi.get('activities', undefined);
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

async function detail(row: GymRow) {
  current.value = row;
  mode.value = 'registrations';
  const result = await gymApi.list(`activities/${row.id}/registrations`, {
    pageSize: 100,
  });
  registrations.value = result.items;
  visible.value = true;
}

function cover(row: GymRow) {
  current.value = { ...row };
  mode.value = 'cover';
  visible.value = true;
}

async function saveCover() {
  if (current.value) {
    await gymApi.patch(`activities/${current.value.id}`, {
      coverFileId: current.value.coverFileId,
    });
    visible.value = false;
    await page.value?.load();
  }
}
</script>
<template>
  <div class="gym-view">
    <ResourcePage
      ref="page"
      :title="title"
      endpoint="activities"
      :fields="fields"
      :columns="columns"
      write-code="activities:manage"
      :create="true"
      :edit="true"
      :prepare="prepare"
      :initial="initial"
      :store-filter="true"
      time-filter
    >
      <template #actions="{ row, reload }">
        <Button type="link" @click="detail(row)">报名记录</Button>
        <template v-if="canGym('activities:manage')">
          <Button type="link" @click="cover(row)">封面</Button>
          <Button
            type="link"
            @click="
              async () => {
                await gymApi.patch(`activities/${row.id}`, {
                  status: 'published',
                });
                await reload();
              }
            "
          >
            发布
          </Button>
          <Button
            type="link"
            @click="
              async () => {
                await gymApi.patch(`activities/${row.id}`, {
                  status: 'cancelled',
                });
                await reload();
              }
            "
          >
            取消活动
          </Button>
        </template>
      </template>
    </ResourcePage>
    <AdminDrawer v-model:open="visible" title="活动资料" :footer="mode === 'cover' ? undefined : null" @ok="saveCover">
      <template v-if="mode === 'cover' && current">
        <Upload
          :before-upload="(file) => (current ? upload(file, current, 'coverFileId') : false)"
          :show-upload-list="false"
          accept=".png,.jpg,.jpeg"
        >
          <Button>上传活动封面</Button>
        </Upload>
        <Button v-if="current.coverFileId" type="link" @click="openGymFile(current.coverFileId)"> 查看封面 </Button>
      </template>
      <Table
        v-else
        :data-source="registrations"
        row-key="id"
        :columns="[
          { title: '会员', dataIndex: 'memberName' },
          { title: '门店', dataIndex: 'storeName' },
          { title: '状态', dataIndex: 'status' },
          { title: '报名时间', dataIndex: 'registeredAt' },
        ]"
      />
    </AdminDrawer>
  </div>
</template>
