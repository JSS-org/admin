import type { Field, ResourcePageProps } from '#/views/gym/types';

const fields: Field[] = [
  { key: 'accountName', label: '账户名称', required: true },
  {
    key: 'storeId',
    label: '所属门店（留空为总部）',
    source: 'stores',
    immutable: true,
  },
  {
    key: 'provider',
    label: '渠道',
    type: 'select',
    required: true,
    immutable: true,
    options: [
      { label: '微信', value: 'wechat' },
      { label: '支付宝', value: 'alipay' },
      { label: '银行', value: 'bank' },
    ],
  },
  { key: 'merchantId', label: '商户号', required: true, immutable: true },
  {
    key: 'lastFour',
    label: '账号末四位',
    required: true,
    immutable: true,
  },
  { key: 'credentialRef', label: '安全存储凭据引用' },
];

const columns: ResourcePageProps['columns'] = [
  { title: '名称', dataIndex: 'accountName' },
  { title: '门店', dataIndex: 'storeName' },
  { title: '渠道', dataIndex: 'provider' },
  { title: '商户号', dataIndex: 'merchantId' },
  { title: '账号', dataIndex: 'accountMasked' },
  { title: '绑定状态', dataIndex: 'bindingStatus' },
];
export { columns, fields };
