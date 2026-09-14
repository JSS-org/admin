<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { BasicOption } from '@vben/types';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const isMock = import.meta.env.DEV && import.meta.env.VITE_NITRO_MOCK === 'true';

const MOCK_USER_OPTIONS: BasicOption[] = [
  {
    label: '总部管理员（Mock）',
    value: 'hq',
  },
  {
    label: '上海一店（Mock）',
    value: 'store1',
  },
  {
    label: '上海二店（Mock）',
    value: 'store2',
  },
];

const formSchema = computed((): VbenFormSchema[] => {
  const schema: VbenFormSchema[] = [
    {
      component: 'VbenSelect',
      componentProps: {
        options: MOCK_USER_OPTIONS,
        placeholder: $t('authentication.selectAccount'),
      },
      fieldName: 'selectAccount',
      label: $t('authentication.selectAccount'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.selectAccount') })
        .optional()
        .default('hq'),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      dependencies: {
        trigger(values, form) {
          if (isMock && values.selectAccount) {
            const findUser = MOCK_USER_OPTIONS.find((item) => item.value === values.selectAccount);
            if (findUser) {
              form.setValues({
                password: '123456',
                username: findUser.value,
              });
            }
          }
        },
        triggerFields: ['selectAccount'],
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
  return isMock ? schema : schema.slice(1).map((field) => ({ ...field, dependencies: undefined }));
});
</script>

<template>
  <AuthenticationLogin
    title="登录门店管理"
    sub-title="使用员工账号登录，处理会员服务与门店日常运营。"
    submit-button-text="登录工作台"
    :show-code-login="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-forget-password="false"
    :show-third-party-login="false"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="authStore.authLogin"
  />
</template>
