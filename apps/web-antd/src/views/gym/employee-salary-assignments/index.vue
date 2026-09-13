<script setup lang="ts">
import { canGym } from '#/api/gym';
import ResourcePage from '#/views/gym/components/resource-page.vue';

import { columns } from './data';
</script>
<template>
  <div class="gym-view">
    <ResourcePage
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
      :columns="columns"
    />
  </div>
</template>
