<script setup lang="ts">
import type { GymRow } from '#/api/gym';

import { onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
} from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';

import AdminDrawer from './components/admin-drawer.vue';
import ResourcePage from './components/resource-page.vue';

const props = defineProps<{ resource: string }>();
const list = ref<InstanceType<typeof ResourcePage>>();
const visible = ref(false);
const calculateVisible = ref(false);
const busy = ref(false);
const form = ref<Record<string, any>>({});
const stores = ref<GymRow[]>([]);
const storeId = ref<string>();
const month = ref(new Date().toISOString().slice(0, 7));
const detail = ref<GymRow>();
const showDetail = ref(false);
const selectedItem = ref<Record<string, any>>();
const labels: Record<string, string> = {
  card_sales: '会员卡销售提成',
  pt_sales: '私教销售提成',
  lessons: '消课提成',
  allowance: '固定加项',
  deduction: '固定扣项',
};
const templateColumns = [
  { title: '模板', dataIndex: 'name' },
  { title: '版本', dataIndex: 'version' },
  { title: '底薪', dataIndex: 'baseSalary' },
  { title: '生效', dataIndex: 'effectiveFrom' },
  { title: '失效', dataIndex: 'effectiveTo' },
  { title: '状态', dataIndex: 'status' },
];
const itemColumns = [
  { title: '员工', dataIndex: 'employeeName' },
  { title: '底薪', dataIndex: 'baseSalary' },
  { title: '卡销售提成', dataIndex: 'cardCommission' },
  { title: '私教提成', dataIndex: 'ptCommission' },
  { title: '消课提成', dataIndex: 'lessonCommission' },
  { title: '加项', dataIndex: 'allowances' },
  { title: '扣项', dataIndex: 'deductions' },
  { title: '应发', dataIndex: 'grossAmount' },
  { title: '实发', dataIndex: 'netAmount' },
  { title: '明细', key: 'action' },
];
onMounted(async () => {
  if (props.resource === 'payrolls') {
    for (let page = 1; ; page++) {
      const data = await gymApi.list('stores', { page, pageSize: 100 });
      stores.value.push(...data.items);
      if (stores.value.length >= data.total) break;
    }
    storeId.value = stores.value[0]?.id;
  }
});
function edit(row?: GymRow, version = false) {
  form.value = row
    ? JSON.parse(JSON.stringify(row))
    : {
        name: '',
        baseSalary: 0,
        effectiveFrom: `${month.value}-01`,
        effectiveTo: null,
        rules: [],
      };
  form.value.newVersion = version;
  visible.value = true;
}
function ruleBody(rule: Record<string, any>) {
  if (['allowance', 'deduction'].includes(rule.component))
    return {
      component: rule.component,
      calculationType: 'fixed',
      fixedAmount: rule.fixedAmount,
    };
  if (rule.component === 'lessons')
    return {
      component: rule.component,
      calculationType: 'per_unit',
      unitAmount: rule.unitAmount,
    };
  return {
    component: rule.component,
    calculationType: 'rate',
    rate: rule.rate,
    lowerBound: rule.lowerBound ?? null,
    upperBound: rule.upperBound ?? null,
  };
}
async function saveTemplate() {
  busy.value = true;
  try {
    const { name, baseSalary, effectiveFrom, effectiveTo, rules } = form.value;
    const body = {
      name,
      baseSalary,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      rules: rules.map((r: Record<string, any>) => ruleBody(r)),
    };
    if (form.value.newVersion) await gymApi.post(`salary-templates/${form.value.id}/versions`, body);
    else if (form.value.id) await gymApi.patch(`salary-templates/${form.value.id}`, body);
    else await gymApi.post('salary-templates', body);
    visible.value = false;
    await list.value?.load();
    message.success('模板草稿已保存');
  } finally {
    busy.value = false;
  }
}
async function publish(row: GymRow) {
  await gymApi.patch(`salary-templates/${row.id}`, { status: 'published' });
  await list.value?.load();
}
async function calculate(row?: GymRow) {
  busy.value = true;
  try {
    const result = row
      ? await gymApi.post(`payrolls/${row.id}/calculations`, {})
      : await gymApi.post('payrolls', {
          storeId: storeId.value,
          month: month.value,
        });
    calculateVisible.value = false;
    await list.value?.load();
    await details(result);
  } finally {
    busy.value = false;
  }
}
async function details(row: GymRow) {
  detail.value = await gymApi.get(`payrolls/${row.id}`);
  selectedItem.value = undefined;
  showDetail.value = true;
}
function confirm(row: GymRow) {
  Modal.confirm({
    title: `确认${row.month}工资？`,
    content: '确认后该店本月工资将冻结，不能重算覆盖。',
    onOk: async () => {
      await gymApi.patch(`payrolls/${row.id}`, { status: 'confirmed' });
      await list.value?.load();
    },
  });
}
</script>

