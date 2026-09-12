<script lang="ts" setup>
import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { BasicLayout } from '@vben/layouts';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Button, Tooltip } from 'ant-design-vue';

import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const userStore = useUserStore();
const accessStore = useAccessStore();
const authStore = useAuthStore();
const isDevelopment = import.meta.env.DEV;
const isMock = import.meta.env.VITE_NITRO_MOCK === 'true';
async function handleLogout() {
  await authStore.logout(false);
}
</script>

<template>
  <BasicLayout @logout="handleLogout">
    <template #user-dropdown>
      <div class="admin-account">
        <Tooltip v-if="isDevelopment" :title="isMock ? '模拟数据，重启服务后恢复示例数据' : '当前为开发环境'">
          <span tabindex="0" class="admin-environment">
            {{ isMock ? '开发 · Mock' : '开发环境' }}
          </span>
        </Tooltip>
        <span>{{ userStore.userInfo?.realName }}</span>
        <Button type="text" @click="handleLogout">退出登录</Button>
      </div>
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal v-model:open="accessStore.loginExpired">
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
  </BasicLayout>
</template>

<style scoped>
.admin-environment {
  padding: 2px 8px;
  font-size: 12px;
  line-height: 20px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  border-radius: var(--radius);
}

.admin-account {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-inline: 12px;
  white-space: nowrap;
}
</style>
