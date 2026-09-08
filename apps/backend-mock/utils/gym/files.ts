import type { Actor, Row } from './core';

import { accessibleStores, allowed, fail, storeScope } from './core';

export function fileAccess(actor: Actor, file: Row, write = false) {
  const check = (code: string) => {
    allowed(actor, code);
    if (file.storeId) storeScope(actor, file.storeId);
    else if (accessibleStores(actor) !== null) fail('文件不可访问', 404);
  };
  check(write ? 'files:upload' : 'files:read');
  if (file.category === 'body_report')
    check(write ? 'measurements:write' : 'measurements:read');
  if (file.category === 'contract') {
    const code =
      !write && actor.codes.includes('contracts:read')
        ? 'contracts:read'
        : 'contracts:templates';
    check(code);
  }
}
