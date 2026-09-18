import { describe, expect, it } from 'vitest';

import { tableActions } from './table-actions';

describe('table action icons', () => {
  it('assigns a distinct icon to every action', () => {
    const icons = Object.values(tableActions).map((action) => action.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
