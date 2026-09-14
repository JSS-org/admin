import type { GymRow } from '../../../api/gym';

export async function patchSelectedRows(
  rows: GymRow[],
  values: Record<string, any>,
  patch: (row: GymRow, values: Record<string, any>) => Promise<unknown>,
) {
  const succeeded: string[] = [];
  const failed: { row: GymRow; message: string }[] = [];
  for (const row of rows) {
    try {
      await patch(row, values);
      succeeded.push(row.id);
    } catch (error) {
      failed.push({ row, message: error instanceof Error ? error.message : '保存失败，请核对权限和记录状态后重试' });
    }
  }
  return { succeeded, failed };
}
