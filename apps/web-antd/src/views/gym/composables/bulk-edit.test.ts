import { describe, expect, it, vi } from 'vitest';

import { patchSelectedRows } from './bulk-edit';

describe('bulk edit', () => {
  it('updates only selected rows and keeps exact failures for retry', async () => {
    const patch = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('状态已锁定'))
      .mockResolvedValueOnce({});
    const targets = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = await patchSelectedRows(targets, { status: 'inactive' }, patch);
    expect(result.succeeded).toEqual(['a', 'c']);
    expect(result.failed).toEqual([{ row: { id: 'b' }, message: '状态已锁定' }]);
    expect(patch).toHaveBeenCalledTimes(3);
    expect(patch.mock.calls.every((call) => JSON.stringify(call[1]) === '{"status":"inactive"}')).toBe(true);
    patch.mockClear().mockResolvedValue({});
    await patchSelectedRows(
      result.failed.map((item) => item.row),
      { status: 'inactive' },
      patch,
    );
    expect(patch).toHaveBeenCalledExactlyOnceWith({ id: 'b' }, { status: 'inactive' });
  });
});
