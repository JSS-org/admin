import type { FilterField } from './components/filter-bar.vue';

import type { GymRow } from '#/api/gym';

export interface Field {
  key: string;
  label: string;
  type?: 'date' | 'datetime' | 'money' | 'multi' | 'number' | 'password' | 'select' | 'text' | 'textarea';
  required?: boolean;
  options?: { label: string; value: any }[];
  source?: string;
  default?: any;
  immutable?: boolean;
  hidden?: boolean;
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
