import type { Request, Row } from './core';

import {
  allowed,
  choice,
  date,
  decorate,
  fail,
  find,
  id,
  insert,
  integer,
  listIds,
  memberScope,
  money,
  now,
  only,
  page,
  rows,
  scopeRows,
  storeScope,
  str,
  uuid,
} from './core';
import { batchIdentity, marketingHQ } from './coupons';

function pointRule(data: Row) {
  data.name = str(data.name, '积分规则名称');
  choice(data.eventType, ['checkin', 'consumption', 'invitation'], '积分事件');
  data.points = integer(data.points, '积分', 0, 1_000_000);
  data.dailyLimit =
    data.dailyLimit === undefined || data.dailyLimit === null
      ? null
      : integer(data.dailyLimit, '每日上限', 0, 1_000_000);
  if (data.eventType === 'consumption') {
    data.thresholdAmount = money(data.thresholdAmount);
    if (Number(data.thresholdAmount) <= 0) fail('消费门槛必须大于0');
  } else data.thresholdAmount = null;
  data.effectiveFrom = new Date(date(data.effectiveFrom, '生效时间')).toISOString();
  if (data.effectiveTo) data.effectiveTo = new Date(date(data.effectiveTo, '结束时间')).toISOString();
  if (data.effectiveTo && data.effectiveFrom >= data.effectiveTo) fail('规则有效期错误');
  choice(data.status, ['draft', 'active', 'inactive']);
}
export function marketing(req: Request): any {
  const { actor, method, body, query } = req;
  const [resource = '', rid, action, extra] = req.path.split('/').filter(Boolean);
  if (!['message-batches', 'point-ledger', 'point-products', 'point-redemptions', 'point-rules'].includes(resource))
    return undefined;
  if (extra) fail('接口不存在', 404);
  if (rid) uuid(rid);
  if (resource === 'message-batches') return messages(req, rid, action);
  marketingHQ(req, ['point-ledger', 'point-redemptions'].includes(resource) ? 'points:read' : 'points:manage');
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  if (query.memberId) memberScope(actor, uuid(query.memberId));
  const table: Record<string, string> = {
    'point-rules': 'pointRules',
    'point-products': 'pointProducts',
    'point-ledger': 'pointLedger',
    'point-redemptions': 'pointRedemptions',
  };
  const name = table[resource];
  if (!name) return undefined;
  const row = rid ? find(name, rid) : undefined;
  if (method === 'GET' && !action) {
    let data = rows(name);
    if (query.eventType) data = data.filter((r) => r.eventType === query.eventType);
    return (
      row ??
      page(
        data.map((r) => decorate(r)),
        query,
        resource === 'point-ledger' ? 'occurredAt' : 'createdAt',
      )
    );
  }
  if (
    resource === 'point-rules' &&
    ((method === 'POST' && (!row || action === 'versions')) || (method === 'PATCH' && row && !action))
  ) {
    only(body, [
      'name',
      'eventType',
      'thresholdAmount',
      'points',
      'dailyLimit',
      'effectiveFrom',
      'effectiveTo',
      ...(method === 'PATCH' ? ['status'] : []),
    ]);
    if (row && method === 'PATCH' && row.status !== 'draft' && Object.keys(body).some((k) => k !== 'status'))
      fail('已生效规则必须创建新版本', 409);
    if (row && method === 'PATCH' && row.status !== 'draft' && body.status === 'draft')
      fail('生效规则不能退回草稿', 409);
    const data = { status: 'draft', ...row, ...body } as Row;
    pointRule(data);
    if (row && method === 'PATCH') return Object.assign(row, data, { updatedAt: now() });
    const ruleKey = row?.ruleKey ?? id();
    const version =
      Math.max(
        0,
        ...rows(name)
          .filter((r) => r.ruleKey === ruleKey)
          .map((r) => r.version),
      ) + 1;
    return insert(name, {
      ...data,
      id: id(),
      ruleKey,
      version,
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
    });
  }
  if (resource === 'point-products' && ((method === 'POST' && !row) || (method === 'PATCH' && row && !action))) {
    only(body, [
      'name',
      ...(row ? [] : ['kind', 'cardTemplateId', 'courseProductId']),
      'fileId',
      'pointsPrice',
      'stock',
      ...(row ? ['status'] : []),
    ]);
    const data = { status: 'active', ...row, ...body } as Row;
    data.name = str(data.name, '商品名称');
    choice(data.kind, ['card', 'course', 'merchandise'], '商品类型');
    choice(data.status, ['active', 'inactive']);
    if (data.kind === 'card') {
      if (data.courseProductId) fail('卡商品不能关联课程');
      if (find('cardTemplates', uuid(data.cardTemplateId)).status !== 'published') fail('请选择已发布卡种');
    } else if (data.kind === 'course') {
      if (data.cardTemplateId) fail('课程商品不能关联会员卡');
      if (find('courseProducts', uuid(data.courseProductId)).status !== 'active') fail('请选择有效课程');
    } else if (data.cardTemplateId || data.courseProductId) fail('周边商品不能关联会员卡或课程');
    if (data.fileId) find('files', uuid(data.fileId));
    data.pointsPrice = integer(data.pointsPrice, '所需积分', 1, 1_000_000_000);
    data.stock = data.stock === undefined || data.stock === null ? null : integer(data.stock, '库存', 0, 1_000_000_000);
    return row ? Object.assign(row, data, { updatedAt: now() }) : insert(name, data);
  }
  fail('接口不存在', 404);
}
function messageView(req: Request, row: Row) {
  const recipients = scopeRows(
    req.actor,
    rows('messageRecipients').filter((r) => r.batchId === row.id),
  );
  if (recipients.length === 0) fail('消息不可访问', 404);
  return {
    id: row.id,
    storeId: row.storeId,
    title: row.title,
    content: row.content,
    kind: row.kind,
    channel: row.channel,
    status: row.status,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    recipientCount: recipients.length,
    recipients: recipients.map((r) => ({
      ...decorate(r),
      readStatus: r.readAt ? 'read' : 'unknown',
    })),
  };
}
function messages(req: Request, rid?: string, action?: string) {
  const { actor, method, body, query } = req;
  allowed(actor, method === 'GET' ? 'messages:read' : 'messages:send');
  if (action) fail('接口不存在', 404);
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  if (method === 'GET') {
    if (rid) return messageView(req, find('messageBatches', rid));
    const ids = new Set(
      scopeRows(actor, rows('messageRecipients'))
        .filter((r) => !query.storeId || r.storeId === query.storeId)
        .map((r) => r.batchId),
    );
    return page(
      rows('messageBatches')
        .filter((b) => ids.has(b.id))
        .map((b) => messageView(req, b)),
      { ...query, storeId: undefined },
    );
  }
  if (method === 'POST' && !rid) {
    only(body, ['kind', 'storeId', 'memberIds', 'channel', 'title', 'content', 'scheduledAt']);
    const identity = batchIdentity(req, 'messageBatches');
    if (identity.previous) return messageView(req, identity.previous);
    const kind = choice(body.kind, ['private', 'bulk'], '消息类型');
    const channel = choice(body.channel, ['sms', 'miniapp', 'app'], '消息渠道');
    const memberIds = listIds(body.memberIds, '会员');
    if (memberIds.length === 0 || memberIds.length > 500 || (kind === 'private' && memberIds.length !== 1))
      fail('私信只选一人，批量消息每次1到500人');
    if (body.storeId) storeScope(actor, uuid(body.storeId));
    else if (actor.scopeType !== 'hq') fail('门店发送消息必须指定门店');
    const content = str(body.content, '消息内容', 2000);
    const title = body.title ? str(body.title, '标题', 120) : '';
    const targets = memberIds.map((memberId) => {
      memberScope(actor, memberId, body.storeId);
      const storeId = body.storeId ?? rows('memberStores').find((s) => s.memberId === memberId)?.storeId;
      if (!storeId) fail('会员没有门店关联');
      return { memberId, storeId };
    });
    let scheduledAt = now();
    if (body.scheduledAt) {
      scheduledAt = new Date(date(body.scheduledAt, '发送时间')).toISOString();
      if (Date.parse(scheduledAt) < Date.now()) fail('计划发送时间不能早于当前时间');
    }
    const batch = insert('messageBatches', {
      ...identity.fields,
      storeId: body.storeId ?? null,
      kind,
      channel,
      title,
      content,
      scheduledAt,
      status: 'failed',
      simulated: true,
    });
    for (const target of targets)
      insert('messageRecipients', {
        batchId: batch.id,
        ...target,
        status: 'failed',
        failureReason: 'Mock未配置真实消息渠道，未发送',
        readAt: null,
        attemptCount: 0,
      });
    return messageView(req, batch);
  }
  fail('接口不存在', 404);
}
