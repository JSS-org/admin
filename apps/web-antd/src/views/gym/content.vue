<script setup lang="ts">
import type { Field } from './components/resource-page.vue';

import type { GymRow } from '#/api/gym';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Upload,
} from 'ant-design-vue';

import { canGym, gymApi, openGymFile, uploadGymFile } from '#/api/gym';

import ResourcePage from './components/resource-page.vue';

const props = defineProps<{ resource: string }>();
const title = computed(
  () =>
    ({
      'client-settings': '小程序 / App 展示配置',
      'franchise-brand': '加盟品牌与模型',
      activities: '门店活动',
      'franchise-inquiries': '加盟咨询',
      reviews: '门店评价',
      feedback: '匿名反馈',
    })[props.resource] ?? '内容',
);
const isSettings = computed(() =>
  ['client-settings', 'franchise-brand'].includes(props.resource),
);
const fields = computed<Field[]>(() => {
  if (props.resource === 'franchise-inquiries')
    return [
      {
        key: 'status',
        label: '处理状态',
        type: 'select',
        options: [
          { label: '新咨询', value: 'new' },
          { label: '已联系', value: 'contacted' },
          { label: '已结束', value: 'closed' },
        ],
        required: true,
      },
    ];
  if (props.resource !== 'activities') return [];
  return [
    { key: 'name', label: '活动名称', required: true },
    { key: 'description', label: '活动介绍', type: 'textarea', required: true },
    {
      key: 'storeIds',
      label: '活动门店',
      type: 'multi',
      source: 'stores',
      required: true,
    },
    {
      key: 'registrationStartsAt',
      label: '报名开始',
      type: 'datetime',
      required: true,
    },
    {
      key: 'registrationEndsAt',
      label: '报名结束',
      type: 'datetime',
      required: true,
    },
    { key: 'startsAt', label: '活动开始', type: 'datetime', required: true },
    { key: 'endsAt', label: '活动结束', type: 'datetime', required: true },
    { key: 'capacity', label: '名额（空为不限）', type: 'number' },
  ];
});
const columns = computed(() => {
  let values = [
    ['门店', 'storeName'],
    ['平台', 'platform'],
    ['内容', 'content'],
    ['时间', 'submittedAt'],
  ];
  if (props.resource === 'activities')
    values = [
      ['名称', 'name'],
      ['门店', 'storeNames'],
      ['名额', 'capacity'],
      ['报名人数', 'registrationCount'],
      ['开始时间', 'startsAt'],
      ['状态', 'status'],
    ];
  if (props.resource === 'franchise-inquiries')
    values = [
      ['联系人', 'contactName'],
      ['电话', 'phone'],
      ['意向城市', 'preferredCity'],
      ['咨询内容', 'message'],
      ['状态', 'status'],
      ['收到时间', 'receivedAt'],
    ];
  if (props.resource === 'reviews')
    values.splice(
      2,
      0,
      ['评分', 'rating'],
      ['匿名', 'anonymous'],
      ['评价会员', 'memberName'],
    );
  return values.map(([title = '', dataIndex = '']) => ({ title, dataIndex }));
});
function prepare(values: Record<string, any>) {
  const result = { ...values };
  for (const key of [
    'registrationStartsAt',
    'registrationEndsAt',
    'startsAt',
    'endsAt',
  ])
    if (result[key]) result[key] = new Date(result[key]).toISOString();
  return result;
}
function initial(row: GymRow) {
  const result = { ...row };
  for (const key of [
    'registrationStartsAt',
    'registrationEndsAt',
    'startsAt',
    'endsAt',
  ])
    if (result[key]) {
      const time = new Date(result[key]);
      result[key] = new Date(time.getTime() - time.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
    }
  return result;
}
const stores = ref<GymRow[]>([]);
const storeId = ref<string>();
const platform = ref('miniapp');
const data = ref<Record<string, any>>({ blocks: [], models: [] });
const busy = ref(false);
const page = ref();
const visible = ref(false);
const current = ref<GymRow>();
const registrations = ref<GymRow[]>([]);
const mode = ref('');
const summary = ref<GymRow>();
async function load() {
  busy.value = true;
  try {
    data.value = await gymApi.get(
      props.resource,
      props.resource === 'client-settings'
        ? { platform: platform.value, storeId: storeId.value }
        : undefined,
    );
  } finally {
    busy.value = false;
  }
}
onMounted(async () => {
  if (isSettings.value) {
    if (props.resource === 'client-settings') {
      let n = 1;
      for (;;) {
        const result = await gymApi.list('stores', {
          page: n++,
          pageSize: 100,
        });
        stores.value.push(...result.items);
        if (stores.value.length >= result.total || result.items.length === 0)
          break;
      }
    }
    await load();
  }
  if (['feedback', 'reviews'].includes(props.resource))
    summary.value = await gymApi.get('reports/feedback');
});
async function upload(
  file: File,
  target: Record<string, any>,
  key: string,
  list = false,
) {
  busy.value = true;
  try {
    const result = await uploadGymFile(
      file,
      file.type.startsWith('video/') ? 'video' : 'image',
      props.resource === 'client-settings' ? storeId.value : undefined,
    );
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
    if (props.resource === 'client-settings') {
      for (const key of [
        'appId',
        'systemName',
        'coverFileId',
        'welcomeText',
        'customerService',
        'appDownloadUrl',
        'enabled',
      ])
        body[key] = data.value[key];
      body.platform = platform.value;
      body.storeId = storeId.value;
      body.blocks = data.value.blocks.map((b: GymRow, index: number) => ({
        blockType: b.blockType,
        title: b.title,
        body: b.body,
        fileId: b.fileId,
        linkUrl: b.linkUrl,
        sortOrder: index,
        enabled: b.enabled,
      }));
    } else {
      for (const key of [
        'name',
        'introduction',
        'contactPhone',
        'logoFileId',
        'status',
      ])
        body[key] = data.value[key];
      body.models = data.value.models.map((m: GymRow) => ({
        modelCode: m.modelCode,
        name: m.name,
        description: m.description,
        areaSqm: m.areaSqm,
        investmentDescription: m.investmentDescription,
        fileIds: m.fileIds,
      }));
    }
    await gymApi.put(props.resource, body);
    message.success('配置已保存');
    await load();
  } finally {
    busy.value = false;
  }
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
  <Page v-if="isSettings" :title="title">
    <Alert
      type="info"
      message="当前仅管理展示资料，尚未提供小程序/App前台服务。"
      class="mb-4"
    />
    <Space v-if="resource === 'client-settings'" class="mb-4">
      <Select
        v-model:value="platform"
        :options="[
          { label: '小程序', value: 'miniapp' },
          { label: 'App', value: 'app' },
        ]"
        style="min-width: 120px"
        @change="load"
      /><Select
        v-model:value="storeId"
        :options="stores.map((s) => ({ label: s.name, value: s.id }))"
        placeholder="总部默认配置"
        allow-clear
        style="min-width: 220px"
        @change="load"
      />
    </Space>
    <Form layout="vertical">
      <template v-if="resource === 'client-settings'">
        <FormItem label="展示名称">
          <Input v-model:value="data.systemName" />
</FormItem><FormItem label="应用ID"><Input v-model:value="data.appId" /></FormItem><FormItem label="欢迎文字">
          <Input.TextArea v-model:value="data.welcomeText" />
</FormItem><FormItem label="客服信息">
          <Input v-model:value="data.customerService" />
</FormItem><FormItem label="App下载链接">
          <Input v-model:value="data.appDownloadUrl" />
</FormItem><FormItem label="封面">
          <Upload
            :before-upload="(file) => upload(file, data, 'coverFileId')"
            :show-upload-list="false"
            accept=".png,.jpg,.jpeg"
          >
            <Button>上传封面</Button>
</Upload><Button
            v-if="data.coverFileId"
            type="link"
            @click="openGymFile(data.coverFileId)"
          >
            查看封面
          </Button>
</FormItem><Checkbox v-model:checked="data.enabled">启用展示</Checkbox>
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
            /><Input v-model:value="block.title" placeholder="标题" /><Checkbox
              v-model:checked="block.enabled"
            >
              启用
</Checkbox><Button @click="data.blocks.splice(index, 1)">
              移除区块
            </Button>
</Space><Input.TextArea
            v-model:value="block.body"
            placeholder="内容"
            class="my-2"
          /><Input
            v-model:value="block.linkUrl"
            placeholder="跳转链接（链接区块必填）"
          /><Space class="my-2">
            <Upload
              :before-upload="(file) => upload(file, block, 'fileId')"
              :show-upload-list="false"
              accept=".png,.jpg,.jpeg,.mp4"
            >
              <Button>上传图片/视频</Button>
</Upload><Button v-if="block.fileId" @click="openGymFile(block.fileId)">
              查看媒体
            </Button>
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
      </template>
      <template v-else>
        <FormItem label="品牌名称"><Input v-model:value="data.name" /></FormItem><FormItem label="品牌介绍">
          <Input.TextArea v-model:value="data.introduction" />
</FormItem><FormItem label="联系电话">
          <Input v-model:value="data.contactPhone" />
</FormItem><FormItem label="发布状态">
          <Select
            v-model:value="data.status"
            :options="[
              { label: '草稿', value: 'draft' },
              { label: '发布（三种模型均需图片/视频）', value: 'published' },
            ]"
          />
