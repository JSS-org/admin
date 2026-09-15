import type { Request, Row } from './core';

import {
  allowed,
  boolean,
  choice,
  date,
  decorate,
  fail,
  find,
  insert,
  integer,
  listIds,
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
import { marketingHQ } from './coupons';

function media(req: Request, value: unknown, storeId?: string, categories = ['image', 'video']) {
  const file = find('files', uuid(value));
  if (file.status !== 'active' || !categories.includes(file.category)) fail('文件类型不适用于当前内容');
  if (file.storeId) storeScope(req.actor, file.storeId);
  if (storeId && file.storeId && file.storeId !== storeId) fail('文件不属于目标门店');
  return file.id;
}
function url(value: unknown, label: string) {
  const text = str(value, label, 2000);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    fail(`${label}格式错误`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) fail(`${label}只允许HTTP(S)链接`);
  return text;
}
function reviewView(row: Row) {
  return {
    id: row.id,
    storeId: row.storeId,
    storeName: find('stores', row.storeId).name,
    platform: row.platform,
    rating: row.rating,
    content: row.content,
    anonymous: row.anonymous,
    memberName: row.anonymous ? undefined : rows('members').find((m) => m.id === row.memberId)?.name,
    submittedAt: row.submittedAt,
  };
}
function feedbackView(row: Row) {
  return {
    id: row.id,
    storeId: row.storeId,
    storeName: find('stores', row.storeId).name,
    platform: row.platform,
    content: row.content,
    category: row.category,
    submittedAt: row.submittedAt,
    status: row.status,
  };
}
export function content(req: Request): any {
  const { actor, method, body, query } = req;
  const [resource = '', rid, action, extra] = req.path.split('/').filter(Boolean);
  if (resource === 'reports' && rid === 'feedback' && !action && method === 'GET') {
    allowed(actor, 'feedback:read');
    if (query.storeId) storeScope(actor, uuid(query.storeId));
    const [from, to] = range(query);
    const select = (table: string) =>
      scopeRows(actor, rows(table)).filter(
        (r) =>
          (!query.storeId || r.storeId === query.storeId) &&
          Date.parse(r.submittedAt) >= from &&
          Date.parse(r.submittedAt) < to,
      );
    const reviews = select('reviews');
    const feedback = select('feedback');
    return {
      id: 'feedback',
      reviewCount: reviews.length,
      feedbackCount: feedback.length,
      averageRating:
        reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : '0.00',
      distribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: reviews.filter((r) => r.rating === rating).length,
      })),
    };
  }
  if (
    !['activities', 'client-settings', 'feedback', 'franchise-brand', 'franchise-inquiries', 'reviews'].includes(
      resource,
    )
  )
    return undefined;
  if (extra) fail('接口不存在', 404);
  if (resource === 'reviews' || resource === 'feedback') {
    allowed(actor, 'feedback:read');
    if (method !== 'GET' || rid) fail('接口不存在', 404);
    if (query.storeId) storeScope(actor, uuid(query.storeId));
    let data = scopeRows(actor, rows(resource));
    if (query.rating) data = data.filter((r) => r.rating === integer(query.rating, '评分', 1, 5));
    if (query.category) data = data.filter((r) => r.category === query.category);
    return page(
      data.map((r) => (resource === 'reviews' ? reviewView(r) : feedbackView(r))),
      query,
      'submittedAt',
    );
  }
  const codes: Record<string, string> = {
    'client-settings': 'content:manage',
    activities: 'activities:manage',
    'franchise-brand': 'franchise:manage',
    'franchise-inquiries': 'franchise:manage',
  };
  marketingHQ(req, codes[resource] ?? '');
  if (query.storeId) storeScope(actor, uuid(query.storeId));
  if (resource === 'client-settings' && !rid) {
    const input = method === 'GET' ? query : body;
    const storeId = input.storeId ? uuid(input.storeId) : null;
    if (storeId) storeScope(actor, storeId);
    const platform = choice(input.platform ?? 'miniapp', ['miniapp', 'app'], '平台');
    const row = rows('clientSettings').find((s) => s.storeId === storeId && s.platform === platform);
    if (method === 'GET')
      return (
        row ?? {
          storeId,
          platform,
          systemName: '健身门店',
          enabled: false,
          blocks: [],
        }
      );
    if (method === 'PUT') {
      only(body, [
        'storeId',
        'platform',
        'appId',
        'systemName',
        'coverFileId',
        'welcomeText',
        'customerService',
        'appDownloadUrl',
        'enabled',
        'blocks',
        'contentHtml',
      ]);
      const data: Record<string, any> = {
        ...body,
        storeId,
        platform,
        systemName: str(body.systemName, '展示名称'),
        enabled: boolean(body.enabled, '启用'),
      };
      if (body.appId) data.appId = str(body.appId, '应用ID', 128);
      if (body.contentHtml !== undefined)
        data.contentHtml = body.contentHtml ? str(body.contentHtml, '富文本内容', 100_000) : '';
      if (body.coverFileId) data.coverFileId = media(req, body.coverFileId, storeId ?? undefined, ['image']);
      if (body.appDownloadUrl) data.appDownloadUrl = url(body.appDownloadUrl, 'App下载链接');
      for (const field of ['welcomeText', 'customerService'])
        if (body[field]) data[field] = str(body[field], field, 2000);
      if (!Array.isArray(body.blocks) || body.blocks.length > 50) fail('内容区块必须为最多50项的列表');
      data.blocks = body.blocks.map((block: Row) => {
        only(block, ['blockType', 'title', 'body', 'fileId', 'linkUrl', 'sortOrder', 'enabled']);
        const result: Record<string, any> = {
          ...block,
          blockType: choice(block.blockType, ['text', 'banner', 'link', 'video'], '区块类型'),
          sortOrder: integer(block.sortOrder ?? 0, '排序', 0, 1000),
          enabled: boolean(block.enabled, '区块启用'),
        };
        if (block.title) result.title = str(block.title, '标题', 120);
        if (block.body) result.body = str(block.body, '内容', 5000);
        if (block.fileId)
          result.fileId = media(
            req,
            block.fileId,
            storeId ?? undefined,
            block.blockType === 'video' ? ['video'] : ['image'],
          );
        if (block.linkUrl) result.linkUrl = url(block.linkUrl, '跳转链接');
        if (['banner', 'video'].includes(result.blockType) && !result.fileId) fail('图片或视频区块必须上传文件');
        if (result.blockType === 'link' && !result.linkUrl) fail('链接区块必须填写链接');
        return result;
      });
      return row ? Object.assign(row, data, { updatedAt: now() }) : insert('clientSettings', data);
    }
  }
  if (resource === 'activities') {
    const row = rid ? find('activities', uuid(rid)) : undefined;
    if (method === 'GET') {
      if (row && action === 'registrations')
        return page(
          rows('activityRegistrations')
            .filter((r) => r.activityId === row.id)
            .map((r) => decorate(r)),
          query,
          'registeredAt',
        );
      if (action) fail('接口不存在', 404);
      const view = (r: Row) => ({
        ...r,
        storeNames: r.storeIds.map((s: string) => find('stores', s).name).join('、'),
        registrationCount: rows('activityRegistrations').filter(
          (b) => b.activityId === r.id && b.status === 'registered',
        ).length,
      });
      return row
        ? view(row)
        : page(
            rows('activities')
              .filter((r) => !query.storeId || r.storeIds.includes(query.storeId))
              .map((r) => view(r)),
            { ...query, storeId: undefined },
            'startsAt',
          );
    }
    if ((!row && method === 'POST') || (row && method === 'PATCH' && !action)) {
      only(body, [
        'name',
        'description',
        'coverFileId',
        'storeIds',
        'registrationStartsAt',
        'registrationEndsAt',
        'startsAt',
        'endsAt',
        'capacity',
        ...(row ? ['status'] : []),
      ]);
      const data: Record<string, any> = {
        status: 'draft',
        ...row,
        ...body,
      } as Row;
      data.name = str(data.name, '活动名称');
      data.description = str(data.description, '活动介绍', 5000);
      data.storeIds = listIds(data.storeIds, '活动门店');
      if (data.storeIds.length === 0) fail('至少选择一个活动门店');
      data.storeIds.forEach((s: string) => storeScope(actor, s));
      for (const key of ['registrationStartsAt', 'registrationEndsAt', 'startsAt', 'endsAt'])
        data[key] = new Date(date(data[key], key)).toISOString();
      if (
        data.registrationStartsAt >= data.registrationEndsAt ||
        data.registrationEndsAt > data.startsAt ||
        data.startsAt >= data.endsAt
      )
        fail('报名与活动时间顺序不合法');
      data.capacity =
        data.capacity === undefined || data.capacity === null ? null : integer(data.capacity, '活动名额', 0, 100_000);
      choice(data.status, ['draft', 'published', 'closed', 'cancelled']);
      if (data.coverFileId) data.coverFileId = media(req, data.coverFileId, undefined, ['image']);
      const registered = rows('activityRegistrations').filter((b) => b.activityId === rid && b.status === 'registered');
      if (data.capacity !== null && registered.length > data.capacity) fail('名额不能少于已报名人数', 409);
      if (registered.some((b) => !data.storeIds.includes(b.storeId))) fail('不能移除已有报名的门店', 409);
      if (row && row.status !== 'draft' && data.status === 'draft') fail('已发布活动不能退回草稿', 409);
      const result = row
        ? Object.assign(row, data, { updatedAt: now() })
        : insert('activities', { ...data, createdBy: actor.id });
      if (data.status === 'cancelled')
        registered.forEach((b) => Object.assign(b, { status: 'cancelled', cancelledAt: now() }));
      return result;
    }
  }
  if (resource === 'franchise-brand' && !rid) {
    const row = rows('franchiseBrand')[0];
    if (method === 'GET')
      return (
        row ?? {
          name: '',
          introduction: '',
          contactPhone: '',
          status: 'draft',
          models: [],
        }
      );
    if (method === 'PUT') {
      only(body, ['name', 'introduction', 'contactPhone', 'logoFileId', 'status', 'models']);
      const data: Record<string, any> = {
        ...body,
        name: str(body.name, '品牌名称'),
        introduction: str(body.introduction, '品牌介绍', 10_000),
        contactPhone: str(body.contactPhone, '联系电话', 32),
        status: choice(body.status ?? 'draft', ['draft', 'published'], '发布状态'),
      };
      if (!/^[+\d\s-]{5,32}$/.test(data.contactPhone)) fail('联系电话格式错误');
      if (body.logoFileId) data.logoFileId = media(req, body.logoFileId, undefined, ['image']);
      if (
        !Array.isArray(body.models) ||
        body.models.length > 3 ||
        (data.status === 'published' && body.models.length !== 3)
      )
        fail('发布时须恰好配置三种加盟模型');
      data.models = body.models.map((model: Row) => {
        only(model, ['modelCode', 'name', 'description', 'areaSqm', 'investmentDescription', 'fileIds']);
        const modelCode = str(model.modelCode, '模型编号', 64);
        const files = listIds(model.fileIds, '模型展示图');
        files.forEach((fileId) => media(req, fileId));
        if (data.status === 'published' && files.length === 0) fail('每种模型至少上传一张立体图或视频');
        return {
          ...model,
          modelCode,
          name: str(model.name, '模型名称'),
          areaSqm: model.areaSqm ? money(model.areaSqm, '面积') : null,
          fileIds: files,
        };
      });
      if (new Set(data.models.map((m: Row) => m.modelCode)).size !== data.models.length) fail('模型编号不可重复');
      return row ? Object.assign(row, data, { updatedAt: now() }) : insert('franchiseBrand', data);
    }
  }
  if (resource === 'franchise-inquiries') {
    if (action) fail('接口不存在', 404);
    const row = rid ? find('franchiseInquiries', uuid(rid)) : undefined;
    if (method === 'GET') return row ?? page(rows('franchiseInquiries'), query, 'receivedAt');
    if (row && method === 'PATCH') {
      only(body, ['status']);
      row.status = choice(body.status, ['new', 'contacted', 'closed'], '咨询状态');
      row.updatedAt = now();
      return row;
    }
  }
  fail('接口不存在', 404);
}
