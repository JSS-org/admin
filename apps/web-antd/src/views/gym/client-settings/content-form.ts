import { textOrDash } from '#/views/gym/utils/display';

export function validateContent(data: Record<string, any>, platform: string) {
  if (!String(data.systemName ?? '').trim()) return '请填写展示名称';
  const validUrl = (value: string) => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  };
  if (platform === 'app' && data.appDownloadUrl && !validUrl(data.appDownloadUrl))
    return 'App 下载链接须为 HTTP(S) 地址';
  for (const [index, block] of data.blocks.entries()) {
    if (['banner', 'video'].includes(block.blockType) && !block.fileId)
      return `区块 ${index + 1} 请上传${block.blockType === 'video' ? '视频' : '图片'}`;
    if (block.blockType === 'text' && !String(block.body ?? '').trim()) return `区块 ${index + 1} 请填写正文`;
    if (block.blockType === 'link' && !validUrl(block.linkUrl ?? ''))
      return `区块 ${index + 1} 请填写有效的 HTTP(S) 链接`;
  }
}
export function prepareContent(data: Record<string, any>, platform: string, storeId?: string) {
  return {
    platform,
    storeId: storeId ?? null,
    systemName: data.systemName,
    appId: data.appId || '',
    coverFileId: data.coverFileId ?? null,
    welcomeText: textOrDash(data.welcomeText),
    customerService: data.customerService || '',
    appDownloadUrl: platform === 'app' ? data.appDownloadUrl || null : null,
    enabled: data.enabled,
    contentHtml: data.contentHtml ?? '',
    blocks: data.blocks.map((block: Record<string, any>, index: number) => ({
      blockType: block.blockType,
      title: block.title || '',
      enabled: block.enabled,
      sortOrder: index,
      body: block.blockType === 'text' ? block.body : '',
      fileId: ['banner', 'video'].includes(block.blockType) ? block.fileId : null,
      linkUrl: block.blockType === 'link' ? block.linkUrl : null,
    })),
  };
}

/** Convert legacy visible blocks; keep the original blocks in the payload for compatibility. */
export function legacyContent(blocks: Record<string, any>[]) {
  const escape = (value: unknown) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  return blocks
    .filter((block) => block.enabled)
    .map((block) => {
      const title = block.title ? `<h2>${escape(block.title)}</h2>` : '';
      if (block.blockType === 'text') return `${title}<p>${escape(block.body).replaceAll('\n', '<br>')}</p>`;
      if (block.blockType === 'banner')
        return `${title}<img src="gym-file:${escape(block.fileId)}" alt="${escape(block.title)}">`;
      if (block.blockType === 'video')
        return `${title}<p><a href="/gym/file-preview/${escape(block.fileId)}">查看视频</a></p>`;
      return `${title}<p><a href="${escape(block.linkUrl)}">${escape(block.title || block.linkUrl)}</a></p>`;
    })
    .join('');
}
