import { describe, expect, it } from 'vitest';

import { initial, prepare } from './data';

describe('approval template editor', () => {
  it('submits selected employees as ordered steps accepted by the API', () => {
    expect(
      prepare({ name: '开卡审批', businessType: 'card_opening', approverEmployeeIds: ['first', 'second'] }),
    ).toEqual({
      name: '开卡审批',
      businessType: 'card_opening',
      steps: [
        { stepNo: 1, approverEmployeeId: 'first' },
        { stepNo: 2, approverEmployeeId: 'second' },
      ],
    });
    expect(
      initial({ id: 'template', steps: [{ stepNo: 1, approverEmployeeId: 'first' }] }).approverEmployeeIds,
    ).toEqual(['first']);
  });
});
