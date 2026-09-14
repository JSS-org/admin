import { expect, it } from 'vitest';

import { prepareContent, validateContent } from './content-form';
it('validates media and links according to the chosen block type', () => {
  expect(validateContent({ systemName: '门店', blocks: [{ blockType: 'video' }] }, 'miniapp')).toContain('上传视频');
  expect(
    validateContent({ systemName: '门店', blocks: [{ blockType: 'link', linkUrl: 'javascript:alert(1)' }] }, 'miniapp'),
  ).toContain('HTTP(S)');
  expect(
    validateContent({ systemName: '门店', blocks: [{ blockType: 'text', body: '欢迎' }] }, 'miniapp'),
  ).toBeUndefined();
});
it('strips stale type fields and keeps visible ordering in the saved body', () => {
  const body = prepareContent(
    {
      systemName: '门店',
      enabled: true,
      appDownloadUrl: 'https://example.com',
      blocks: [
        {
          key: 'local',
          blockType: 'text',
          body: '欢迎',
          fileId: 'old-video',
          linkUrl: 'https://old.example',
          enabled: true,
        },
        { blockType: 'link', linkUrl: 'https://example.com', body: 'old', enabled: true },
      ],
    },
    'miniapp',
  );
  expect(body.appDownloadUrl).toBeNull();
  expect(body.blocks[0]).toEqual({
    blockType: 'text',
    title: '',
    body: '欢迎',
    fileId: null,
    linkUrl: null,
    sortOrder: 0,
    enabled: true,
  });
  expect(body.blocks[1]).toMatchObject({ body: '', fileId: null, sortOrder: 1, linkUrl: 'https://example.com' });
});
