<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import AdminPage from './components/admin-page.vue';

const accessStore = useAccessStore();
const shortcuts = [
  {
    title: '会员管理',
    description: '会员建档、资料查询与持卡详情',
    icon: 'lucide:users',
    path: '/gym/members',
  },
  {
    title: '课程安排',
    description: '查看与维护课程排期、教练和场地',
    icon: 'lucide:calendar-days',
    path: '/gym/course-sessions',
  },
  {
    title: '预约管理',
    description: '办理代预约，查询与取消课程预约',
    icon: 'lucide:calendar-check',
    path: '/gym/bookings',
  },
  {
    title: '签到记录',
    description: '查看到店签到与当天签到汇总',
    icon: 'lucide:clipboard-check',
    path: '/gym/checkins',
  },
  {
    title: '合同记录',
    description: '查看合同原件、签署信息与未签提醒',
    icon: 'lucide:file-check',
    path: '/gym/contracts',
  },
  {
    title: '门店与员工业绩',
    description: '查询门店和员工的销售业绩汇总',
    icon: 'lucide:chart-no-axes-combined',
    path: '/gym/reports/performance',
  },
];

const visibleShortcuts = computed(() => shortcuts.filter((shortcut) => accessStore.getMenuByPath(shortcut.path)));
</script>

<template>
  <div class="gym-view">
    <AdminPage title="首页">
      <section aria-labelledby="home-shortcuts-title">
        <h2 id="home-shortcuts-title" class="mb-4 text-base font-medium">常用功能</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RouterLink
            v-for="shortcut in visibleShortcuts"
            :key="shortcut.path"
            :to="shortcut.path"
            class="bg-card text-card-foreground hover:border-primary focus-visible:ring-ring flex items-start gap-4 rounded-lg border p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <span class="bg-primary/10 text-primary rounded-lg p-3">
              <IconifyIcon :icon="shortcut.icon" class="size-6" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1">
              <h3 class="mb-2 text-base font-medium">{{ shortcut.title }}</h3>
              <p class="text-muted-foreground text-sm leading-6">
                {{ shortcut.description }}
              </p>
            </div>
            <IconifyIcon
              icon="lucide:arrow-up-right"
              class="text-muted-foreground mt-1 size-4 shrink-0"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
      </section>
    </AdminPage>
  </div>
</template>
