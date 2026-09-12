import { beforeEach, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { seedId } from './core';
import { fileAccess } from './files';
import { reset } from './state';
beforeEach(reset);
it('requires business permission as well as file permission for private documents', () => {
  const actor = authenticate(login('store1', '123456').accessToken);
  const file = {
    id: seedId(2000),
    storeId: seedId(1),
    category: 'body_report',
  };
  fileAccess(actor, file);
  actor.codes = actor.codes.filter((c) => c !== 'measurements:read');
  expect(() => fileAccess(actor, file)).toThrow('权限');
  expect(() => fileAccess(actor, { ...file, storeId: seedId(2) })).toThrow('不可访问');
  expect(() => fileAccess(actor, { ...file, category: 'contract' }, true)).toThrow('权限');
});
