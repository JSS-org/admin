import type { Request, Row } from './core';

import { accessibleStores, allowed, fail, range, rows, scopeRows, storeScope, uuid } from './core';
import { amount, saleFacts } from './sales';

export function dashboard(req: Request): any {
  if (req.path.replace(/^\//, '') !== 'reports/dashboard' || req.method !== 'GET') return undefined;
  const actor = { ...req.actor };
  allowed(actor, 'reports:read');
  const storeId = req.query.storeId ? uuid(req.query.storeId) : undefined;
  if (storeId) storeScope(actor, storeId);
  const days = Number(req.query.days ?? 7);
  if (![7, 30].includes(days)) fail('看板仅支持近7天或30天');
  const date = req.query.date ?? new Date(Date.now() + 28_800_000).toISOString().slice(0, 10);
  const [dayStart, to] = range({ date });
  const from = dayStart - (days - 1) * 86_400_000;
  const scope = accessibleStores(actor);
  const stores = rows('stores').filter(
    (store) => (!scope || scope.includes(store.id)) && (!storeId || store.id === storeId),
  );
  const storeIds = new Set(stores.map((store) => store.id));
  const scoped = (table: string) => scopeRows(actor, rows(table)).filter((row) => storeIds.has(row.storeId));
  const within = (value: string) => Date.parse(value) >= from && Date.parse(value) < to;
  const facts = saleFacts(actor, { from: new Date(from).toISOString(), to: new Date(to).toISOString(), storeId });
  const visits = scoped('checkins').filter((row) => row.status === 'succeeded' && within(row.enteredAt));
  const memberIds = new Set(scoped('memberStores').map((row) => row.memberId));
  const members = rows('members').filter((row) => memberIds.has(row.id));
  const buckets = Array.from({ length: days }, (_, index) => {
    const start = from + index * 86_400_000;
    const end = start + 86_400_000;
    const inDay = (value: string) => Date.parse(value) >= start && Date.parse(value) < end;
    return {
      date: new Date(start + 28_800_000).toISOString().slice(0, 10),
      netAmount: amount(facts.filter((fact) => inDay(fact.occurredAt)).reduce((sum, fact) => sum + fact.cents, 0n)),
      entries: visits.filter((visit) => inDay(visit.enteredAt)).length,
    };
  });
  const upcoming = scoped('courseSessions')
    .filter(
      (row) =>
        row.status === 'scheduled' &&
        Date.parse(row.startsAt) >= Date.now() &&
        Date.parse(row.startsAt) < Date.now() + 7 * 86_400_000,
    )
    .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
  const names = (table: string, id: string) => rows(table).find((row) => row.id === id)?.name ?? '—';
  return {
    id: 'dashboard',
    from: buckets[0]?.date,
    to: date,
    days,
    metrics: {
      netAmount: amount(facts.reduce((sum, fact) => sum + fact.cents, 0n)),
      entries: visits.length,
      newMembers: members.filter((member) => within(member.registeredAt)).length,
      activeMembers: members.filter((member) => member.status === 'active' && member.customerStage === 'member').length,
    },
    trend: buckets,
    memberSegments: [
      {
        name: '会员',
        value: members.filter((member) => member.status === 'active' && member.customerStage === 'member').length,
      },
      {
        name: '潜客',
        value: members.filter((member) => member.status === 'active' && member.customerStage === 'lead').length,
      },
      { name: '停用资料', value: members.filter((member) => member.status !== 'active').length },
    ],
    upcomingCount: upcoming.length,
    upcoming: req.actor.codes.includes('courses:read')
      ? upcoming
          .filter(
            (row: Row) =>
              actor.globalCodes.includes('courses:read') ||
              actor.storePermissions[row.storeId]?.includes('courses:read'),
          )
          .slice(0, 5)
          .map((row) => ({
            id: row.id,
            startsAt: row.startsAt,
            courseName: names('courseProducts', row.courseProductId),
            storeName: names('stores', row.storeId),
            capacity: row.capacity,
            reservedCount: rows('bookings').filter(
              (booking) => booking.sessionId === row.id && ['attended', 'confirmed'].includes(booking.status),
            ).length,
          }))
      : [],
  };
}
