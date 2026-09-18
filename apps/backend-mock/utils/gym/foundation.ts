import type { Request, Row } from './core';

import { revokeAccount } from './auth';
import {
  accessibleStores,
  allowed,
  choice,
  date,
  decorate,
  fail,
  find,
  insert,
  integer,
  listIds,
  memberScope,
  money,
  now,
  only,
  page,
  passwordHash,
  rows,
  scopeRows,
  storeScope,
  str,
  unique,
  uuid,
} from './core';
import { assignEmployeeSalary } from './payroll';
import { permissionCodes, storeCodes } from './state';

const storeFields = [
  'code',
  'name',
  'description',
  'areaSqm',
  'features',
  'address',
  'province',
  'city',
  'district',
  'longitude',
  'latitude',
  'servicePhone',
  'serviceWechat',
  'businessHours',
  'status',
];
const employeeFields = ['employeeNo', 'name', 'phone', 'jobTitle', 'hiredOn', 'leftOn', 'status', 'avatarFileId'];
const memberFields = ['phone', 'name', 'nickname', 'gender', 'birthday', 'avatarFileId'];
const cardFields = [
  'name',
  'kind',
  'durationDays',
  'includedUses',
  'price',
  'memberPrefix',
  'accessScope',
  'storeIds',
  'status',
];
const phone = (value: unknown) => {
  const p = str(value, '手机号', 32);
  if (!/^1\d{10}$/.test(p)) fail('手机号须为11位数字');
  return p;
};
const active = (value: unknown) => choice(value, ['active', 'inactive']);
function hq(request: Request, code: string) {
  allowed(request.actor, code);
  if (!request.actor.globalCodes.includes(code)) fail('需要总部权限', 403);
}
function validateStore(data: Record<string, any>) {
  data.code = str(data.code, '门店编码', 64);
  data.name = str(data.name, '门店名称');
  data.address = str(data.address, '门店地址', 500);
  data.areaSqm = money(data.areaSqm, '面积');
  if (!Array.isArray(data.features) || data.features.some((v: unknown) => typeof v !== 'string' || v.length > 120))
    fail('特色项目必须是文本列表');
  for (const [key, limit] of [
    ['longitude', 180],
    ['latitude', 90],
  ] as const)
    if (
      data[key] !== undefined &&
      data[key] !== null &&
      data[key] !== '' &&
      (!Number.isFinite(Number(data[key])) || Math.abs(Number(data[key])) > limit)
    )
      fail('经纬度不合法');
  if (
    !data.businessHours ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.businessHours.opens) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.businessHours.closes)
  )
    fail('营业时间格式为HH:mm');
  active(data.status);
  unique('stores', 'code', data.code, data.id);
}
function assignments(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) fail('至少选择一个所属门店');
  const result = value.map((a) => {
    only(a, ['storeId', 'isPrimary', 'isManager', 'joinedOn', 'endedOn']);
    const storeId = uuid(a.storeId);
    find('stores', storeId);
    const joinedOn = date(a.joinedOn, '入店日期');
    if (a.endedOn && date(a.endedOn, '离店日期') < joinedOn) fail('离店不能早于入店');
    return {
      storeId,
      joinedOn,
      endedOn: a.endedOn ?? null,
      isPrimary: !!a.isPrimary,
      isManager: !!a.isManager,
    };
  });
  if (
    new Set(result.map((a) => a.storeId)).size !== result.length ||
    result.filter((a) => a.isPrimary && !a.endedOn).length > 1
  )
    fail('门店不可重复，主要门店最多一个');
  return result;
}
function publicEmployee(employee: Row, req: Request) {
  const permitted = accessibleStores(req.actor);
  const links = employee.storeAssignments.filter((a: Row) => !permitted || permitted.includes(a.storeId));
  if (permitted && links.length === 0) fail('员工不可访问', 404);
  const account = rows('accounts').find((a) => a.employeeId === employee.id);
  return {
    ...employee,
    storeIds: links.map((a: Row) => a.storeId),
    storeAssignments: links,
    accountId: account?.id,
    username: account?.username,
    accountStatus: account?.status,
  };
}
function keepAdministrator(accounts = rows('accounts'), roles = rows('roles')) {
  if (
    !accounts.some(
      (a) =>
        a.status === 'active' &&
        (!a.employeeId || find('employees', a.employeeId).status === 'active') &&
        a.assignments.some((link: Row) =>
          roles.some(
            (r) =>
              r.id === link.roleId &&
              r.status === 'active' &&
              r.scopeType === 'hq' &&
              r.permissionCodes.includes('accounts:write') &&
              r.permissionCodes.includes('roles:write'),
          ),
        ),
    )
  )
    fail('至少保留一名有效总部权限管理员', 409);
}
function cardVisible(row: Row, req: Request) {
  const permitted = accessibleStores(req.actor);
  return (
    !permitted ||
    (row.status === 'published' &&
      (row.accessScope === 'all' || row.storeIds.some((s: string) => permitted.includes(s))))
  );
}

