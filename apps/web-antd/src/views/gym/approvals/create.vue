<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type { GymRow } from '#/api/gym';

import { computed, onScopeDispose, reactive, ref, watch } from 'vue';

import { Alert, Button, Form, FormItem, Input, InputNumber, message, Select, Spin } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';
import AdminDrawer from '#/views/gym/components/admin-drawer.vue';
import TableAction from '#/views/gym/components/table-action.vue';
import { textOrDash } from '#/views/gym/utils/display';

import Attachments from './attachments.vue';
import { approvalBusinessTypes } from './options';

const props = defineProps<{ businessType?: string; sourceType?: string; record?: GymRow; label?: string }>();
const emit = defineEmits<{ submitted: [row: GymRow] }>();
const visible = ref(false);
const loading = ref(false);
const referenceLoading = ref(false);
const failed = ref(false);
const saving = ref(false);
const uploading = ref(false);
const attachmentLoading = ref(false);
const formRef = ref<FormInstance>();
const templates = ref<GymRow[]>([]);
const stores = ref<GymRow[]>([]);
const members = ref<GymRow[]>([]);
const cards = ref<GymRow[]>([]);
const sources = ref<GymRow[]>([]);
const attachments = ref<GymRow[]>([]);
const form = reactive({
  businessType: 'card_opening',
  storeId: '',
  templateId: '',
  memberId: '',
  cardTemplateId: '',
  sourceId: '',
  title: '',
  reason: '',
  requestedPrice: undefined as number | undefined,
});
let requestKey = '';
let openRequest = 0;
let referenceRequest = 0;
let attachmentRequest = 0;
let linkedAttachmentId = '';
onScopeDispose(() => {
  referenceRequest++;
  openRequest++;
  attachmentRequest++;
});
const sourceType = computed(() => {
  if (props.sourceType) return props.sourceType;
  if (form.businessType === 'contract') return 'contracts';
  if (form.businessType === 'price_change') return 'course-products';
  return undefined;
});
const needsCard = computed(() => form.businessType === 'card_opening' && sourceType.value !== 'orders');
const selectableSources = computed(() => !props.record && ['contract', 'price_change'].includes(form.businessType));
const templateOptions = computed(() =>
  templates.value
    .filter((item) => item.businessType === form.businessType)
    .map((item) => ({ label: `${item.name} · V${item.version}`, value: item.id })),
);
const required = [{ required: true, message: '请填写或选择此项' }];
const unavailable = computed(
  () =>
    loading.value ||
    referenceLoading.value ||
    attachmentLoading.value ||
    failed.value ||
    saving.value ||
    uploading.value,
);
const originalPrice = computed(
  () => props.record?.price ?? sources.value.find((row) => row.id === form.sourceId)?.price,
);

function names(items: GymRow[]) {
  return items.map((item) => ({ label: item.name || item.contractNo, value: item.id }));
}

async function loadReferences() {
  if (!visible.value || loading.value) return;
  const request = ++referenceRequest;
  attachmentRequest++;
  attachmentLoading.value = false;
  linkedAttachmentId = '';
  referenceLoading.value = true;
  failed.value = false;
  attachments.value = [];
  members.value = [];
  cards.value = [];
  sources.value = [];
  form.memberId = props.sourceType === 'members' ? (props.record?.id ?? '') : '';
  form.cardTemplateId = props.sourceType === 'card-templates' ? (props.record?.id ?? '') : '';
  form.sourceId = props.record?.id ?? '';
  form.requestedPrice = undefined;
  if (!form.storeId) {
    referenceLoading.value = false;
    return;
  }
  const storeId = form.storeId;
  const listSource = selectableSources.value ? sourceType.value : undefined;
  try {
    const [memberRows, cardRows, sourceRows, attachedFile] = await Promise.all([
      needsCard.value ? gymApi.listAll('members', { storeId }) : [],
      needsCard.value ? gymApi.listAll('card-templates', { storeId, status: 'published' }) : [],
      listSource ? gymApi.listAll(listSource, { storeId }) : [],
      props.sourceType === 'contracts' && (props.record?.signedFileId || props.record?.unsignedFileId)
        ? gymApi.get(`files/${props.record.signedFileId || props.record.unsignedFileId}`)
        : undefined,
    ]);
    if (request !== referenceRequest) return;
    members.value = memberRows;
    cards.value = cardRows;
    sources.value = sourceRows.filter((row) =>
      form.businessType === 'price_change' ? row.status === 'active' : row.status !== 'cancelled',
    );
    if (attachedFile) attachments.value = [attachedFile];
  } catch {
    if (request === referenceRequest) failed.value = true;
  } finally {
    if (request === referenceRequest) referenceLoading.value = false;
  }
}

