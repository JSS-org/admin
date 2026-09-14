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
    welcomeText: data.welcomeText || '',
    customerService: data.customerService || '',
    appDownloadUrl: platform === 'app' ? data.appDownloadUrl || null : null,
    enabled: data.enabled,
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