</FormItem><FormItem label="品牌标志">
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
</FormItem><FormItem label="模型名称">
              <Input v-model:value="model.name" />
</FormItem><FormItem label="面积（㎡）">
              <Input v-model:value="model.areaSqm" />
</FormItem><Button @click="data.models.splice(index, 1)">
              移除模型
            </Button>
</Space><FormItem label="模型说明">
            <Input.TextArea v-model:value="model.description" />
</FormItem><FormItem label="投资说明">
            <Input.TextArea
              v-model:value="model.investmentDescription"
            />
</FormItem><Upload
            :before-upload="(file) => upload(file, model, 'fileIds', true)"
            :show-upload-list="false"
            accept=".png,.jpg,.jpeg,.mp4"
          >
            <Button>上传立体图 / 视频</Button>
</Upload><Space
            v-for="(fileId, fileIndex) in model.fileIds"
            :key="fileId"
            class="my-2"
          >
            <Button type="link" @click="openGymFile(fileId)">
              视图 {{ Number(fileIndex) + 1 }}
</Button><Button @click="model.fileIds.splice(fileIndex, 1)"> 移除 </Button>
          </Space>
        </div>
        <Button
          v-if="data.models.length < 3"
          class="my-3"
          @click="data.models.push({ modelCode: '', name: '', fileIds: [] })"
        >
          增加模型
        </Button>
      </template>
      <FormItem>
        <Button type="primary" :loading="busy" @click="save"> 保存配置 </Button>
      </FormItem>
    </Form>
  </Page>
  <ResourcePage
    v-else
    ref="page"
    :key="resource"
    :title="title"
    :endpoint="resource"
    :fields="fields"
    :columns="columns"
    :write-code="
      resource === 'activities'
        ? 'activities:manage'
        : resource === 'franchise-inquiries'
          ? 'franchise:manage'
          : undefined
    "
    :create="resource === 'activities'"
    :edit="['activities', 'franchise-inquiries'].includes(resource)"
    :prepare="prepare"
    :initial="initial"
    :store-filter="resource !== 'franchise-inquiries'"
    time-filter
  >
    <template #summary>
      <Alert
        v-if="summary"
        type="info"
        class="mb-4"
        :message="`授权门店全部评价 ${summary.reviewCount} 条，平均 ${summary.averageRating} 分，匿名反馈 ${summary.feedbackCount} 条`"
      />
    </template>
    <template #actions="{ row, reload }">
      <template v-if="resource === 'activities'">
        <Button type="link" @click="detail(row)">报名记录</Button><template v-if="canGym('activities:manage')">
          <Button type="link" @click="cover(row)">封面</Button><Button
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
</Button><Button
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
    </template>
  </ResourcePage>
  <Modal
    v-model:open="visible"
    title="活动资料"
    :footer="mode === 'cover' ? undefined : null"
    @ok="saveCover"
  >
    <template v-if="mode === 'cover' && current">
      <Upload
        :before-upload="
          (file) => (current ? upload(file, current, 'coverFileId') : false)
        "
        :show-upload-list="false"
        accept=".png,.jpg,.jpeg"
      >
        <Button>上传活动封面</Button>
</Upload><Button
        v-if="current.coverFileId"
        type="link"
        @click="openGymFile(current.coverFileId)"
      >
        查看封面
      </Button>
</template><Table
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
  </Modal>
</template>
