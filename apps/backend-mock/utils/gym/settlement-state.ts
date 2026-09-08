import { insert, seedId } from './core';

export function seedSettlement() {
  insert('paymentAccounts', {
    id: seedId(910),
    provider: 'bank',
    merchantId: 'DEMO-HQ',
    accountName: '总部开发账户（未绑定）',
    accountMasked: '****0000',
    bindingStatus: 'unbound',
    storeId: null,
  });
  insert('settlementRules', {
    id: seedId(911),
    storeId: seedId(1),
    version: 1,
    cycleUnit: 'day',
    cycleValue: 1,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    status: 'draft',
    items: [{ paymentAccountId: seedId(910), ratio: '1.000000' }],
  });
}
