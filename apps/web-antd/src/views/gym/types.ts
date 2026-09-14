import type { FilterField } from './components/filter-bar.vue';

import type { GymRow } from '#/api/gym';

export interface Field {
  key: string;
  label: string;
  type?:
    | 'date'
    | 'datetime'
    | 'money'
    | 'multi'
    | 'number'
    | 'password'
    | 'percent'
    | 'select'
    | 'tags'
    | 'text'
    | 'textarea'
    | 'time';
  required?: boolean;
  options?: { label: string; value: any }[];
  source?: string;
  optionLabel?: (row: GymRow) => string;
  default?: any;
  immutable?: boolean;
  hidden?: boolean;
  visibleWhen?: (values: Record<string, any>) => boolean;
  min?: number;
  max?: number;
  precision?: number;
  batch?: boolean;
  onlyEdit?: boolean;
}

export interface ResourcePageProps {
  title: string;
  endpoint: string;
  fields: Field[];
  columns: { title: string; dataIndex: string }[];
  writeCode?: string;
  create?: boolean;
  detail?: boolean;
  edit?: boolean;
  storeFilter?: boolean;
  timeFilter?: boolean;
  keywordFilter?: boolean;
  filterFields?: FilterField[];
  idempotent?: boolean;
  prepare?: (values: Record<string, any>, row?: GymRow) => Record<string, any>;
  initial?: (row: GymRow) => GymRow;
  editable?: (row: GymRow) => boolean;
  loadDetail?: (row: GymRow) => Promise<GymRow>;
}

export interface ResourcePageHandle {
  load: () => Promise<void>;
  open: (row?: GymRow) => Promise<void>;
  items: GymRow[];
}

/** Static configuration owned by an individual business page. */
export interface ResourceDefinition {
  title: string;
  code?: string;
  fields: Field[];
  columns: ResourcePageProps['columns'];
  create?: boolean;
  edit?: boolean;
  editable?: boolean;
}
