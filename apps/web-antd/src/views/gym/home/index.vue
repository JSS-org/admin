<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import { Alert, Button, Card, Empty, Segmented, Select, Skeleton, Statistic, Table } from 'ant-design-vue';

import { canGym } from '#/api/gym';
import { approvalBusinessTypes } from '#/views/gym/approvals/options';
import AdminPage from '#/views/gym/components/admin-page.vue';
import { gymIcons } from '#/views/gym/icons';
import { displayValue } from '#/views/gym/utils/display';

import DashboardChart from './dashboard-chart.vue';
import { useDashboard } from './use-dashboard';

const { data, loading, error, stores, storeId, days, allowed, load } = useDashboard();

const scenarios = [
  {
    title: '会员服务',
    description: '从建档到签约，快速处理会员到店需求。',
    paths: [
      '/gym/members',
      '/gym/checkins',
      '/gym/contracts',
      '/gym/body-measurements',
      '/gym/cards',
      '/gym/point-products',
    ],
  },
  {
    title: '课程与经营',
    description: '安排课程、办理预约，掌握门店经营表现。',
    paths: [
      '/gym/course-sessions',
      '/gym/bookings',
      '/gym/reports/performance',
      '/gym/settings',
      '/gym/coupon-store-quotas',
      '/gym/activities',
    ],
  },
  {
    title: '门店协作',
    description: '维护团队、设备与门店展示，衔接日常管理。',
    paths: ['/gym/stores', '/gym/employees', '/gym/devices', '/gym/client-settings'],
  },
];

const accessStore = useAccessStore();

const shortcuts = [
  { title: '门店资料', description: '门店位置、营业时间、环境与封面', icon: gymIcons.store, path: '/gym/stores' },
  {
    title: '员工资料',
    description: '人员资料、门店归属与工资模板',
    icon: gymIcons.employees,
    path: '/gym/employees',
  },
  { title: '智能设备', description: '设备状态、柜格和指令记录', icon: gymIcons.device, path: '/gym/devices' },
  {
    title: '展示配置',
    description: '编排小程序与 App 内容并预览',
    icon: gymIcons.display,
    path: '/gym/client-settings',
  },
  {
    title: '体测记录',
    description: '会员身体数据与报告文件',
    icon: gymIcons.bodyMeasurement,
    path: '/gym/body-measurements',
  },
  { title: '会员卡模板', description: '维护卡种、适用门店及价格版本', icon: gymIcons.card, path: '/gym/cards' },
  {
    title: '积分兑换',
    description: '管理兑换商品、积分价格与库存',
    icon: gymIcons.pointProduct,
    path: '/gym/point-products',
  },
  {
    title: '售卡与核销',
    description: '配置售卡方案、包月及核销条件',
    icon: gymIcons.saleRedeem,
    path: '/gym/settings',
  },
  {
    title: '优惠券额度',
    description: '查看、分配门店额度与变动流水',
    icon: gymIcons.coupon,
    path: '/gym/coupon-store-quotas',
  },
  { title: '门店活动', description: '安排活动、维护封面和报名记录', icon: gymIcons.activity, path: '/gym/activities' },
  {
    title: '会员管理',
    description: '会员建档、资料查询与持卡详情',
    icon: gymIcons.member,
    path: '/gym/members',
  },
  {
    title: '课程安排',
    description: '查看与维护课程排期、教练和场地',
    icon: gymIcons.courseSchedule,
    path: '/gym/course-sessions',
  },
  {
    title: '预约管理',
    description: '办理代预约，查询与取消课程预约',
    icon: gymIcons.booking,
    path: '/gym/bookings',
  },
  {
    title: '签到记录',
    description: '查看到店签到与当天签到汇总',
    icon: gymIcons.checkin,
    path: '/gym/checkins',
  },
  {
    title: '合同记录',
    description: '查看合同原件、签署信息与未签提醒',
    icon: gymIcons.contract,
    path: '/gym/contracts',
  },
  {
    title: '门店与员工业绩',
    description: '查询门店和员工的销售业绩汇总',
    icon: gymIcons.performance,
    path: '/gym/reports/performance',
  },
];

