import type { Request, Row } from './core';

import {
  allowed,
  audit,
  boolean,
  choice,
  date,
  decorate,
  fail,
  find,
  insert,
  integer,
  memberScope,
  now,
  only,
  page,
  rows,
  scopeRows,
  storeScope,
  str,
  uuid,
} from './core';

function hq(req: Request, code: string) {
  allowed(req.actor, code);
  if (!req.actor.globalCodes.includes(code)) fail('仅总部可配置', 403);
}
function displayDevice(row: Row) {
  const { credentialRef: _credentialRef, connectionSecretRef: _secret, ...data } = row;
  return {
    ...decorate(data as Row),
    online: row.provider === 'mock' && row.status === 'active',
    compartments: rows('compartments').filter((c) => c.deviceId === row.id),
  };
}
function blacklist(row: Row) {
  let status = 'active';
  if (row.revokedAt) status = 'revoked';
  else if (Date.parse(row.startsAt) > Date.now()) status = 'scheduled';
  else if (row.endsAt && Date.parse(row.endsAt) <= Date.now()) status = 'expired';
  return { ...decorate(row), status };
}
export function devices(req: Request): any {
  const { actor, body, query, method } = req;
  const [resource = '', rid, action, childId, extra] = req.path.split('/').filter(Boolean);
  if (!['blacklists', 'device-commands', 'devices', 'equipment'].includes(resource)) return undefined;
  if (extra) fail('接口不存在', 404);
  if (rid) uuid(rid);
  if (resource === 'blacklists') {
    hq(req, method === 'GET' ? 'blacklist:read' : 'blacklist:write');
    if (action) fail('接口不存在', 404);
    if (query.memberId) memberScope(actor, uuid(query.memberId));
    const row = rid ? find('blacklists', rid) : undefined;
    if (method === 'GET')
      return row
        ? blacklist(row)
        : page(
            rows('blacklists').map((r) => blacklist(r)),
            query,
          );
    if ((method === 'POST' && !row) || (method === 'PATCH' && row)) {
      only(
        body,
        row
          ? ['blockEntry', 'blockPurchase', 'reason', 'endsAt', 'revoked']
          : ['memberId', 'blockEntry', 'blockPurchase', 'reason', 'startsAt', 'endsAt'],
      );
      if (row?.revokedAt) fail('已撤销记录不能修改', 409);
      if (row && body.revoked === true) {
        Object.assign(row, { revokedAt: now(), updatedAt: now() });
        audit(req, 'blacklist.revoke', row);
        return blacklist(row);
      }
      if (body.revoked !== undefined) boolean(body.revoked, '撤销');
      const data = { ...row, ...body } as Row;
      memberScope(actor, uuid(data.memberId));
      data.blockEntry = boolean(data.blockEntry, '禁止进入');
      data.blockPurchase = boolean(data.blockPurchase, '禁止购买');
      if (!data.blockEntry && !data.blockPurchase) fail('至少选择一种限制');
      data.reason = str(data.reason, '限制原因', 2000);
      data.startsAt = new Date(date(data.startsAt, '生效时间')).toISOString();
      if (data.endsAt) data.endsAt = new Date(date(data.endsAt, '结束时间')).toISOString();
      if (data.endsAt && data.endsAt <= data.startsAt) fail('结束时间必须晚于生效时间');
      if (rows('blacklists').some((r) => r.id !== rid && r.memberId === data.memberId && !r.revokedAt))
        fail('该会员已有未撤销的黑名单记录，请编辑或撤销原记录', 409);
      const result = row
        ? Object.assign(row, data, { updatedAt: now() })
        : insert('blacklists', { ...data, createdBy: actor.id });
      audit(req, row ? 'blacklist.update' : 'blacklist.create', result);
      return blacklist(result);
    }
  }
  if (resource === 'device-commands') {
    allowed(actor, 'devices:read');
    if (method !== 'GET' || !rid || action) fail('接口不存在', 404);
    const command = find('deviceCommands', rid);
    storeScope(actor, command.storeId);
    return decorate(command);
  }
  if (resource === 'devices') {
    let permission = 'devices:write';
    if (method === 'GET') permission = 'devices:read';
    else if (action === 'commands') permission = 'devices:command';
    allowed(actor, permission);
    if (permission === 'devices:write') hq(req, permission);
    if (query.storeId) storeScope(actor, uuid(query.storeId));
    const row = rid ? find('devices', rid) : undefined;
    if (row) storeScope(actor, row.storeId);
    if (childId) fail('接口不存在', 404);
    if (method === 'GET' && !action)
      return row
        ? displayDevice(row)
        : page(
            scopeRows(actor, rows('devices')).map((d) => displayDevice(d)),
            query,
          );
    if ((!row && method === 'POST') || (row && !action && method === 'PATCH')) {
      only(
        body,
        row
          ? ['name', 'location', 'status', 'credentialRef']
          : [
              'storeId',
              'name',
              'type',
              'provider',
              'deviceUid',
              'model',
              'gatewayId',
              'location',
              'doorMode',
              'credentialRef',
            ],
      );
      const data = { status: 'active', ...row, ...body } as Row;
      storeScope(actor, uuid(data.storeId));
      data.name = str(data.name, '设备名称');
      data.type = choice(data.type, ['door', 'locker', 'camera', 'face_reader'], '设备类型');
      data.provider = str(data.provider, '厂商', 64);
      data.deviceUid = str(data.deviceUid, '设备唯一编号', 128);
      choice(data.status, ['active', 'inactive']);
      if (data.doorMode) choice(data.doorMode, ['normal', 'ab'], '门禁模式');
      for (const field of ['model', 'gatewayId', 'location', 'credentialRef'])
        if (data[field]) data[field] = str(data[field], field, 255);
      if (rows('devices').some((d) => d.id !== rid && d.provider === data.provider && d.deviceUid === data.deviceUid))
        fail('厂商设备编号已存在', 409);
      const result = row ? Object.assign(row, data, { updatedAt: now() }) : insert('devices', data);
      audit(req, row ? 'device.update' : 'device.create', result);
      return displayDevice(result);
    }
    if (row && action === 'compartments' && method === 'PUT') {
      only(body, ['compartments']);
      if (row.type !== 'locker') fail('只有柜子设备可配置柜格');
      if (!Array.isArray(body.compartments) || body.compartments.length > 1000) fail('柜格必须为最多1000项的列表');
      const items = body.compartments.map((item: Row) => {
        only(item, ['number', 'status']);
        return {
          number: str(item.number, '柜号', 32),
          status: choice(item.status, ['available', 'inactive'], '柜格状态'),
        };
      });
      if (new Set(items.map((i) => i.number)).size !== items.length) fail('柜号不能重复');
      const old = rows('compartments').filter((c) => c.deviceId === row.id);
      for (const cell of old) {
        const next = items.find((i) => i.number === cell.number);
        if ((!next || next.status === 'inactive') && cell.currentMemberId) fail('已占用柜格不能移除或停用', 409);
        if (!next && rows('deviceCommands').some((c) => c.compartmentId === cell.id))
          fail('有命令记录的柜格只能停用', 409);
      }
      for (const item of items) {
        const existing = old.find((c) => c.number === item.number);
        if (existing) Object.assign(existing, item);
        else insert('compartments', { ...item, deviceId: row.id });
      }
      const list = rows('compartments');
      for (let i = list.length - 1; i >= 0; i--) {
        const cell = list[i];
        if (cell?.deviceId === row.id && !items.some((n) => n.number === cell.number)) list.splice(i, 1);
      }
      audit(req, 'device.compartments', row);
      return displayDevice(row);
    }
    if (row && action === 'commands') {
      if (method === 'GET')
        return page(
          rows('deviceCommands').filter((c) => c.deviceId === row.id),
          query,
          'requestedAt',
        );
      if (method === 'POST') {
        only(body, ['command', 'compartmentId', 'reason']);
        const command = choice(body.command, ['open_door', 'open_locker'], '指令');
        const reason = str(body.reason, '操作原因', 1000);
        const key = str(req.key, 'Idempotency-Key', 128);
        if ((command === 'open_door' && row.type !== 'door') || (command === 'open_locker' && row.type !== 'locker'))
          fail('设备不支持该指令');
        if (command === 'open_locker') {
          const cell = find('compartments', uuid(body.compartmentId));
          if (cell.deviceId !== row.id) fail('柜格不属于该设备', 404);
          if (cell.status === 'inactive') fail('柜格已停用', 409);
        } else if (body.compartmentId) fail('开门指令不能包含柜格');
        const fingerprint = JSON.stringify([command, body.compartmentId ?? null, reason]);
        const previous = rows('deviceCommands').find((c) => c.deviceId === row.id && c.requestKey === key);
        if (previous) {
          if (previous.fingerprint !== fingerprint || previous.requestedBy !== actor.id)
            fail('幂等键已用于其他指令', 409);
          return previous;
        }
        const simulated = row.provider === 'mock';
        const success = simulated && row.status === 'active';
        const result = insert('deviceCommands', {
          ...body,
          reason,
          deviceId: row.id,
          storeId: row.storeId,
          requestedBy: actor.id,
          requesterName: actor.realName,
          requestKey: key,
          fingerprint,
          requestedAt: now(),
          status: success ? 'succeeded' : 'failed',
          acknowledgedAt: success ? now() : null,
          simulated,
          failureReason: success ? null : '设备停用或尚未接入厂商渠道，未执行真实命令',
        });
        audit(req, 'device.command', result, {
          simulated,
          status: result.status,
        });
        return result;
      }
    }
  }
  if (resource === 'equipment') {
    allowed(actor, method === 'GET' ? 'equipment:read' : 'equipment:write');
    if (method !== 'GET') hq(req, 'equipment:write');
    if (query.storeId) storeScope(actor, uuid(query.storeId));
    const row = rid ? find('equipment', rid) : undefined;
    if (row) storeScope(actor, row.storeId);
    if (method === 'GET' && !action)
      return row
        ? decorate(row)
        : page(
            scopeRows(actor, rows('equipment')).map((e) => decorate(e)),
            query,
          );
    if ((method === 'POST' && !row) || (method === 'PATCH' && row && !action)) {
      only(body, row ? ['name', 'model', 'status'] : ['storeId', 'code', 'name', 'model']);
      const data = { status: 'active', ...row, ...body } as Row;
      storeScope(actor, uuid(data.storeId));
      data.code = str(data.code, '器械编码', 64);
      data.name = str(data.name, '器械名称');
      choice(data.status, ['active', 'inactive']);
      if (data.model) data.model = str(data.model, '型号', 120);
      if (rows('equipment').some((e) => e.id !== rid && e.storeId === data.storeId && e.code === data.code))
        fail('本店器械编号已存在', 409);
      return row ? Object.assign(row, data, { updatedAt: now() }) : insert('equipment', data);
    }
    if (row && action === 'tutorials') {
      const tutorial = childId ? find('tutorials', uuid(childId)) : undefined;
      if (tutorial && tutorial.equipmentId !== row.id) fail('教学记录不可访问', 404);
      if (method === 'GET' && !tutorial)
        return page(
          rows('tutorials').filter((t) => t.equipmentId === row.id),
          query,
        );
      if ((!tutorial && method === 'POST') || (tutorial && method === 'PATCH')) {
        only(body, ['title', 'fileId', 'instructions', 'sortOrder', ...(tutorial ? ['status'] : [])]);
        const data = {
          status: 'active',
          sortOrder: 0,
          ...tutorial,
          ...body,
        } as Row;
        data.title = str(data.title, '教学标题');
        data.sortOrder = integer(data.sortOrder, '排序', 0, 1000);
        choice(data.status, ['active', 'inactive']);
        if (data.instructions) data.instructions = str(data.instructions, '说明', 5000);
        const file = find('files', uuid(data.fileId));
        if (file.storeId !== row.storeId || !['image', 'video'].includes(file.category)) fail('请选择本店图片或视频');
        return tutorial
          ? Object.assign(tutorial, data, { updatedAt: now() })
          : insert('tutorials', { ...data, equipmentId: row.id });
      }
    }
  }
  fail('接口不存在', 404);
}
