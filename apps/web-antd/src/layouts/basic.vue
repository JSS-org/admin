<script lang="ts" setup>
import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { BasicLayout } from '@vben/layouts';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Button } from 'ant-design-vue';

import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const userStore = useUserStore();
const accessStore = useAccessStore();
const authStore = useAuthStore();
async function handleLogout() {
  await authStore.logout(false);
}
</script>

<template>
  <BasicLayout @logout="handleLogout">
    <template #user-dropdown>
      <div class="admin-account">
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
.admin-account {
  display: flex;
  gap: 12px;
  align-items: center;
  padding-inline: 12px;
  white-space: nowrap;
}
</style>
