// @vitest-environment node
import { createApp, toWebHandler } from 'h3';
import { beforeEach, expect, it } from 'vitest';

import middleware from '../../middleware/0.gym';
import { login } from './auth';
import { fileContents, seedId } from './core';
import { reset } from './state';

const app = createApp();
app.use(middleware);
const handle = toWebHandler(app);
beforeEach(reset);
function request(path: string, init: RequestInit = {}, username = 'hq') {
  return handle(
    new Request(`http://localhost/api/admin/v1/${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${login(username, '123456').accessToken}` },
    }),
  );
}
it('serves the seeded contract as a valid PDF binary instead of a JSON wrapper', async () => {
  const result = await request(`files/${seedId(401)}/content`);
  expect(result.status).toBe(200);
  expect(result.headers.get('content-type')).toBe('application/pdf');
  const bytes = Buffer.from(await result.arrayBuffer());
  expect(bytes).toEqual(fileContents.get(seedId(401)));
  expect(bytes.toString()).toContain('xref');
  expect(bytes.toString()).toContain('%%EOF');
});
it('lets a store upload approval PDFs and prevents another store from reading them', async () => {
  const form = new FormData();
  form.append('file', new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' }), '签约合同.pdf');
  form.append('category', 'approval');
  form.append('storeId', seedId(1));
  const result = await request('files', { method: 'POST', body: form }, 'store1');
  expect(result.status).toBe(201);
  const { data: file } = await result.json();
  expect(file.category).toBe('approval');
  const own = await request(`files/${file.id}/content`, {}, 'store1');
  expect(own.status).toBe(200);
  const other = await request(`files/${file.id}/content`, {}, 'store2');
  expect(other.status).toBe(404);
});
it('rejects video bytes disguised as an approval PDF', async () => {
  const form = new FormData();
  form.append('file', new Blob(['0000ftyp0000'], { type: 'application/pdf' }), 'fake.pdf');
  form.append('category', 'approval');
  form.append('storeId', seedId(1));
  const rejected = await request('files', { method: 'POST', body: form }, 'store1');
  expect(rejected.status).toBe(415);
});
it('uploads an image, sets it as a store cover and delivers the original bytes', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSioAAAAASUVORK5CYII=',
    'base64',
  );
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'cover.png');
  form.append('category', 'image');
  form.append('storeId', seedId(1));
  const upload = await request('files', { method: 'POST', body: form });
  expect(upload.status).toBe(201);
  const { data: file } = await upload.json();
  const update = await request(`stores/${seedId(1)}/media`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ fileId: file.id, isCover: true, sortOrder: 0 }] }),
  });
  expect(update.status).toBe(200);
  const updated = await update.json();
  expect(updated.data.media[0]).toMatchObject({ fileId: file.id, isCover: true, category: 'image' });
  const download = await request(`files/${file.id}/content`);
  expect(download.headers.get('content-type')).toBe('image/png');
  expect(Buffer.from(await download.arrayBuffer())).toEqual(png);
  const forbidden = await request(`files/${file.id}/content`, {}, 'store2');
  expect(forbidden.status).toBe(404);
});
