import type { Field } from '../types';

const statuses: Record<string, string> = {
  active: '启用',
  inactive: '停用',
  draft: '草稿',
  published: '已发布',
  lead: '潜客',
  member: '会员',
  hq: '总部',
  store: '门店',
  period: '期限卡',
  count: '次卡',
  all: '全部门店',
  selected: '指定门店',
  male: '男',
  female: '女',
  unspecified: '未填写',
  pending: '待处理',
  approved: '已通过',
  rejected: '已拒绝',
  signed: '已签署',
  cancelled: '已取消',
  confirmed: '已确认',
  completed: '已完成',
  failed: '失败',
  succeeded: '成功',
  queued: '排队中',
  frozen: '冻结',
  expired: '已过期',
  group: '操课',
  personal: '私教',
  scheduled: '待上课',
  attended: '已上课',
  missed: '未到课',
  face: '刷脸',
  qr: '扫码',
  manual: '人工',
  device: '设备',
  guest: '访客',
  unknown: '陌生访客',
  miniapp: '小程序',
  app: 'App',
  course: '课程',
};

export function displayValue(
  value: any,
  key: string,
  fields: Field[],
  options: Record<string, { label: string; value: any }[]>,
) {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value))
    return value.map((v) => options[key]?.find((o) => o.value === v)?.label ?? statuses[v] ?? v).join('、');
  if (typeof value === 'boolean') return value ? '是' : '否';
  const label =
    options[key]?.find((o) => o.value === value)?.label ??
    fields.find((f) => f.key === key)?.options?.find((o) => o.value === value)?.label;
  if (label) return label;
  if (statuses[value]) return statuses[value];
  if (typeof value === 'object') return Object.values(value).join(' / ');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  return value;
}
