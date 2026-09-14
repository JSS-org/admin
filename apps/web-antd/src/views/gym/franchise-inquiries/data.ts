import type { Field } from '#/views/gym/types';

const title = '加盟咨询';

const fields: Field[] = [
  {
    key: 'status',
    batch: true,
    label: '处理状态',
    type: 'select',
    options: [
      { label: '新咨询', value: 'new' },
      { label: '已联系', value: 'contacted' },
      { label: '已结束', value: 'closed' },
    ],
    required: true,
  },
];

const columns = [
  { title: '联系人', dataIndex: 'contactName' },
  { title: '电话', dataIndex: 'phone' },
  { title: '意向城市', dataIndex: 'preferredCity' },
  { title: '咨询内容', dataIndex: 'message' },
  { title: '状态', dataIndex: 'status' },
  { title: '收到时间', dataIndex: 'receivedAt' },
];
export { columns, fields, title };
