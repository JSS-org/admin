import { describe, expect, it } from 'vitest';

import { prepareSettings, validateSettings } from './settings-form';
describe('sales configuration forms', () => {
  it('requires complete monthly billing values before saving', () => {
    const item = { cardTemplateId: 'card', price: '199.00', billingDay: null, renewalNoticeDays: 3, graceDays: 0 };
    expect(validateSettings('subscription-settings', { items: [item] })).toBeUndefined();
    expect(validateSettings('subscription-settings', { items: [{ ...item, graceDays: null }] })).toContain('天数');
    expect(validateSettings('subscription-settings', { items: [{ ...item, billingDay: 31 }] })).toContain('扣款日');
  });
  it('rejects duplicate products, empty offers and invalid selling periods', () => {
    const item = { cardTemplateId: 'card', salePrice: '199.00', enabled: true, timing: 'always' };
    expect(validateSettings('online-sales-settings', { enabled: true, offers: [] })).toContain('至少');
    expect(validateSettings('online-sales-settings', { enabled: true, offers: [item, item] })).toContain('重复');
    expect(
      validateSettings('online-sales-settings', {
        enabled: true,
        offers: [{ ...item, timing: 'scheduled', startsAt: '2026-10-02', endsAt: '2026-10-01' }],
      }),
    ).toContain('结束时间');
  });
  it('clears dates when a timed offer is switched to always available', () => {
    const body = prepareSettings('online-sales-settings', {
      enabled: true,
      contractRequired: true,
      offers: [
        {
          cardTemplateId: 'card',
          salePrice: '199.00',
          enabled: true,
          timing: 'always',
          startsAt: '2026-10-01',
          endsAt: '2026-10-31',
        },
      ],
    });
    expect(body.offers?.[0]).toEqual({
      cardTemplateId: 'card',
      salePrice: '199.00',
      enabled: true,
      startsAt: null,
      endsAt: null,
    });
  });
  it('requires channels and a complete valid daily verification window', () => {
    expect(
      validateSettings('verification-settings', { enabled: true, supportedChannels: [], timeMode: 'all' }),
    ).toContain('渠道');
    expect(
      validateSettings('verification-settings', {
        enabled: true,
        supportedChannels: ['miniapp'],
        timeMode: 'limited',
        allowedStart: '20:00',
        allowedEnd: '08:00',
      }),
    ).toContain('结束时间');
    expect(
      prepareSettings('verification-settings', {
        enabled: false,
        requireCheckin: true,
        supportedChannels: [],
        timeMode: 'all',
        allowedStart: '09:00',
        allowedEnd: '18:00',
      }),
    ).toMatchObject({ allowedStart: null, allowedEnd: null });
  });
});
