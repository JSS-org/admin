<script setup lang="ts">
import type { ResourcePageProps } from '../types';

import type { GymRow } from '#/api/gym';

import { computed, useSlots, watch } from 'vue';

import { Alert, Button, Empty, Space, Table, Tag } from 'ant-design-vue';

import { canGym } from '#/api/gym';
import TableAction from '#/views/gym/components/table-action.vue';

import { useResourceEditor } from '../composables/use-resource-editor';
import { useResourceList } from '../composables/use-resource-list';
import { useResourceOptions } from '../composables/use-resource-options';
import { displayValue, statusColor } from '../utils/display';
import AdminDrawer from './admin-drawer.vue';
import Page from './admin-page.vue';
import BulkEdit from './bulk-edit.vue';
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
  error,
  hasFilters,
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

function resetFilters() {
  filterDraft.value = {};
  search();
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
      <slot name="create" :reload="load"></slot>
      <Button v-if="writable && create" type="primary" @click="open()"> 新增 </Button>
      <TableSelectionActions
        :selected="selectedKeys.length"
        :total="items.length"
        :disabled="selectionDisabled"
        @select-all="selectAll"
        @clear="clearSelection"
      />
      <BulkEdit
        v-if="writable && edit && fields.some((field) => field.batch)"
        :endpoint="endpoint"
        :fields="fields.filter((field) => field.batch && !field.immutable)"
        :rows="selectedRows"
        :editable="editable"
        :disabled="selectionDisabled"
        :field-options="fieldOptions"
        @changed="
          clearSelection();
          load();
          emit('changed');
        "
      />
      <slot name="toolbar" :reload="load" :selected-rows="selectedRows" :selected-row-keys="selectedKeys"></slot>
      <Button class="gym-refresh" :loading="loading" @click="load">刷新列表</Button>
    </div>
    <Alert
      v-if="error"
      type="error"
      show-icon
      message="列表加载失败"
      description="请检查网络连接后重试。当前筛选条件已保留。"
    >
      <template #action><Button :loading="loading" @click="load">重试</Button></template>
    </Alert>
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
      <template #emptyText>
        <Empty
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
          :description="error ? '暂时无法获取数据' : hasFilters ? '没有找到符合条件的记录' : '暂无记录'"
        >
          <Button v-if="hasFilters && !error" @click="resetFilters">清空筛选</Button>
          <Button v-else-if="writable && create && !error" type="primary" @click="open()">新增记录</Button>
        </Empty>
      </template>
      <template #bodyCell="{ column, record, text }">
        <Space v-if="column.dataIndex === '_actions'" wrap>
          <TableAction
            action="edit"
            v-if="writable && edit !== false && (!editable || editable(record as GymRow))"
            @click="open(record as GymRow)"
          />
          <TableAction action="detail" v-if="detail" @click="emit('detail', record as GymRow)" />
          <slot name="actions" :row="record as GymRow" :reload="load"></slot>
        </Space>
        <Tag v-else-if="column.dataIndex === 'status'" :color="statusColor(text)">
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
      <ResourceForm
        :ref="setFormRef"
        :model-value="form"
        :fields="visibleFields"
        :field-options="fieldOptions"
        :disabled="saving"
      />
      <slot name="editor-extra" :row="current" :form="form" :saving="saving"></slot>
    </AdminDrawer>
  </Page>
</template>