export function foundation(req: Request): unknown {
  const { method, body, query, actor } = req;
  const [resource, rid, child] = req.path.split('/').filter(Boolean);
  if (
    !resource ||
    !['accounts', 'card-templates', 'employees', 'members', 'permissions', 'roles', 'stores'].includes(resource)
  )
    return undefined;
  if (req.path.split('/').filter(Boolean).length > 3) fail('接口不存在', 404);
  if (rid) uuid(rid);
  if (resource === 'stores') {
    allowed(actor, method === 'GET' ? 'stores:read' : 'stores:write');
    if (query.storeId) storeScope(actor, query.storeId);
    if (method !== 'GET') hq(req, 'stores:write');
    if (!rid && method === 'GET')
      return page(
        rows('stores').filter((s) => accessibleStores(actor)?.includes(s.id) ?? true),
        query,
      );
    if (!rid && method === 'POST') {
      only(body, storeFields);
      const data = { description: '', features: [], status: 'active', ...body };
      validateStore(data);
      return insert('stores', { ...data, media: [] });
    }
    if (rid) {
      const row = storeScope(actor, rid);
      if (method === 'GET' && !child) return row;
      if (method === 'PATCH' && !child) {
        only(body, storeFields);
        const next = { ...row, ...body };
        validateStore(next);
        Object.assign(row, next, { updatedAt: now() });
        return row;
      }
      if (method === 'PUT' && child === 'media') {
        only(body, ['items']);
        if (!Array.isArray(body.items)) fail('媒体列表不能为空');
        if (body.items.filter((i: Row) => i.isCover).length > 1) fail('只能设置一个封面');
        const items = body.items.map((i: Row) => {
          const f = find('files', uuid(i.fileId));
          if (f.storeId !== rid || !['image', 'video'].includes(f.category)) fail('媒体不属于该店或类型错误');
          return {
            fileId: f.id,
            caption: String(i.caption ?? ''),
            isCover: !!i.isCover,
            sortOrder: integer(i.sortOrder ?? 0, '排序'),
            name: f.originalName,
            category: f.category,
          };
        });
        if (new Set(items.map((i) => i.fileId)).size !== items.length) fail('不可重复添加媒体');
        row.media = items;
        return row;
      }
    }
  }
  if (resource === 'employees') {
    allowed(actor, method === 'GET' ? 'employees:read' : 'employees:write');
    if (query.storeId) storeScope(actor, query.storeId);
    if (method !== 'GET') hq(req, child === 'account' ? 'accounts:write' : 'employees:write');
    if (!rid && method === 'GET') {
      const permitted = accessibleStores(actor);
      return page(
        rows('employees')
          .filter(
            (e) =>
              (!permitted || e.storeIds.some((s: string) => permitted.includes(s))) &&
              (!query.storeId || e.storeIds.includes(query.storeId)),
          )
          .map((e) => publicEmployee(e, req)),
        { ...query, storeId: undefined },
      );
    }
    if (!rid && method === 'POST') {
      only(body, [...employeeFields, 'storeAssignments', 'username', 'password']);
      const employeeNo = str(body.employeeNo, '工号', 64);
      unique('employees', 'employeeNo', employeeNo);
      const data: Record<string, any> = {
        ...body,
        employeeNo,
        name: str(body.name, '姓名'),
        phone: phone(body.phone),
        hiredOn: date(body.hiredOn, '入职日期'),
        status: active(body.status ?? 'active'),
      };
      const links = assignments(body.storeAssignments);
      if (body.username) {
        str(body.username, '用户名', 64);
        unique('accounts', 'username', body.username);
        if (str(body.password, '密码', 128).length < 6) fail('密码至少6位');
      }
      delete data.username;
      delete data.password;
      const employee = insert('employees', {
        ...data,
        storeAssignments: links,
        storeIds: links.filter((a) => !a.endedOn).map((a) => a.storeId),
      });
      if (body.username)
        insert('accounts', {
          employeeId: employee.id,
          username: body.username,
          realName: employee.name,
          passwordHash: passwordHash(body.password),
          status: 'active',
          assignments: [],
        });
      return publicEmployee(employee, req);
    }
    if (rid) {
      const row = find('employees', rid);
      publicEmployee(row, req);
      if (method === 'GET' && !child) return publicEmployee(row, req);
      if (method === 'PATCH' && !child) {
        only(body, [...employeeFields.filter((f) => f !== 'employeeNo'), 'salaryAssignment', 'storeAssignments']);
        const { salaryAssignment, storeAssignments, ...profile } = body;
        const next = { ...row, ...profile };
        str(next.name, '姓名');
        phone(next.phone);
        date(next.hiredOn, '入职日期');
        active(next.status);
        if (next.leftOn && date(next.leftOn, '离职日期') < next.hiredOn) fail('离职早于入职');
        if (storeAssignments !== undefined) {
          const links = assignments(storeAssignments);
          const storeIds = links.filter((a) => !a.endedOn).map((a) => a.storeId);
          const account = rows('accounts').find((a) => a.employeeId === rid);
          if (account?.assignments.some((a: Row) => a.storeId && !storeIds.includes(a.storeId)))
            fail('请先移除离店员工的对应门店授权', 409);
          Object.assign(next, { storeAssignments: links, storeIds });
        }
        if (next.status !== 'active') {
          const account = rows('accounts').find((a) => a.employeeId === rid);
          if (account)
            keepAdministrator(rows('accounts').map((a) => (a.id === account.id ? { ...a, status: 'inactive' } : a)));
        }
        if (salaryAssignment !== undefined) {
          const previous = { storeIds: row.storeIds, storeAssignments: row.storeAssignments };
          try {
            // Salary validation must use the membership being saved in this same request.
            Object.assign(row, { storeIds: next.storeIds, storeAssignments: next.storeAssignments });
            assignEmployeeSalary(req, rid, salaryAssignment);
          } finally {
            Object.assign(row, previous);
          }
        }
        Object.assign(row, next, { updatedAt: now() });
        rows('accounts')
          .filter((a) => a.employeeId === rid)
          .forEach((a) => {
            a.realName = row.name;
            if (row.status !== 'active') revokeAccount(a.id);
          });
        return publicEmployee(row, req);
      }
      if (method === 'PUT' && child === 'stores') {
        only(body, ['storeAssignments']);
        const links = assignments(body.storeAssignments);
        const storeIds = links.filter((a) => !a.endedOn).map((a) => a.storeId);
        const account = rows('accounts').find((a) => a.employeeId === rid);
        if (account?.assignments.some((a: Row) => a.storeId && !storeIds.includes(a.storeId)))
          fail('请先移除离店员工的对应门店授权', 409);
        Object.assign(row, { storeAssignments: links, storeIds });
        return publicEmployee(row, req);
      }
      if (method === 'POST' && child === 'account') {
        only(body, ['username', 'password']);
        if (rows('accounts').some((a) => a.employeeId === rid)) fail('该员工已有账号', 409);
        const username = str(body.username, '用户名', 64);
        unique('accounts', 'username', username);
        if (str(body.password, '密码', 128).length < 6) fail('密码至少6位');
        const a = insert('accounts', {
          employeeId: rid,
          username,
          realName: row.name,
          passwordHash: passwordHash(body.password),
          status: 'active',
          assignments: [],
        });
        return { id: a.id, username, status: a.status };
      }
    }
  }
  if (resource === 'permissions') {
    hq(req, 'roles:read');
    if (method === 'GET' && !rid) return rows('permissions');
  }
  if (resource === 'roles') {
    hq(req, method === 'GET' ? 'roles:read' : 'roles:write');
    if (!rid && method === 'GET') return page(rows('roles'), query);
    if (!rid && method === 'POST') {
      only(body, ['code', 'name', 'scopeType', 'permissionCodes']);
      const code = str(body.code, '角色编码', 64);
      unique('roles', 'code', code);
      const scopeType = choice(body.scopeType, ['hq', 'store'], '数据范围');
      const codes = validateCodes(body.permissionCodes, scopeType, actor);
      return insert('roles', {
        code,
        name: str(body.name, '角色名称'),
        scopeType,
        permissionCodes: codes,
        status: 'active',
      });
    }
    if (rid) {
      const row = find('roles', rid);
      if (!child && method === 'GET') return row;
      if (!child && method === 'PATCH') {
        only(body, ['name', 'status']);
        const next = { ...row, ...body };
        str(next.name, '角色名称');
        active(next.status);
        keepAdministrator(
          rows('accounts'),
          rows('roles').map((r) => (r.id === rid ? next : r)),
        );
        Object.assign(row, next);
        return row;
      }
      if (child === 'permissions' && method === 'PUT') {
        only(body, ['permissionCodes']);
        const codes = validateCodes(body.permissionCodes, row.scopeType, actor);
        const next = { ...row, permissionCodes: codes };
        keepAdministrator(
          rows('accounts'),
          rows('roles').map((r) => (r.id === rid ? next : r)),
        );
        Object.assign(row, next);
        return row;
      }
    }
  }
  if (resource === 'accounts' && rid) {
    hq(req, method === 'GET' ? 'accounts:read' : 'accounts:write');
    const row = find('accounts', rid);
    if (child === 'roles' && method === 'GET') return row.assignments;
    if (child === 'roles' && method === 'PUT') {
      only(body, ['assignments']);
      if (!Array.isArray(body.assignments)) fail('授权必须为列表');
      const links = body.assignments.map((a: Row) => {
        only(a, ['roleId', 'storeId']);
        const role = find('roles', uuid(a.roleId));
        if (role.permissionCodes.some((c: string) => !actor.globalCodes.includes(c)))
          fail('不能授予自己没有的权限', 403);
        if (role.scopeType === 'hq') {
          if (a.storeId) fail('总部角色不指定门店');
          return { roleId: role.id };
        }
        const storeId = uuid(a.storeId, '授权门店');
        find('stores', storeId);
        if (!row.employeeId || !find('employees', row.employeeId).storeIds.includes(storeId))
          fail('员工不在此门店任职');
        return { roleId: role.id, storeId };
      });
      if (new Set(links.map((a) => `${a.roleId}:${a.storeId ?? ''}`)).size !== links.length) fail('授权重复');
      keepAdministrator(rows('accounts').map((a) => (a.id === rid ? { ...a, assignments: links } : a)));
      row.assignments = links;
      return links;
    }
    if (child === 'password' && method === 'PUT') {
      only(body, ['password']);
      const password = str(body.password, '密码', 128);
      if (password.length < 6) fail('密码至少6位');
      row.passwordHash = passwordHash(password);
      revokeAccount(rid);
      return { id: rid };
    }
    if (!child && method === 'PATCH') {
      only(body, ['status']);
      const status = active(body.status);
      keepAdministrator(rows('accounts').map((a) => (a.id === rid ? { ...a, status } : a)));
      row.status = status;
      if (status !== 'active') revokeAccount(rid);
      return { id: rid, status };
    }
  }
  if (resource === 'members') {
    allowed(actor, method === 'GET' ? 'members:read' : 'members:write');
    if (query.storeId) storeScope(actor, query.storeId);
    if (!rid && method === 'GET') {
      const links = scopeRows(actor, rows('memberStores')).filter((r) => !query.storeId || r.storeId === query.storeId);
      let data = rows('members').filter((m) => links.some((l) => l.memberId === m.id));
      if (query.customerStage) data = data.filter((m) => m.customerStage === query.customerStage);
      for (const [key, table] of [
        ['cardExpiresWithinDays', 'memberCards'],
        ['courseExpiresWithinDays', 'memberCoursePacks'],
      ] as const)
        if (query[key]) {
          const days = integer(query[key], '临期天数', 1, 365);
          data = data.filter((m) =>
            scopeRows(actor, rows(table)).some(
              (c) =>
                c.memberId === m.id &&
                c.status === 'active' &&
                Date.parse(c.expiresAt) >= Date.now() &&
                Date.parse(c.expiresAt) <= Date.now() + days * 86_400_000,
            ),
          );
        }
      if (query.hasPersonalTraining === 'true')
        data = data.filter((m) => scopeRows(actor, rows('memberCoursePacks')).some((c) => c.memberId === m.id));
      return page(
        data.map((m) => ({
          ...m,
          storeIds: links.filter((l) => l.memberId === m.id).map((l) => l.storeId),
          storeNames: links
            .filter((l) => l.memberId === m.id)
            .map((l) => find('stores', l.storeId).name)
            .join('、'),
        })),
        { ...query, storeId: undefined },
        'registeredAt',
      );
    }
    if (!rid && method === 'POST') {
      only(body, [...memberFields, 'storeId']);
      const storeId = uuid(body.storeId);
      storeScope(actor, storeId);
      const p = phone(body.phone);
      const exists = rows('members').find((m) => m.phone === p);
      if (exists) {
        memberScope(actor, exists.id);
        if (rows('memberStores').some((l) => l.memberId === exists.id && l.storeId === storeId))
          fail('会员已在该店建档', 409);
        insert('memberStores', {
          memberId: exists.id,
          storeId,
          joinedAt: now(),
          status: 'active',
        });
        return exists;
      }
      if (body.gender) choice(body.gender, ['male', 'female', 'unspecified'], '性别');
      if (body.birthday) date(body.birthday, '生日');
      const member = insert('members', {
        ...body,
        phone: p,
        memberNo: `M${Date.now()}${rows('members').length}`,
        registeredStoreId: storeId,
        customerStage: 'lead',
        status: 'active',
        source: 'web',
        registeredAt: now(),
      });
      delete member.storeId;
      insert('memberStores', {
        memberId: member.id,
        storeId,
        joinedAt: now(),
        status: 'active',
      });
      return member;
    }
    if (rid) {
      const row = memberScope(actor, rid);
      if (method === 'GET' && !child)
        return {
          ...row,
          stores: scopeRows(actor, rows('memberStores'))
            .filter((l) => l.memberId === rid)
            .map((l) => ({
              id: l.storeId,
              name: find('stores', l.storeId).name,
            })),
          cards: memberCards(req, rid),
          coursePacks: memberCoursePacks(req, rid),
        };
      if (method === 'GET' && child === 'cards') return page(memberCards(req, rid), query);
      if (method === 'GET' && child === 'course-packs') return page(memberCoursePacks(req, rid), query);
      if (method === 'PATCH' && !child) {
        only(
          body,
          memberFields.filter((f) => f !== 'phone'),
        );
        if (body.name !== undefined) str(body.name, '姓名');
        if (body.gender) choice(body.gender, ['male', 'female', 'unspecified'], '性别');
        if (body.birthday) date(body.birthday, '生日');
        Object.assign(row, body, { updatedAt: now() });
        return row;
      }
    }
  }
  if (resource === 'card-templates') {
    allowed(actor, method === 'GET' ? 'cards:read' : 'cards:write');
    if (query.storeId) storeScope(actor, uuid(query.storeId));
    if (method !== 'GET') hq(req, 'cards:write');
    if (!rid && method === 'GET')
      return page(
        rows('cardTemplates').filter(
          (r) =>
            cardVisible(r, req) && (!query.storeId || r.accessScope === 'all' || r.storeIds.includes(query.storeId)),
        ),
        { ...query, storeId: undefined },
      );
    const row = rid ? find('cardTemplates', rid) : undefined;
    if (row && !cardVisible(row, req)) fail('卡种不可访问', 404);
    if (method === 'GET' && row && !child) return row;
    if ((method === 'POST' && (!rid || child === 'versions')) || (method === 'PATCH' && row && !child)) {
      only(body, cardFields);
      if (method === 'PATCH' && row?.status !== 'draft' && Object.keys(body).some((k) => k !== 'status'))
        fail('已发布卡种请创建新版本', 409);
      const data = {
        status: 'draft',
        storeIds: [],
        ...row,
        ...(method === 'POST' ? { status: 'draft' } : {}),
        ...body,
      } as Row;
      data.name = str(data.name, '卡种名称');
      data.kind = choice(data.kind, ['period', 'count'], '卡种类型');
      data.price = money(data.price);
      data.accessScope = choice(data.accessScope, ['all', 'selected'], '适用范围');
      data.storeIds = listIds(data.storeIds, '适用门店');
      data.storeIds.forEach((s: string) => find('stores', s));
      if (data.accessScope === 'selected' && data.storeIds.length === 0) fail('至少选择一家适用门店');
      if (data.kind === 'period') {
        data.durationDays = integer(data.durationDays, '有效天数', 1, 36_500);
        data.includedUses = null;
      } else {
        data.includedUses = integer(data.includedUses, '可用次数', 1);
        data.durationDays = null;
      }
      choice(data.status, ['draft', 'published', 'inactive']);
      if (method === 'PATCH') {
        if (!row) fail('记录不存在', 404);
        Object.assign(row, data, { updatedAt: now() });
        return row;
      }
      const { id: _id, createdAt: _created, updatedAt: _updated, ...copy } = data;
      const version = row
        ? Math.max(
            ...rows('cardTemplates')
              .filter((r) => r.templateKey === row.templateKey)
              .map((r) => r.version),
          ) + 1
        : 1;
      const result = insert('cardTemplates', { ...copy, version });
      result.templateKey = row?.templateKey ?? result.id;
      return result;
    }
  }
  return undefined;
}
function validateCodes(value: unknown, scope: string, actor: Request['actor']) {
  if (
    !Array.isArray(value) ||
    value.some(
      (c) =>
        !permissionCodes.includes(c) ||
        !actor.globalCodes.includes(c) ||
        (scope === 'store' && !storeCodes.includes(c)),
    )
  )
    fail('包含未知、越权或不适用于门店的权限');
  return [...new Set(value)];
}
function memberCoursePacks(req: Request, memberId: string) {
  return scopeRows(req.actor, rows('memberCoursePacks'))
    .filter((pack) => pack.memberId === memberId)
    .map((pack) => ({
      ...pack,
      assignedCoachName: rows('employees').find((employee) => employee.id === pack.assignedCoachId)?.name ?? null,
    }));
}
function memberCards(req: Request, memberId: string) {
  const permitted = accessibleStores(req.actor);
  return rows('memberCards')
    .filter(
      (c) =>
        c.memberId === memberId &&
        (!permitted ||
          permitted.includes(c.issuedStoreId) ||
          c.accessScope === 'all' ||
          c.storeIds.some((s: string) => permitted.includes(s))),
    )
    .map((c) => {
      const { orderItemId: _orderItem, templateSnapshot: _snapshot, ...display } = c;
      return decorate(display as Row);
    });
}
