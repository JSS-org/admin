import type { Ref } from 'vue';

import type { GymRow } from '#/api/gym';
import type { Field, ResourcePageHandle } from '#/views/gym/types';

import { computed, onScopeDispose, ref } from 'vue';

import { message } from 'ant-design-vue';

import { canGym, gymApi } from '#/api/gym';

import { fields } from './data';

export function usePage(view: Readonly<Ref<null | ResourcePageHandle>>) {
  const current = ref<GymRow>();
  const mode = ref('');
  const visible = ref(false);
  const saving = ref(false);
  const roles = ref<GymRow[]>([]);
  const links = ref<
    {
      roleId?: string;
      storeId?: string;
    }[]
  >([]);
  const password = ref('');
  const username = ref('');
  const selectedStores = ref<string[]>([]);
  const stores = ref<GymRow[]>([]);
  const salaryHistory = ref<GymRow[]>([]);
  const salaryStores = ref<{ label: string; value: string }[]>([]);
  let detailRequest = 0;
  let actionRequest = 0;
  onScopeDispose(() => {
    detailRequest++;
    actionRequest++;
  });
  const editorFields = computed<Field[]>(() => [
    ...fields,
    ...(canGym('payroll:templates')
      ? [
          {
            key: 'salaryMode',
            label: '工资模板',
            type: 'select' as const,
            onlyEdit: true,
            default: 'keep',
            options: [
              { label: '保持现有配置', value: 'keep' },
              { label: '指定新的工资模板', value: 'assign' },
            ],
          },
          {
            key: 'salaryStoreId',
            label: '发薪门店',
            type: 'select' as const,
            onlyEdit: true,
            required: true,
            options: salaryStores.value,
            visibleWhen: (values: Record<string, any>) => values.salaryMode === 'assign',
          },
          {
            key: 'salaryTemplateId',
            label: '已发布工资模板',
            type: 'select' as const,
            onlyEdit: true,
            required: true,
            source: 'salary-templates?status=published',
            optionLabel: (template: GymRow) =>
              `${template.name} · v${template.version} · ${template.effectiveFrom} 至 ${template.effectiveTo ?? '长期'}`,
            visibleWhen: (values: Record<string, any>) => values.salaryMode === 'assign',
          },
          {
            key: 'salaryEffectiveFrom',
            label: '工资配置生效日期',
            type: 'date' as const,
            onlyEdit: true,
            required: true,
            visibleWhen: (values: Record<string, any>) => values.salaryMode === 'assign',
          },
          {
            key: 'salaryEffectiveTo',
            label: '工资配置结束日期（不含，留空为长期）',
            type: 'date' as const,
            onlyEdit: true,
            visibleWhen: (values: Record<string, any>) => values.salaryMode === 'assign',
          },
        ]
      : []),
  ]);
  async function loadDetail(row: GymRow) {
    const request = ++detailRequest;
    const detail = await gymApi.get(`employees/${row.id}`);
    const [history, allStores] = await Promise.all([
      canGym('payroll:read') ? gymApi.listAll('employee-salary-assignments', { employeeId: row.id }) : [],
      canGym('payroll:templates') ? gymApi.listAll('stores') : [],
    ]);
    if (request === detailRequest) {
      salaryHistory.value = history;
      salaryStores.value = allStores
        .filter((store) => detail.storeIds.includes(store.id))
        .map((store) => ({ label: store.name, value: store.id }));
    }
    return { ...detail, salaryMode: 'keep', salaryStoreId: detail.storeIds[0] };
  }
  function prepare(values: Record<string, any>, row?: GymRow) {
    const { storeIds, salaryMode, salaryStoreId, salaryTemplateId, salaryEffectiveFrom, salaryEffectiveTo, ...data } =
      values;
    if (row && salaryMode === 'assign')
      data.salaryAssignment = {
        storeId: salaryStoreId,
        templateId: salaryTemplateId,
        effectiveFrom: salaryEffectiveFrom,
        effectiveTo: salaryEffectiveTo || null,
      };
    if (!row)
      data.storeAssignments = storeIds.map((storeId: string, i: number) => ({
        storeId,
        isPrimary: i === 0,
        isManager: false,
        joinedOn: data.hiredOn,
      }));
    return data;
  }
  async function open(row: GymRow, action: string) {
    if (saving.value) return;
    const request = ++actionRequest;
    const [detail, allRoles, assignments, allStores] = await Promise.all([
      action === 'stores' ? gymApi.get(`employees/${row.id}`) : row,
      action === 'roles' ? gymApi.listAll('roles') : [],
      action === 'roles' ? gymApi.get<{ roleId?: string; storeId?: string }[]>(`accounts/${row.accountId}/roles`) : [],
      action === 'stores' || action === 'roles' ? gymApi.listAll('stores') : [],
    ]);
    if (request !== actionRequest) return;
    current.value = detail;
    mode.value = action;
    password.value = '';
    username.value = '';
    selectedStores.value = [...detail.storeIds];
    roles.value = allRoles;
    links.value = assignments;
    stores.value = allStores;
    visible.value = true;
  }
  async function save() {
    if (saving.value) return;
    const row = current.value;
    if (!row) return;
    if (mode.value === 'stores' && selectedStores.value.length === 0) {
      message.error('请至少选择一个所属门店');
      return;
    }
    if (
      mode.value === 'roles' &&
      links.value.some(
        (link) =>
          !link.roleId || (roles.value.find((role) => role.id === link.roleId)?.scopeType === 'store' && !link.storeId),
      )
    ) {
      message.error('请选择每条授权的角色及对应门店');
      return;
    }
    if (mode.value === 'account' && !username.value.trim()) {
      message.error('请填写登录账号');
      return;
    }
    if (['account', 'password'].includes(mode.value) && password.value.length < 6) {
      message.error('密码至少需要 6 位');
      return;
    }
    saving.value = true;
    try {
      if (mode.value === 'roles')
        await gymApi.put(`accounts/${row.accountId}/roles`, {
          assignments: links.value.map((l) =>
            roles.value.find((r) => r.id === l.roleId)?.scopeType === 'hq' ? { roleId: l.roleId } : l,
          ),
        });
      else if (mode.value === 'stores')
        await gymApi.put(`employees/${row.id}/stores`, {
          storeAssignments: selectedStores.value.map((storeId, i) => ({
            storeId,
            isPrimary: i === 0,
            isManager: row.storeAssignments?.find((item: GymRow) => item.storeId === storeId)?.isManager ?? false,
            joinedOn: row.storeAssignments?.find((item: GymRow) => item.storeId === storeId)?.joinedOn ?? row.hiredOn,
          })),
        });
      else if (mode.value === 'account')
        await gymApi.post(`employees/${row.id}/account`, {
          username: username.value,
          password: password.value,
        });
      else
        await gymApi.put(`accounts/${row.accountId}/password`, {
          password: password.value,
        });
      message.success('已保存');
      visible.value = false;
      await view.value?.load();
    } finally {
      saving.value = false;
    }
  }
  const titles: Record<string, string> = {
    roles: '角色与门店授权',
    stores: '调整所属门店',
    account: '创建网页账号',
    password: '重置密码',
  };
  return {
    editorFields,
    loadDetail,
    salaryHistory,
    current,
    mode,
    visible,
    saving,
    roles,
    links,
    password,
    username,
    selectedStores,
    stores,
    prepare,
    open,
    save,
    titles,
  };
}
