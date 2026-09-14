import type { Ref } from 'vue';

import type { GymRow } from '#/api/gym';
import type { ResourcePageHandle } from '#/views/gym/types';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import { gymApi } from '#/api/gym';

export function usePage(list: Readonly<Ref<null | ResourcePageHandle>>) {
  const visible = ref(false);
  const busy = ref(false);
  const form = ref<Record<string, any>>({});
  const month = ref(new Date().toISOString().slice(0, 7));
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
    if (busy.value || (form.value.status === 'published' && !form.value.newVersion)) return;
    if (!String(form.value.name ?? '').trim() || !form.value.effectiveFrom || form.value.baseSalary === null) {
      message.error('请填写模板名称、生效日期和底薪');
      return;
    }
    if (form.value.effectiveTo && form.value.effectiveTo <= form.value.effectiveFrom) {
      message.error('失效日期须晚于生效日期');
      return;
    }
    if (
      form.value.rules.some((rule: Record<string, any>) => {
        let amount = rule.fixedAmount;
        if (['card_sales', 'pt_sales'].includes(rule.component)) amount = rule.rate;
        else if (rule.component === 'lessons') amount = rule.unitAmount;
        return amount === undefined || amount === null;
      })
    ) {
      message.error('请填写每条规则对应的比例或金额');
      return;
    }
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
  return { visible, busy, form, edit, saveTemplate, publish };
}
