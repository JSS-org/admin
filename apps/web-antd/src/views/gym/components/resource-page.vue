<script setup lang="ts">
import type { ResourcePageProps } from '../types';

import type { GymRow } from '#/api/gym';

import { computed, useSlots, watch } from 'vue';

import { Button, Space, Table, Tag } from 'ant-design-vue';

import { canGym } from '#/api/gym';

import { useResourceEditor } from '../composables/use-resource-editor';
import { useResourceList } from '../composables/use-resource-list';
import { useResourceOptions } from '../composables/use-resource-options';
import { displayValue } from '../utils/display';
import AdminDrawer from './admin-drawer.vue';
import Page from './admin-page.vue';
import FilterBar from './filter-bar.vue';
import ResourceForm from './resource-form.vue';
import TableSelectionActions from './table-selection-actions.vue';
import { useTableSelection } from './use-table-selection';

const props = withDefaults(defineProps<ResourcePageProps>(), {
  keywordFilter: true,
  filterFields: () => [],
  create: true,
  edit: true,
  writeCode: undefined,
  prepare: undefined,
  initial: undefined,
  editable: undefined,
});

const emit = defineEmits<{
  changed: [];
  detail: [row: GymRow];
  saved: [row: GymRow];
}>();

const slots = useSlots();

const {
  items,
  total,
  loading,
  page,
  pageSize,
  filterDraft,
  response,
  load,
  search: applySearch,
} = useResourceList(() => props.endpoint);

const { saving, visible, current, form, setFormRef, visibleFields, open, save } = useResourceEditor(
  props,
  async (saved) => {
    await load();
    emit('changed');
    emit('saved', saved);
  },
);

const { options, stores, fieldOptions } = useResourceOptions(props, form);

const selectionDisabled = computed(() => loading.value || saving.value);

const {
  clear: clearSelection,
  rowSelection,
  selectAll,
  selectedKeys,
  selectedRows,
} = useTableSelection(items, selectionDisabled);

const writable = computed(() => !!props.writeCode && canGym(props.writeCode));

const displayColumns = computed(() => [
  ...props.columns,
  ...((writable.value && props.edit) || slots.actions || props.detail
    ? [{ title: '操作', dataIndex: '_actions', width: 240 }]
    : []),
]);

function search() {
  clearSelection();
  void applySearch();
}

watch([page, pageSize], clearSelection, { flush: 'sync' });

defineExpose({ load, open, items });
</script>
<template>
  <Page :title="title">
    <FilterBar
      v-model="filterDraft"
      :keyword="keywordFilter"
      :store-options="storeFilter ? stores : undefined"
      :time="timeFilter"
      :fields="filterFields"
      :loading="loading"
      @search="search"
      @reset="search"
    />
    <div class="gym-toolbar">
      <Button v-if="writable && create" type="primary" @click="open()"> 新增 </Button>
      <TableSelectionActions
        :selected="selectedKeys.length"
        :total="items.length"
        :disabled="selectionDisabled"
        @select-all="selectAll"
        @clear="clearSelection"
      />
      <slot name="toolbar" :reload="load" :selected-rows="selectedRows" :selected-row-keys="selectedKeys"></slot>
    </div>
    <slot name="summary" :data="response"></slot>
    <Table
      :data-source="items"
      :columns="displayColumns"
      :scroll="{ x: 'max-content' }"
      :loading="loading"
      :row-selection="rowSelection"
      row-key="id"
      :pagination="{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (n: number) => `共 ${n} 条`,
      }"
      @change="
        (p) => {
          page = p.current ?? 1;
          pageSize = p.pageSize ?? 20;
          load();
        }
      "
    >
      <template #bodyCell="{ column, record, text }">
        <Space v-if="column.dataIndex === '_actions'" wrap>
          <Button
            v-if="writable && edit !== false && (!editable || editable(record as GymRow))"
            type="link"
            @click="open(record as GymRow)"
          >
            编辑
          </Button>
          <Button v-if="detail" type="link" @click="emit('detail', record as GymRow)"> 详情 </Button>
          <slot name="actions" :row="record as GymRow" :reload="load"></slot>
        </Space>
        <Tag v-else-if="column.dataIndex === 'status'">
          {{ displayValue(text, column.dataIndex, fields, options) }}
        </Tag>
        <span v-else>{{ displayValue(text, String(column.dataIndex ?? ''), fields, options) }}</span>
      </template>
    </Table>
    <AdminDrawer
      v-model:open="visible"
      :title="`${current ? '编辑' : '新增'}${title}`"
      :confirm-loading="saving"
      :width="640"
      destroy-on-close
      @ok="save"
    >
      <ResourceForm :ref="setFormRef" :model-value="form" :fields="visibleFields" :field-options="fieldOptions" />
    </AdminDrawer>
  </Page>
</template>
