import type { Actor, Request, Row } from './core';

import {
  allowed,
  choice,
  date,
  decorate,
  fail,
  find,
  insert,
  integer,
  memberScope,
  money,
  now,
  only,
  page,
  range,
  rows,
  scopeRows,
  storeScope,
  str,
  uuid,
} from './core';

const resources: Record<string, [string, string, string]> = {
  'course-products': ['courseProducts', 'courses', 'createdAt'],
  'course-sessions': ['courseSessions', 'courses', 'startsAt'],
  bookings: ['bookings', 'bookings', 'bookedAt'],
  checkins: ['checkins', 'checkins', 'enteredAt'],
  'lesson-records': ['lessonRecords', 'lessons', 'confirmedAt'],
  'body-measurements': ['bodyMeasurements', 'measurements', 'measuredAt'],
  'qr-codes': ['qrCodes', 'courses', 'createdAt'],
};
function scoped(actor: Actor, table: string, value: string) {
  const row = find(table, uuid(value));
  storeScope(actor, row.storeId);
  return row;
}
function coach(actor: Actor, employeeId: string, storeId: string) {
  storeScope(actor, storeId);
  const employee = find('employees', uuid(employeeId, '教练'));
  if (
    employee.status !== 'active' ||
    !employee.storeIds.includes(storeId) ||
    !rows('coachProfiles').some((c) => c.employeeId === employee.id && c.status === 'active')
  )
    fail('请选择本店在职教练');
}
function activeBooking(row: Row) {
  return ['attended', 'confirmed'].includes(row.status);
}
function view(row: Row) {
  const session = rows('courseSessions').find((s) => s.id === row.sessionId);
  const courseName = rows('courseProducts').find(
    (c) => c.id === (row.courseProductId ?? session?.courseProductId),
  )?.name;
  return {
    ...decorate(row),
    name: row.name ?? `${courseName ?? ''} ${row.startsAt ?? ''}`,
    courseName,
    sessionStartsAt: session?.startsAt,
    reservedCount: rows('bookings').filter((b) => b.sessionId === row.id && activeBooking(b)).length,
  };
}
function cancelBooking(row: Row, note?: string) {
  if (row.memberCoursePackId) {
    const pack = find('memberCoursePacks', row.memberCoursePackId);
    pack.reservedSessions -= 1;
  }
  Object.assign(row, {
    status: 'cancelled',
    cancelledAt: now(),
    updatedAt: now(),
    note: note ?? row.note,
  });
}
function validateSession(actor: Actor, data: Record<string, any>, except?: string) {
  storeScope(actor, data.storeId);
  const product = scoped(actor, 'courseProducts', data.courseProductId);
  if (product.storeId !== data.storeId || product.status !== 'active' || product.kind !== 'group')
    fail('请选择本店启用的操课产品');
  coach(actor, data.coachId, data.storeId);
  data.startsAt = new Date(date(data.startsAt, '开课时间')).toISOString();
  data.endsAt = new Date(date(data.endsAt, '结束时间')).toISOString();
  if (data.startsAt >= data.endsAt) fail('结束时间必须晚于开课时间');
  data.capacity = integer(data.capacity, '容量', 1, 1000);
  data.room = data.room ? str(data.room, '场地', 120) : '';
  if (
    rows('courseSessions').some(
      (s) =>
        s.id !== except &&
        s.status !== 'cancelled' &&
        s.startsAt < data.endsAt &&
        s.endsAt > data.startsAt &&
        (s.coachId === data.coachId || (data.room && s.storeId === data.storeId && s.room === data.room)),
    )
  )
    fail('教练或场地在该时间已有排课', 409);
}
const measurementFields = ['heightCm', 'weightKg', 'bodyFatPercent', 'muscleMassKg'];
function validateMeasurement(actor: Actor, data: Row) {
  memberScope(actor, uuid(data.memberId), uuid(data.storeId));
  data.measuredAt = new Date(date(data.measuredAt, '体测时间')).toISOString();
  if (Date.parse(data.measuredAt) > Date.now() + 60_000) fail('体测时间不能在未来');
  const bounds: Record<string, [number, number]> = {
    heightCm: [30, 300],
    weightKg: [1, 700],
    bodyFatPercent: [0, 100],
    muscleMassKg: [0, 500],
  };
  for (const field of measurementFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      data[field] = null;
      continue;
    }
    const limits = bounds[field];
    if (
      !limits ||
      !/^\d{1,3}(\.\d{1,3})?$/.test(String(data[field])) ||
      Number(data[field]) < limits[0] ||
      Number(data[field]) > limits[1]
    )
      fail(`${field}数值超出范围`);
    data[field] = String(data[field]);
  }
  if (data.muscleMassKg && data.weightKg && Number(data.muscleMassKg) > Number(data.weightKg))
    fail('肌肉量不能超过体重');
  if (!Array.isArray(data.measurements) || data.measurements.length > 50) fail('其他测量项必须为最多50项的列表');
  data.measurements = data.measurements.map((m: Record<string, any>) => {
    only(m, ['name', 'value', 'unit']);
    return {
      name: str(m.name, '测量项', 80),
      value: str(String(m.value ?? ''), '测量值', 100),
      unit: str(m.unit, '单位', 20),
    };
  });
  if (data.reportFileId) {
    const file = scoped(actor, 'files', uuid(data.reportFileId));
    if (file.storeId !== data.storeId || file.category !== 'body_report') fail('体测附件必须属于本店且为体测报告');
  }
  if (!measurementFields.some((f) => data[f] !== null) && !data.reportFileId && data.measurements.length === 0)
    fail('至少填写一项测量值或上传报告');
  if (data.note) data.note = str(data.note, '备注', 2000);
}
export function training(req: Request): any {
  const { actor, method, body, query } = req;
  const [resource = '', rid, action] = req.path.split('/').filter(Boolean);
  if (resource === 'coaches' && method === 'GET' && !rid) {
    allowed(actor, 'courses:read');
    if (query.storeId) storeScope(actor, uuid(query.storeId));
    return page(
      scopeRows(
        actor,
        rows('employees').flatMap((e) => e.storeIds.map((storeId: string) => ({ ...e, storeId }))),
      )
        .filter(
          (e) =>
            e.status === 'active' && rows('coachProfiles').some((c) => c.employeeId === e.id && c.status === 'active'),
        )
        .map((r) => decorate(r)),
      query,
    );
  }
  const config = resources[resource];
  if (!config) return undefined;
  if (action) fail('接口不存在', 404);
  const [table, permission, timeField] = config;
  allowed(actor, `${permission}:${method === 'GET' ? 'read' : 'write'}`);
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  if (query.memberId) memberScope(actor, uuid(query.memberId), query.storeId);
  if (query.sessionId) scoped(actor, 'courseSessions', query.sessionId);
  if (resource === 'checkins' && rid === 'summary' && method === 'GET') {
    const q = {
      ...query,
      date: query.date ?? new Date(Date.now() + 28_800_000).toISOString().slice(0, 10),
    };
    const [from, to] = range(q);
    const all = scopeRows(actor, rows(table)).filter(
      (r) => (!query.storeId || r.storeId === query.storeId) && r.status === 'succeeded',
    );
    const today = all.filter((r) => Date.parse(r.enteredAt) >= from && Date.parse(r.enteredAt) < to);
    return {
      entries: today.length,
      members: new Set(today.map((r) => r.memberId).filter(Boolean)).size,
      visitors: today.filter((r) => !r.memberId).length,
      yesterdayEntries: all.filter(
        (r) => Date.parse(r.enteredAt) >= from - 86_400_000 && Date.parse(r.enteredAt) < from,
      ).length,
    };
  }
  const row = rid ? scoped(actor, table, rid) : undefined;
  if (method === 'GET')
    return row
      ? view(row)
      : page(
          scopeRows(actor, rows(table)).map((r) => view(r)),
          query,
          timeField,
        );
  if (resource === 'course-products') {
    if (row && row.kind !== 'group') fail('私教销售产品本版仅可查看', 403);
    only(
      body,
      row
        ? ['name', 'description', 'durationMinutes', 'sessionCount', 'price', 'status']
        : ['storeId', 'name', 'kind', 'description', 'durationMinutes', 'sessionCount', 'price'],
    );
    if ((method === 'POST' && !row) || (method === 'PATCH' && row)) {
      const data = { kind: 'group', status: 'active', ...row, ...body } as Row;
      storeScope(actor, uuid(data.storeId));
      data.name = str(data.name, '课程名称');
      choice(data.kind, ['group'], '课程类型');
      choice(data.status, ['active', 'inactive']);
      data.sessionCount = integer(data.sessionCount, '课次', 1, 1000);
      data.durationMinutes = integer(data.durationMinutes, '时长', 1, 1440);
      data.price = money(data.price);
      data.description = data.description ? str(data.description, '介绍', 5000) : '';
      return row ? Object.assign(row, data, { updatedAt: now() }) : insert(table, data);
    }
  }
  if (resource === 'course-sessions') {
    only(
      body,
      row
        ? ['room', 'startsAt', 'endsAt', 'capacity', 'status']
        : ['storeId', 'courseProductId', 'coachId', 'room', 'startsAt', 'endsAt', 'capacity'],
    );
    if (row && method === 'PATCH') {
      if (row.status !== 'scheduled') fail('仅可调整未结束且未取消的排课', 409);
      const bookings = rows('bookings').filter((b) => b.sessionId === row.id && activeBooking(b));
      const data = { ...row, ...body };
      choice(data.status, ['scheduled', 'cancelled']);
      if (data.status === 'cancelled') {
        if (bookings.some((b) => b.status === 'attended')) fail('已有签课记录，不能取消课程', 409);
        bookings.forEach((b) => cancelBooking(b, '排课取消'));
        return Object.assign(row, { status: 'cancelled', updatedAt: now() });
      }
      if (
        bookings.length > 0 &&
        ((body.startsAt && Date.parse(body.startsAt) !== Date.parse(row.startsAt)) ||
          (body.endsAt && Date.parse(body.endsAt) !== Date.parse(row.endsAt)))
      )
        fail('已有预约不能直接调整上课时间', 409);
      validateSession(actor, data, row.id);
      if (data.capacity < bookings.length) fail('容量不能小于已预约人数', 409);
      return Object.assign(row, data, { updatedAt: now() });
    }
    if (!row && method === 'POST') {
      const data: Record<string, any> = { ...body, status: 'scheduled' };
      validateSession(actor, data);
      if (Date.parse(data.startsAt) <= Date.now()) fail('新排课开始时间必须在未来');
      return insert(table, data);
    }
  }
  if (resource === 'bookings') {
    if (row && method === 'PATCH') {
      only(body, ['status', 'note']);
      choice(body.status, ['cancelled']);
      if (row.status !== 'confirmed') fail('只有待上课预约可以取消', 409);
      cancelBooking(row, body.note ? str(body.note, '备注', 2000) : undefined);
      return view(row);
    }
    if (!row && method === 'POST') {
      only(body, ['sessionId', 'memberId', 'memberCoursePackId', 'memberCardId', 'note']);
      const session = scoped(actor, 'courseSessions', body.sessionId);
      memberScope(actor, uuid(body.memberId), session.storeId);
      if (session.status !== 'scheduled' || Date.parse(session.startsAt) <= Date.now())
        fail('该课程已开始或不可预约', 409);
      if (
        rows('blacklists').some(
          (b) =>
            b.memberId === body.memberId &&
            !b.revokedAt &&
            b.blockEntry &&
            Date.parse(b.startsAt) <= Date.now() &&
            (!b.endsAt || Date.parse(b.endsAt) > Date.now()),
        )
      )
        fail('会员被禁止入场', 409);
      const occupied = rows('bookings').filter((b) => b.sessionId === session.id && activeBooking(b));
      if (occupied.some((b) => b.memberId === body.memberId)) fail('会员已预约该课程', 409);
      if (occupied.length >= session.capacity) fail('课程名额已满', 409);
      if (!!body.memberCardId === !!body.memberCoursePackId) fail('请选择且仅选择一种预约权益');
      let pack: Row | undefined;
      if (body.memberCoursePackId) {
        pack = scoped(actor, 'memberCoursePacks', body.memberCoursePackId);
        if (
          pack.memberId !== body.memberId ||
          pack.storeId !== session.storeId ||
          pack.courseProductId !== session.courseProductId ||
          pack.status !== 'active' ||
          pack.startsAt > session.startsAt ||
          (pack.expiresAt && pack.expiresAt <= session.endsAt) ||
          pack.remainingSessions - pack.reservedSessions < 1
        )
          fail('课程包不适用、已过期或可预约次数不足', 409);
      } else {
        const card = find('memberCards', uuid(body.memberCardId));
        if (
          card.memberId !== body.memberId ||
          card.status !== 'active' ||
          card.startsAt > session.startsAt ||
          (card.expiresAt && card.expiresAt <= session.endsAt) ||
          (card.accessScope !== 'all' && !card.storeIds.includes(session.storeId))
        )
          fail('会员卡不适用于本场课程', 409);
        if (card.remainingUses !== undefined && card.remainingUses !== null) {
          const reserved = rows('bookings').filter(
            (b) => b.memberCardId === card.id && b.status === 'confirmed',
          ).length;
          if (card.remainingUses - reserved < 1) fail('会员卡可预约次数不足', 409);
        }
      }
      const note = body.note ? str(body.note, '备注', 2000) : '';
      if (pack) pack.reservedSessions += 1;
      return view(
        insert(table, {
          ...body,
          storeId: session.storeId,
          note,
          status: 'confirmed',
          bookedAt: now(),
          source: 'web',
        }),
      );
    }
  }
  if (resource === 'body-measurements' && ((!row && method === 'POST') || (row && method === 'PATCH'))) {
    only(body, [
      ...measurementFields,
      'measurements',
      'reportFileId',
      'note',
      ...(row ? [] : ['storeId', 'memberId', 'measuredAt']),
    ]);
    const data = { measurements: [], ...row, ...body } as Row;
    validateMeasurement(actor, data);
    const audit = { updatedBy: actor.id, updatedAt: now() };
    return row ? Object.assign(row, data, audit) : insert(table, { ...data, ...audit, createdBy: actor.id });
  }
  if (resource === 'qr-codes' && !row && method === 'POST') {
    only(body, ['storeId', 'platform', 'sceneType', 'sceneId']);
    storeScope(actor, uuid(body.storeId));
    choice(body.platform, ['miniapp', 'app'], '平台');
    choice(body.sceneType, ['store', 'course'], '场景');
    if (body.sceneType === 'course' && scoped(actor, 'courseSessions', body.sceneId).storeId !== body.storeId)
      fail('课程不属于该门店');
    fail('尚未配置小程序/App渠道或落地链接，无法生成可用二维码', 503);
  }
  fail('接口不存在', 404);
}