async function open() {
  const request = ++openRequest;
  referenceRequest++;
  visible.value = true;
  loading.value = true;
  failed.value = false;
  attachments.value = [];
  templates.value = [];
  requestKey = crypto.randomUUID();
  Object.assign(form, {
    businessType: props.businessType ?? 'card_opening',
    storeId: '',
    templateId: '',
    memberId: '',
    cardTemplateId: '',
    sourceId: props.record?.id ?? '',
    title: props.label ?? '开卡审批',
    reason: '',
    requestedPrice: undefined,
  });
  try {
    const [storeRows, options, member] = await Promise.all([
      gymApi.listAll('stores'),
      gymApi.get<{ templates: GymRow[] }>('approval-options'),
      props.sourceType === 'members' && props.record ? gymApi.get(`members/${props.record.id}`) : undefined,
    ]);
    if (request !== openRequest) return;
    stores.value = storeRows.filter(
      (store) =>
        (!member || member.stores.some((item: GymRow) => item.id === store.id)) &&
        (props.sourceType !== 'card-templates' ||
          props.record?.accessScope === 'all' ||
          props.record?.storeIds?.includes(store.id)),
    );
    templates.value = options.templates;
    form.storeId = props.record?.storeId ?? (stores.value.length === 1 ? (stores.value[0]?.id ?? '') : '');
    form.templateId = templateOptions.value[0]?.value ?? '';
  } catch {
    if (request === openRequest) failed.value = true;
  } finally {
    if (request === openRequest) loading.value = false;
  }
  if (request === openRequest && !failed.value) await loadReferences();
}

watch(
  () => [form.storeId, form.businessType],
  () => {
    if (loading.value) return;
    if (!templateOptions.value.some((item) => item.value === form.templateId))
      form.templateId = templateOptions.value[0]?.value ?? '';
    void loadReferences();
  },
  { flush: 'sync' },
);
watch(
  () => form.businessType,
  (type) => {
    if (!loading.value) form.title = approvalBusinessTypes.find((item) => item.value === type)?.label ?? '审批申请';
  },
);
watch(
  () => form.sourceId,
  async (sourceId) => {
    if (props.record || !visible.value || loading.value || referenceLoading.value || form.businessType !== 'contract')
      return;
    const request = ++attachmentRequest;
    attachments.value = attachments.value.filter((file) => file.id !== linkedAttachmentId);
    linkedAttachmentId = '';
    const source = sources.value.find((row) => row.id === sourceId);
    const fileId = source?.signedFileId || source?.unsignedFileId;
    if (!fileId) return;
    attachmentLoading.value = true;
    try {
      const file = await gymApi.get(`files/${fileId}`);
      if (request !== attachmentRequest) return;
      if (!attachments.value.some((item) => item.id === file.id) && attachments.value.length < 10) {
        attachments.value = [...attachments.value, file];
        linkedAttachmentId = file.id;
      }
    } catch {
      // The request client reports the error; applicants can upload the contract manually.
    } finally {
      if (request === attachmentRequest) attachmentLoading.value = false;
    }
  },
);
watch(
  visible,
  (value) => {
    if (!value) {
      referenceRequest++;
      openRequest++;
      attachmentRequest++;
    }
  },
  { flush: 'sync' },
);

