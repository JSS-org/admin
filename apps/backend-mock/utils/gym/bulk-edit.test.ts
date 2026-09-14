import type { Request } from './core';

import { beforeEach, describe, expect, it } from 'vitest';

import { authenticate, login } from './auth';
import { content } from './content';
import { find, seedId } from './core';
import { coupons } from './coupons';
import { devices } from './devices';
import { foundation } from './foundation';
import { marketing } from './marketing';
import { reset } from './state';
import { training } from './training';

beforeEach(reset);
const cases: { endpoint: string; table: string; id: number; body: Record<string, any>; draft?: boolean }[] = [
  { endpoint: 'stores', table: 'stores', id: 1, body: { status: 'inactive' } },
  { endpoint: 'employees', table: 'employees', id: 21, body: { jobTitle: '资深教练', status: 'inactive' } },
  { endpoint: 'card-templates', table: 'cardTemplates', id: 40, body: { price: '219.00' }, draft: true },
  { endpoint: 'course-products', table: 'courseProducts', id: 311, body: { price: '319.00', durationMinutes: 90 } },
  { endpoint: 'course-sessions', table: 'courseSessions', id: 341, body: { room: '二号教室', capacity: 25 } },
  { endpoint: 'devices', table: 'devices', id: 501, body: { location: '东侧入口', status: 'inactive' } },
  { endpoint: 'equipment', table: 'equipment', id: 551, body: { status: 'inactive' } },
  { endpoint: 'coupon-templates', table: 'couponTemplates', id: 800, body: { totalLimit: 12_000, perMemberLimit: 2 } },
  { endpoint: 'point-rules', table: 'pointRules', id: 811, body: { points: 15, dailyLimit: 120 }, draft: true },
  { endpoint: 'point-products', table: 'pointProducts', id: 820, body: { pointsPrice: 1200, stock: 80 } },
  { endpoint: 'activities', table: 'activities', id: 860, body: { capacity: 35 } },
  { endpoint: 'franchise-inquiries', table: 'franchiseInquiries', id: 871, body: { status: 'contacted' } },
];

describe('partial patches used by table bulk editing', () => {
  it.each(cases)(
    '$endpoint accepts its batch fields and retains other data',
    ({ endpoint, table, id, body, draft }) => {
      const row = find(table, seedId(id));
      if (draft) row.status = 'draft';
      const original = structuredClone(row);
      const request: Request = {
        actor: authenticate(login('hq', '123456').accessToken),
        method: 'PATCH',
        path: `${endpoint}/${row.id}`,
        query: {},
        body,
      };
      const result =
        foundation(request) ??
        training(request) ??
        devices(request) ??
        coupons(request) ??
        marketing(request) ??
        content(request);
      expect(result).toBeDefined();
      expect(find(table, row.id)).toMatchObject(body);
      for (const key of ['id', 'name', 'storeId', 'storeIds', 'employeeNo', 'phone', 'startsAt', 'kind'])
        expect(find(table, row.id)[key]).toEqual(original[key]);
    },
  );
});
