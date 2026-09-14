export function validateSettings(tab: string, settings: Record<string, any>): string | undefined {
  if (tab === 'verification-settings') {
    if (settings.enabled && settings.supportedChannels.length === 0) return '启用核销时请至少选择一个渠道';
    if (settings.timeMode === 'limited' && (!settings.allowedStart || !settings.allowedEnd))
      return '请填写每日核销时段';
    if (settings.timeMode === 'limited' && settings.allowedStart >= settings.allowedEnd)
      return '核销结束时间须晚于开始时间';
    return;
  }
  const entries = tab === 'online-sales-settings' ? settings.offers : settings.items;
  if (settings.enabled && tab === 'online-sales-settings' && !entries.some((item: any) => item.enabled))
    return '请至少添加一个启用的售卡方案';
  if (entries.some((item: any) => !item.cardTemplateId)) return '请为每个方案选择卡种';
  if (new Set(entries.map((item: any) => item.cardTemplateId)).size !== entries.length) return '同一卡种不能重复配置';
  for (const [index, item] of entries.entries()) {
    const price = tab === 'online-sales-settings' ? item.salePrice : item.price;
    if (price === null || price === undefined || price === '' || !Number.isFinite(Number(price)) || Number(price) < 0)
      return `方案 ${index + 1} 的价格必须为非负金额`;
    if (tab === 'online-sales-settings' && item.timing === 'scheduled') {
      if (!item.startsAt || !item.endsAt) return `请设置方案 ${index + 1} 的完整售卖时段`;
      if (!Number.isFinite(Date.parse(item.startsAt)) || !Number.isFinite(Date.parse(item.endsAt)))
        return `方案 ${index + 1} 的售卖日期无效`;
      if (Date.parse(item.startsAt) >= Date.parse(item.endsAt)) return '售卖结束时间须晚于开始时间';
    }
    if (tab === 'subscription-settings') {
      if (
        item.billingDay !== null &&
        (!Number.isInteger(item.billingDay) || item.billingDay < 1 || item.billingDay > 28)
      )
        return `方案 ${index + 1} 的扣款日须为 1 至 28 日`;
      for (const key of ['renewalNoticeDays', 'graceDays']) {
        if (!Number.isInteger(item[key]) || item[key] < 0 || item[key] > 30)
          return `方案 ${index + 1} 的通知和宽限天数须为 0 至 30 天`;
      }
    }
  }
}

export function prepareSettings(tab: string, settings: Record<string, any>) {
  if (tab === 'online-sales-settings')
    return {
      enabled: settings.enabled,
      contractRequired: settings.contractRequired,
      offers: settings.offers.map((item: any) => ({
        cardTemplateId: item.cardTemplateId,
        salePrice: item.salePrice,
        enabled: item.enabled,
        startsAt: item.timing === 'scheduled' && item.startsAt ? new Date(item.startsAt).toISOString() : null,
        endsAt: item.timing === 'scheduled' && item.endsAt ? new Date(item.endsAt).toISOString() : null,
      })),
    };
  if (tab === 'subscription-settings')
    return {
      items: settings.items.map((item: any) => ({
        cardTemplateId: item.cardTemplateId,
        price: item.price,
        billingDay: item.billingDay ?? null,
        renewalNoticeDays: item.renewalNoticeDays,
        graceDays: item.graceDays,
        enabled: item.enabled,
      })),
    };
  return {
    enabled: settings.enabled,
    requireCheckin: settings.requireCheckin,
    supportedChannels: settings.supportedChannels,
    allowedStart: settings.timeMode === 'limited' ? settings.allowedStart : null,
    allowedEnd: settings.timeMode === 'limited' ? settings.allowedEnd : null,
  };
}
