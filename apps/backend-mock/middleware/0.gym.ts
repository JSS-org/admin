import {
  defineEventHandler,
  getCookie,
  getHeader,
  getQuery,
  readBody,
  readMultipartFormData,
  setCookie,
  setResponseStatus,
} from 'h3';

import {
  authenticate,
  login,
  refresh,
  revoke,
  userInfo,
} from '../utils/gym/auth';
import {
  allowed,
  ApiError,
  fail,
  find,
  id,
  insert,
  only,
  rows,
  storeScope,
} from '../utils/gym/core';
import { foundation } from '../utils/gym/foundation';
import { training } from '../utils/gym/training';

const contents = new Map<string, Buffer>();
const success = (data: unknown) => ({
  code: 0,
  data,
  error: null,
  message: 'ok',
});

// Development-only stateful Mock. Nothing here is a production payment/device operation.
export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? '';
  const token = (getHeader(event, 'Authorization') ?? '').replace(
    /^Bearer /,
    '',
  );
  const cookie = getCookie(event, 'gym_refresh') ?? '';
  const isBusiness = path.startsWith('/api/admin/v1/');
  if (
    !isBusiness &&
    ![
      '/api/auth/codes',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/user/info',
    ].includes(path)
  )
    return;
  if (event.method === 'OPTIONS') return;
  try {
    if (path === '/api/auth/login' && event.method === 'POST') {
      const body = await readBody(event);
      // Leave the other vben template applications' demo accounts intact.
      if (!rows('accounts').some((a) => a.username === body?.username)) return;
      only(body, ['username', 'password', 'selectAccount', 'captcha']);
      const session = login(body.username, body.password);
      setCookie(event, 'gym_refresh', session.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 86_400,
      });
      return success({ accessToken: session.accessToken });
    }
    if (!isBusiness && !token.startsWith('gym_') && !cookie) return;
    if (path === '/api/auth/logout' && event.method === 'POST') {
      revoke(token);
      revoke(cookie);
      setCookie(event, 'gym_refresh', '', { path: '/api/auth', maxAge: 0 });
      return success(null);
    }
    if (path === '/api/auth/refresh' && event.method === 'POST') {
      const session = refresh(cookie);
      setCookie(event, 'gym_refresh', session.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 86_400,
      });
      return success(session.accessToken);
    }
    const actor = authenticate(token);
    if (path === '/api/auth/codes' && event.method === 'GET')
      return success(actor.codes);
    if (path === '/api/user/info' && event.method === 'GET')
      return success(userInfo(actor));
    if (path === '/api/admin/v1/files' && event.method === 'POST') {
      allowed(actor, 'files:upload');
      const parts = await readMultipartFormData(event);
      const file = parts?.find((p) => p.name === 'file' && p.filename);
      const storeId = parts?.find((p) => p.name === 'storeId')?.data.toString();
      if (storeId) storeScope(actor, storeId);
      else if (actor.scopeType !== 'hq') fail('必须指定门店');
      if (!file) fail('请选择文件');
      const category =
        parts?.find((p) => p.name === 'category')?.data.toString() ?? 'image';
      const data = file.data;
      const isPdf = data.subarray(0, 5).toString() === '%PDF-';
      const isPng = data
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpg = data[0] === 255 && data[1] === 216 && data[2] === 255;
      const isMp4 = data.subarray(4, 8).toString() === 'ftyp';
      let mime = '';
      if (isPdf) mime = 'application/pdf';
      else if (isPng) mime = 'image/png';
      else if (isJpg) mime = 'image/jpeg';
      else if (isMp4) mime = 'video/mp4';
      if (
        !mime ||
        !['body_report', 'contract', 'image', 'video'].includes(category) ||
        (category === 'image' && !mime.startsWith('image/')) ||
        (category === 'video' && !isMp4) ||
        (category === 'contract' && !isPdf)
      )
        fail('文件内容与类型不符，仅支持PNG/JPEG/MP4/PDF', 415);
      const limit =
        (({ video: 200, image: 10 } as Record<string, number>)[category] ??
          20) *
        1024 *
        1024;
      if (data.length > limit) fail('文件超过允许大小', 413);
      const row = insert('files', {
        storeId: storeId ?? null,
        uploadedBy: actor.id,
        originalName: file.filename,
        mimeType: mime,
        byteSize: data.length,
        category,
        status: 'active',
        storageKey: id(),
      });
      contents.set(row.id, data);
      setResponseStatus(event, 201);
      return success(row);
    }
    const fileMatch = /^\/api\/admin\/v1\/files\/([^/]+)(\/content)?$/.exec(
      path,
    );
    if (fileMatch && event.method === 'GET') {
      allowed(actor, 'files:read');
      const row = find('files', fileMatch[1] ?? '');
      if (row.storeId) storeScope(actor, row.storeId);
      else if (actor.scopeType !== 'hq') fail('文件不可访问', 404);
      if (fileMatch[2]) {
        const data = contents.get(row.id);
        if (!data) fail('模拟文件已重置，请重新上传', 404);
        event.node.res.setHeader('Content-Type', row.mimeType);
        event.node.res.setHeader('X-Content-Type-Options', 'nosniff');
        return data;
      }
      return success(row);
    }
    const body = ['PATCH', 'POST', 'PUT'].includes(event.method)
      ? await readBody(event)
      : {};
    const request = {
      actor,
      method: event.method,
      path: path.slice('/api/admin/v1'.length),
      query: getQuery(event),
      body: body ?? {},
      key: getHeader(event, 'Idempotency-Key'),
    };
    const result = foundation(request) ?? training(request);
    if (result === undefined) fail('接口不存在', 404);
    if (event.method === 'POST') setResponseStatus(event, 201);
    return success(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof ApiError ? error.message : '模拟服务内部错误';
    setResponseStatus(event, status);
    if (status === 500) console.error(error);
    return {
      code: status === 400 ? 'VALIDATION_ERROR' : String(status),
      data: null,
      error: message,
      message,
    };
  }
});
