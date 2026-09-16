// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import routeIcons from './route-icons.json';

describe('offline route icons', () => {
  it('bundles SVG data for every gym route icon, including hidden routes', () => {
    const routes = readFileSync(new URL('../router/routes/modules/gym.ts', import.meta.url), 'utf8');
    const names = [...routes.matchAll(/icon:\s*'lucide:([^']+)'/g)].map((match) => match[1] ?? '');
    const icons: Record<string, { body: string }> = routeIcons.icons;

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(icons[name]?.body, `Missing local route icon: lucide:${name}`).toBeTruthy();
    }
  });
});