<template>
  <div class="gym-view">
    <ResourcePage
      v-if="resource === 'salary-templates'"
      ref="list"
      title="薪资模板"
      endpoint="salary-templates"
      :fields="[]"
      :columns="templateColumns"
      :create="false"
      :edit="false"
    >
      <template #toolbar>
        <Button v-if="canGym('payroll:templates')" type="primary" @click="edit()"> 新增模板 </Button>
      </template>
      <template #actions="{ row }">
        <Space>
          <Button @click="edit(row)"> {{ row.status === 'draft' ? '编辑' : '查看规则' }} </Button
          ><Button v-if="row.status === 'draft'" @click="publish(row)"> 发布 </Button
          ><Button @click="edit(row, true)">创建新版本</Button>
        </Space>
      </template>
    </ResourcePage>
    <ResourcePage
      v-else-if="resource === 'employee-salary-assignments'"
      title="员工薪资关联"
      endpoint="employee-salary-assignments"
      write-code="payroll:templates"
      store-filter
      :create="canGym('payroll:templates')"
      :edit="canGym('payroll:templates')"
      :fields="
        canGym('payroll:templates')
          ? [
              {
                key: 'storeId',
                label: '门店',
                source: 'stores',
                required: true,
                immutable: true,
              },
              {
                key: 'employeeId',
                label: '员工',
                source: 'employees',
                required: true,
                immutable: true,
              },
              {
                key: 'templateId',
                label: '已发布薪资模板',
                source: 'salary-templates?status=published',
                required: true,
                immutable: true,
              },
              {
                key: 'effectiveFrom',
                label: '生效日期',
                type: 'date',
                required: true,
                immutable: true,
              },
              { key: 'effectiveTo', label: '失效日期（不含）', type: 'date' },
            ]
          : []
      "
      :columns="[
        { title: '门店', dataIndex: 'storeName' },
        { title: '员工', dataIndex: 'employeeName' },
        { title: '模板', dataIndex: 'templateName' },
        { title: '版本', dataIndex: 'templateVersion' },
        { title: '生效', dataIndex: 'effectiveFrom' },
        { title: '失效', dataIndex: 'effectiveTo' },
      ]"
    />
    <ResourcePage
      v-else
      ref="list"
      title="门店工资表"
      endpoint="payrolls"
      :fields="[]"
      :create="false"
      :edit="false"
      store-filter
      @detail="details"
      :columns="[
        { title: '门店', dataIndex: 'storeName' },
        { title: '月份', dataIndex: 'month' },
        { title: '员工数', dataIndex: 'employeeCount' },
        { title: '实发合计', dataIndex: 'netAmount' },
        { title: '状态', dataIndex: 'status' },
        { title: '计算时间', dataIndex: 'calculatedAt' },
        { title: '确认时间', dataIndex: 'confirmedAt' },
      ]"
    >
      <template #toolbar>
        <Button v-if="canGym('payroll:calculate')" type="primary" @click="calculateVisible = true"> 计算月工资 </Button>
      </template>
      <template #actions="{ row }">
        <Space>
          <Button
            v-if="canGym('payroll:calculate') && row.status !== 'confirmed'"
            :loading="busy"
            @click="calculate(row)"
          >
            重算 </Button
          ><Button v-if="canGym('payroll:confirm') && row.status === 'calculated'" @click="confirm(row)">
            确认工资
          </Button>
        </Space>
      </template>
    </ResourcePage>
    <AdminDrawer
      v-model:open="visible"
      title="薪资模板规则"
      width="850px"
      :confirm-loading="busy"
      :ok-button-props="{
        disabled: form.status === 'published' && !form.newVersion,
      }"
      @ok="saveTemplate"
    >
      <Alert
        message="底薪和固定加扣项按整月；比例填0到1。销售区间为空表示全部净业绩，有区间时仅计算该区间内金额。"
        type="info"
      />
      <Form layout="vertical">
        <FormItem label="模板名称">
          <Input v-model:value="form.name" />
        </FormItem>
        <FormItem label="整月底薪">
          <InputNumber v-model:value="form.baseSalary" :min="0" :precision="2" />
        </FormItem>
        <Space>
          <FormItem label="生效日期"> <Input v-model:value="form.effectiveFrom" type="date" /> </FormItem
          ><FormItem label="失效日期（不含）">
            <Input v-model:value="form.effectiveTo" type="date" />
          </FormItem>
        </Space>
        <FormItem v-for="(rule, index) in form.rules" :key="index" :label="`规则 ${Number(index) + 1}`">
          <Space wrap>
            <Select
              v-model:value="rule.component"
              style="width: 160px"
              :options="
                Object.entries(labels).map(([value, label]) => ({
                  label,
                  value,
                }))
              "
            />
            <template v-if="['card_sales', 'pt_sales'].includes(rule.component)">
              <InputNumber
                v-model:value="rule.rate"
                aria-label="提成比例"
                placeholder="比例"
                :min="0"
                :max="1"
                :step="0.01"
              /><InputNumber
                v-model:value="rule.lowerBound"
                aria-label="区间下限"
                placeholder="金额下限"
                :min="0"
              /><InputNumber v-model:value="rule.upperBound" aria-label="区间上限" placeholder="金额上限" :min="0" />
            </template>
            <InputNumber
              v-else-if="rule.component === 'lessons'"
              v-model:value="rule.unitAmount"
              aria-label="每课时金额"
              placeholder="每课时金额"
              :min="0"
              :precision="2"
            />
            <InputNumber
              v-else
              v-model:value="rule.fixedAmount"
              aria-label="固定金额"
              placeholder="固定金额"
              :min="0"
              :precision="2"
            />
            <Button @click="form.rules.splice(Number(index), 1)">移除</Button>
          </Space>
        </FormItem>
        <Button @click="form.rules.push({ component: 'card_sales', rate: 0 })"> 添加规则 </Button>
      </Form>
    </AdminDrawer>
    <AdminDrawer v-model:open="calculateVisible" title="计算月工资" :confirm-loading="busy" @ok="calculate()">
      <Alert message="须为每位员工配置覆盖整月的唯一已发布模板。未全部计算成功时保留原工资。" type="info" />
      <Form layout="vertical">
        <FormItem label="门店">
          <Select v-model:value="storeId" :options="stores.map((s) => ({ label: s.name, value: s.id }))" /> </FormItem
        ><FormItem label="月份">
          <Input v-model:value="month" type="month" />
        </FormItem>
      </Form>
    </AdminDrawer>
    <AdminDrawer v-model:open="showDetail" title="工资明细" width="1200px" :footer="null">
      <p>{{ detail?.storeName }} / {{ detail?.month }} / {{ detail?.status }}；实发合计 {{ detail?.netAmount }}</p>
      <Table row-key="id" :data-source="detail?.items" :columns="itemColumns" :pagination="false">
        <template #bodyCell="{ column, record }">
          <Button v-if="column.key === 'action'" @click="selectedItem = record"> 计算来源 </Button>
        </template>
      </Table>
      <template v-if="selectedItem">
        <p>{{ selectedItem.employeeName }}：{{ selectedItem.calculationSnapshot.basis }}</p>
        <p>
          模板 {{ selectedItem.calculationSnapshot.template.name }}，版本
          {{ selectedItem.calculationSnapshot.template.version }}
        </p>
        <Table
          row-key="id"
          :data-source="selectedItem.components"
          :pagination="false"
          :columns="[
            { title: '组成', dataIndex: 'label' },
            { title: '基础金额', dataIndex: 'basisAmount' },
            { title: '课时', dataIndex: 'basisQuantity' },
            { title: '比例', dataIndex: 'rate' },
            { title: '金额', dataIndex: 'amount' },
          ]"
        />
        <details v-for="component in selectedItem.components" :key="component.id">
          <summary>{{ component.label }}来源</summary>
          <pre>{{ JSON.stringify(component.sourceSnapshot, null, 2) }}</pre>
        </details>
      </template>
    </AdminDrawer>
  </div>
</template>