async function submit() {
  if (unavailable.value) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (unavailable.value) return;
  if (!form.title.trim()) {
    message.warning('请填写申请事项');
    return;
  }
  if (form.businessType === 'contract' && attachments.value.length === 0) {
    message.warning('签约审批请附上合同或协议');
    return;
  }
  saving.value = true;
  try {
    const result = await gymApi.post(
      'approvals',
      {
        businessType: form.businessType,
        storeId: form.storeId,
        templateId: form.templateId,
        title: form.title.trim(),
        reason: textOrDash(form.reason),
        ...(sourceType.value ? { sourceType: sourceType.value, sourceId: form.sourceId } : {}),
        ...(needsCard.value ? { memberId: form.memberId, cardTemplateId: form.cardTemplateId } : {}),
        ...(form.businessType === 'price_change' ? { requestedPrice: form.requestedPrice } : {}),
        attachmentIds: attachments.value.map((file) => file.id),
      },
      requestKey,
    );
    message.success('审批已提交，可在审批管理中查看进度');
    visible.value = false;
    emit('submitted', result);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <template v-if="canGym('approvals:create')">
    <TableAction v-if="record" action="submitApproval" :label="label ?? '发起审批'" @click="open" />
    <Button v-else type="primary" @click="open">
      {{ label ?? '发起审批' }}
    </Button>
  </template>
  <AdminDrawer
    v-model:open="visible"
    title="发起审批"
    ok-text="提交审批"
    :width="760"
    :confirm-loading="saving || uploading"
    :ok-button-props="{ disabled: unavailable || !templateOptions.length }"
    destroy-on-close
    @ok="submit"
  >
    <Spin :spinning="loading || referenceLoading">
      <Alert v-if="failed" type="error" show-icon message="表单数据加载失败"
        ><template #action><Button @click="open">重新加载</Button></template></Alert
      >
      <Form ref="formRef" :model="form" layout="vertical" :disabled="unavailable">
        <h3 class="mb-3 font-medium">基本信息</h3>
        <FormItem label="审批类型" name="businessType" :rules="required"
          ><Select
            v-model:value="form.businessType"
            :options="approvalBusinessTypes"
            :disabled="unavailable || !!businessType"
        /></FormItem>
        <FormItem label="申请门店" name="storeId" :rules="required"
          ><Select
            v-model:value="form.storeId"
            :options="names(stores)"
            :disabled="unavailable || !!record?.storeId"
            placeholder="请选择门店"
        /></FormItem>
        <FormItem label="审批模板" name="templateId" :rules="required"
          ><Select v-model:value="form.templateId" :options="templateOptions" placeholder="请选择审批模板"
        /></FormItem>
        <Alert
          v-if="!loading && !templateOptions.length"
          type="warning"
          show-icon
          message="暂无可用模板，请联系总部发布该类型的审批模板。"
          class="mb-4"
        />
        <FormItem label="申请事项" name="title" :rules="required"
          ><Input v-model:value="form.title" :maxlength="255"
        /></FormItem>
        <h3 class="mb-3 font-medium">业务信息</h3>
        <p v-if="record" class="mb-3 text-muted-foreground">
          关联记录：{{
            record.name || record.contractNo || record.orderNo || record.externalAgreementId || record.memberName
          }}
        </p>
        <template v-if="needsCard">
          <FormItem label="申请会员" name="memberId" :rules="required"
            ><Select
              v-model:value="form.memberId"
              :options="members.map((item) => ({ label: `${item.name} · ${item.phone}`, value: item.id }))"
              :disabled="unavailable || sourceType === 'members'"
              show-search
              option-filter-prop="label"
          /></FormItem>
          <FormItem label="会员卡模板" name="cardTemplateId" :rules="required"
            ><Select
              v-model:value="form.cardTemplateId"
              :options="names(cards)"
              :disabled="unavailable || sourceType === 'card-templates'"
              show-search
              option-filter-prop="label"
          /></FormItem>
        </template>
        <FormItem
          v-if="selectableSources"
          :label="form.businessType === 'contract' ? '签约合同' : '申请改价课程'"
          name="sourceId"
          :rules="required"
          ><Select v-model:value="form.sourceId" :options="names(sources)" show-search option-filter-prop="label"
        /></FormItem>
        <p
          v-if="form.businessType === 'price_change' && originalPrice !== undefined"
          class="mb-3 text-muted-foreground"
        >
          课程原价：¥{{ originalPrice }}
        </p>
        <FormItem
          v-if="form.businessType === 'price_change'"
          label="申请价格（元）"
          name="requestedPrice"
          :rules="required"
          ><InputNumber v-model:value="form.requestedPrice" :min="0" :precision="2" class="w-full"
        /></FormItem>
        <FormItem label="申请原因" name="reason"
          ><Input.TextArea
            v-model:value="form.reason"
            :rows="4"
            :maxlength="2000"
            show-count
            placeholder="请说明申请背景、具体事项及审批依据"
        /></FormItem>
        <FormItem label="附件材料" :required="form.businessType === 'contract'">
          <Attachments
            :key="`${form.businessType}-${form.storeId}`"
            v-model="attachments"
            :store-id="form.storeId"
            :editable="canGym('files:upload')"
            :disabled="loading || referenceLoading || attachmentLoading || saving || failed"
            @uploading="uploading = $event"
          />
        </FormItem>
      </Form>
    </Spin>
  </AdminDrawer>
</template>