const visibleShortcuts = computed(() => shortcuts.filter((shortcut) => accessStore.getMenuByPath(shortcut.path)));
const visibleScenarios = computed(() =>
  scenarios
    .map((scenario) => ({
      ...scenario,
      shortcuts: visibleShortcuts.value.filter((shortcut) => scenario.paths.includes(shortcut.path)),
    }))
    .filter((scenario) => scenario.shortcuts.length > 0),
);
</script>
<template>
  <div class="gym-view">
    <AdminPage title="门店工作台" description="围绕会员服务与课程运营，开始今天的工作。">
      <!-- <div class="gym-home-banner">
        <div class="gym-home-banner-icon"><Activity class="size-7" aria-hidden="true" /></div>
        <div>
          <p class="gym-home-eyebrow">日常运营</p>
          <h2>让每一次到店，都衔接顺畅</h2>
          <p>会员建档、到店签到、课程预约，常用服务从这里开始。</p>
        </div>
      </div> -->
      <section v-if="allowed" class="gym-stack" aria-label="经营数据看板">
        <div class="dashboard-toolbar">
          <div>
            <h2 class="text-base font-semibold">经营概览</h2>
            <p class="mt-1 text-sm text-muted-foreground">按北京时间统计，金额含期间退款；会员数按人去重。</p>
          </div>
          <div class="gym-toolbar">
            <Select
              v-model:value="storeId"
              placeholder="全部授权门店"
              allow-clear
              :options="stores.map((store) => ({ label: store.name, value: store.id }))"
              aria-label="看板门店"
              style="min-width: 180px"
              @change="load"
            /><Segmented
              v-model:value="days"
              :options="[
                { label: '近7天', value: 7 },
                { label: '近30天', value: 30 },
              ]"
              @change="load"
            /><Button :loading="loading" @click="load">刷新</Button>
          </div>
        </div>
        <Alert v-if="error" type="error" show-icon message="看板加载失败"
          ><template #action><Button @click="load">重试</Button></template></Alert
        >
        <Skeleton v-else-if="loading" active :paragraph="{ rows: 8 }" />
        <template v-else-if="data">
          <p class="text-sm text-muted-foreground">{{ data.from }} — {{ data.to }}</p>
          <div class="dashboard-metrics">
            <Card
              ><Statistic title="期间净实收" :value="data.metrics.netAmount" :precision="2" prefix="¥" />
              <p>按支付及退款发生时间</p></Card
            >
            <Card
              ><Statistic title="到店人次" :value="data.metrics.entries" suffix="次" />
              <p>仅统计成功签到</p></Card
            >
            <Card
              ><Statistic title="新增会员资料" :value="data.metrics.newMembers" suffix="人" />
              <p>期间新建会员及潜客</p></Card
            >
            <Card
              ><Statistic title="在册会员" :value="data.metrics.activeMembers" suffix="人" />
              <p>已启用的会员资料</p></Card
            >
          </div>
          <div class="dashboard-charts">
            <Card title="净实收与到店趋势"><DashboardChart :trend="data.trend" /></Card
            ><Card title="会员构成"
              ><DashboardChart
                v-if="data.memberSegments.some((item: any) => item.value > 0)"
                :segments="data.memberSegments"
              /><Empty v-else description="暂无会员资料" class="py-12" />
              <div class="flex flex-wrap justify-center gap-3 text-sm">
                <span v-for="segment in data.memberSegments" :key="segment.name"
                  >{{ segment.name }} {{ segment.value }}</span
                >
              </div></Card
            >
          </div>
          <Card v-if="canGym('approvals:read') && canGym('approvals:decide')" title="待审批"
            ><template #extra><RouterLink to="/gym/approvals">查看审批记录</RouterLink></template
            ><Empty
              v-if="!data.pendingApprovals?.length"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="暂无待审批事项"
              class="py-8"
            /><Table
              v-else
              :data-source="data.pendingApprovals"
              row-key="id"
              :pagination="false"
              size="small"
              :scroll="{ x: 'max-content' }"
              :columns="[
                { title: '申请事项', dataIndex: 'title' },
                { title: '审批类型', dataIndex: 'businessType' },
                { title: '门店', dataIndex: 'storeName' },
                { title: '申请人', dataIndex: 'applicantName' },
                { title: '申请时间', dataIndex: 'submittedAt' },
              ]"
              ><template #bodyCell="{ column, text }"
                ><span>{{
                  displayValue(text, String(column.dataIndex ?? ''), [], { businessType: approvalBusinessTypes })
                }}</span></template
              ></Table
            ></Card
          >
        </template>
      </section>
      <section v-for="scenario in visibleScenarios" :key="scenario.title" :aria-label="scenario.title">
        <div class="gym-home-section-heading">
          <h2>{{ scenario.title }}</h2>
          <p>{{ scenario.description }}</p>
        </div>
        <div class="gym-shortcuts grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <RouterLink
            v-for="shortcut in scenario.shortcuts"
            :key="shortcut.path"
            :to="shortcut.path"
            class="gym-shortcut bg-card text-card-foreground hover:border-primary focus-visible:ring-ring flex items-start gap-4 rounded-lg border p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <span class="bg-primary/10 text-primary rounded-lg p-3">
              <component :is="shortcut.icon" class="size-6" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1">
              <h3 class="mb-2 text-base font-medium">{{ shortcut.title }}</h3>
              <p class="text-muted-foreground text-sm leading-6">
                {{ shortcut.description }}
              </p>
            </div>
            <component
              :is="gymIcons.externalLink"
              class="text-muted-foreground mt-1 size-4 shrink-0"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
      </section>
      <p v-if="visibleScenarios.length === 0" class="text-muted-foreground py-8 text-center">
        暂无可用的常用功能，请联系管理员分配业务权限。
      </p>
    </AdminPage>
  </div>
