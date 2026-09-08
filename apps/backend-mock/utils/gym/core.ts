import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

export type Row = Record<string, any> & { id: string };
export type Tables = Record<string, Row[]>;
export interface Actor {
  id: string;
  username: string;
  realName: string;
  roles: string[];
  scopeType: 'hq' | 'store';
  storeIds: string[];
  codes: string[];
  globalCodes: string[];
  storePermissions: Record<string, string[]>;
  operationStoreIds?: null | string[];
}
export interface Request {
  method: string;
  path: string;
  query: Record<string, any>;
  body: Record<string, any>;
  actor: Actor;
  key?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function fail(message: string, status = 400): never {
  throw new ApiError(status, message);
}
export const now = () => new Date().toISOString();
export const id = () => randomUUID();
export const seedId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const tables: Tables = {};
export const fileContents = new Map<string, Buffer>();
export const rows = (table: string) => (tables[table] ??= []);
export const find = (table: string, value: string): Row =>
  rows(table).find((r) => r.id === value) ?? fail('记录不存在', 404);
export const insert = (table: string, data: Record<string, any>) => {
  const row = { id: id(), createdAt: now(), updatedAt: now(), ...data } as Row;
  rows(table).push(row);
  return row;
};
export function allowed(actor: Actor, code: string) {
  if (!actor.codes.includes(code)) fail('没有此操作权限', 403);
  actor.operationStoreIds = actor.globalCodes.includes(code)
    ? null
    : Object.keys(actor.storePermissions).filter((storeId) =>
        actor.storePermissions[storeId]?.includes(code),
      );
}
export function accessibleStores(actor: Actor) {
  if (actor.operationStoreIds !== undefined) return actor.operationStoreIds;
  return actor.scopeType === 'hq' ? null : actor.storeIds;
}
export function storeScope(actor: Actor, storeId: string) {
  const permitted = accessibleStores(actor);
  if (!storeId || (permitted && !permitted.includes(storeId)))
    fail('门店不可访问', 404);
  return find('stores', storeId);
}
export function scopeRows(actor: Actor, data: Row[]) {
  const permitted = accessibleStores(actor);
  return permitted ? data.filter((r) => permitted.includes(r.storeId)) : data;
}
export function memberScope(actor: Actor, memberId: string, storeId?: string) {
  const member = find('members', memberId);
  if (storeId) storeScope(actor, storeId);
  const links = rows('memberStores').filter((r) => r.memberId === memberId);
  if (storeId && !links.some((r) => r.storeId === storeId))
    fail('会员不属于该门店', 404);
  const permitted = accessibleStores(actor);
  if (permitted && !links.some((r) => permitted.includes(r.storeId)))
    fail('会员不可访问', 404);
  return member;
}
export function only(body: Record<string, any>, keys: string[]) {
  if (!body || Array.isArray(body) || typeof body !== 'object')
    fail('请求内容必须是对象');
  const extra = Object.keys(body).find((key) => !keys.includes(key));
  if (extra) fail(`不允许修改字段：${extra}`);
}
export function str(value: unknown, label: string, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    fail(`${label}不能为空且不超过${max}字`);
  return (value as string).trim();
}
export function integer(
  value: unknown,
  label: string,
  min = 0,
  max = 1_000_000,
): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    value === '' ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    fail(`${label}必须为${min}到${max}之间的整数`);
  return Number(value);
}
export function choice(value: unknown, values: string[], label = '状态') {
  if (!values.includes(value as string)) fail(`${label}不合法`);
  return value as string;
}
export function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') fail(`${label}必须为是或否`);
  return value;
}
export function audit(req: Request, action: string, row: Row, summary = {}) {
  insert('operationLogs', {
    actorId: req.actor.id,
    storeId: row.storeId ?? null,
    action,
    resourceId: row.id,
    summary,
    occurredAt: now(),
  });
}
export function money(value: unknown, label = '金额'): string {
  const text = String(value ?? '');
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text))
    fail(`${label}必须是非负金额，最多两位小数`);
  return Number(text).toFixed(2);
}
export function uuid(value: unknown, label = 'ID') {
  if (
    typeof value !== 'string' ||
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
  )
    fail(`${label}格式错误`);
  return value as string;
}
export function listIds(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) fail(`${label}必须为列表`);
  return [...new Set((value as unknown[]).map((v) => uuid(v, label)))];
}
export function date(value: unknown, label: string) {
  const text = str(value, label, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(text) ||
    !Number.isFinite(Date.parse(text))
  )
    fail(`${label}格式错误`);
  if (
    new Date(`${text.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !==
    text.slice(0, 10)
  )
    fail(`${label}不是有效日期`);
  return text;
}
export function range(query: Record<string, any>): [number, number] {
  if (
    [!!query.date, !!query.month, !!(query.from || query.to)].filter(Boolean)
      .length > 1
  )
    fail('日期、月份与时间范围不能同时使用');
  if (query.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date)) fail('日期格式错误');
    const start = Date.parse(`${date(query.date, '日期')}T00:00:00+08:00`);
    return [start, start + 86_400_000];
  }
  if (query.month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(query.month)) fail('月份格式错误');
    const [y, m] = query.month.split('-').map(Number);
    return [Date.UTC(y, m - 1, 1) - 28_800_000, Date.UTC(y, m, 1) - 28_800_000];
  }
  const from = query.from
    ? Date.parse(localBoundary(date(query.from, '开始时间')))
    : -Infinity;
  const to = query.to
    ? Date.parse(localBoundary(date(query.to, '结束时间')))
    : Infinity;
  if (from >= to) fail('结束时间必须晚于开始时间');
  return [from, to];
}
function localBoundary(text: string) {
  return text.length === 10 ? `${text}T00:00:00+08:00` : text;
}
export function page(
  data: Row[],
  query: Record<string, any>,
  timeField = 'createdAt',
) {
  const n = integer(query.page ?? 1, '页码', 1);
  const size = integer(query.pageSize ?? 20, '每页条数', 1, 100);
  const [from, to] = range(query);
  const keyword = String(query.keyword ?? '')
    .trim()
    .toLowerCase();
  const filtered = data
    .filter((r) => {
      if (
        keyword &&
        ![
          'name',
          'title',
          'code',
          'phone',
          'memberNo',
          'employeeNo',
          'username',
          'memberName',
          'storeName',
        ].some((key) =>
          String(r[key] ?? '')
            .toLowerCase()
            .includes(keyword),
        )
      )
        return false;
      for (const key of [
        'storeId',
        'memberId',
        'status',
        'kind',
        'templateId',
        'coachId',
        'platform',
        'type',
        'sessionId',
      ])
        if (query[key] && r[key] !== query[key]) return false;
      if (from !== -Infinity || to !== Infinity) {
        const t = Date.parse(r[timeField]);
        if (!Number.isFinite(t) || t < from || t >= to) return false;
      }
      return true;
    })
    .toSorted(
      (a, b) =>
        String(b[timeField] ?? '').localeCompare(String(a[timeField] ?? '')) ||
        a.id.localeCompare(b.id),
    );
  return {
    items: filtered.slice((n - 1) * size, n * size),
    total: filtered.length,
    page: n,
    pageSize: size,
  };
}
export function unique(
  table: string,
  field: string,
  value: unknown,
  except?: string,
) {
  if (rows(table).some((r) => r[field] === value && r.id !== except))
    fail(`${field}已存在`, 409);
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}
export function checkPassword(password: string, hash: string) {
  const [salt, digest] = hash.split(':');
  return (
    !!salt &&
    !!digest &&
    timingSafeEqual(scryptSync(password, salt, 32), Buffer.from(digest, 'hex'))
  );
}
export function decorate(row: Row): Row {
  return {
    ...row,
    storeName: rows('stores').find(
      (s) => s.id === (row.storeId ?? row.issuedStoreId),
    )?.name,
    memberName: rows('members').find((m) => m.id === row.memberId)?.name,
    coachName: rows('employees').find((e) => e.id === row.coachId)?.name,
  };
}
