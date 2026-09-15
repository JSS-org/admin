import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { getGymFileUrl, openGymFile } from './gym';

const client = vi.hoisted(() => ({ get: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('../router', () => ({ router }));
vi.mock('./request', () => ({ requestClient: client }));
vi.mock('@vben/stores', () => ({ useAccessStore: () => ({ accessCodes: [] }) }));
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());
it('creates a preview URL from the binary response body, preserving the PDF MIME type', async () => {
  const blob = new Blob(['%PDF-1.4\n'], { type: 'application/pdf' });
  client.get.mockResolvedValue(blob);
  const createObjectURL = vi.fn((value: Blob) => {
    expect(value).toBe(blob);
    expect(value.type).toBe('application/pdf');
    return 'blob:preview';
  });
  vi.stubGlobal('URL', { createObjectURL });
  expect(await getGymFileUrl('pdf-file')).toBe('blob:preview');
  expect(client.get).toHaveBeenCalledWith('/admin/v1/files/pdf-file/content', {
    responseType: 'blob',
    responseReturn: 'body',
  });
});
it('opens the in-app preview without relying on an asynchronous popup', async () => {
  await openGymFile('cover-file');
  expect(router.push).toHaveBeenCalledWith({ name: 'GymFilePreview', params: { id: 'cover-file' } });
  expect(client.get).not.toHaveBeenCalled();
});