</template>

<style scoped>
.dashboard-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gym-space-action);
  align-items: center;
  justify-content: space-between;
}

.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gym-space-block);
}

.dashboard-metrics p {
  margin-top: 12px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.dashboard-charts {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--gym-space-block);
}

.dashboard-charts > * {
  min-width: 0;
}

@media (width <= 1000px) {
  .dashboard-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-charts {
    grid-template-columns: 1fr;
  }
}

@media (width <= 480px) {
  .dashboard-metrics {
    grid-template-columns: 1fr;
  }
}

.gym-home-banner {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 28px;
  background: linear-gradient(115deg, hsl(var(--primary) / 12%), hsl(var(--card)) 75%);
  border: 1px solid hsl(var(--primary) / 18%);
  border-radius: 12px;
}

.gym-home-banner-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 56px;
  height: 56px;
  color: hsl(var(--primary));
  background: hsl(var(--card));
  border-radius: 16px;
}

.gym-home-eyebrow {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.gym-home-banner h2 {
  margin-bottom: 8px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
}

.gym-home-banner h2 + p,
.gym-home-section-heading p {
  font-size: 13px;
  line-height: 1.8;
  color: hsl(var(--muted-foreground));
}

.gym-home-section-heading {
  margin-block: 4px 16px;
}

.gym-home-section-heading h2 {
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 600;
}

.gym-shortcut {
  height: 100%;
  color: hsl(var(--card-foreground));
}

.gym-shortcuts {
  gap: var(--gym-space-block);
}

@media (width <= 640px) {
  .gym-home-banner {
    gap: 14px;
    align-items: flex-start;
    padding: 20px;
  }

  .gym-home-banner h2 {
    font-size: 20px;
  }
}
</style>
