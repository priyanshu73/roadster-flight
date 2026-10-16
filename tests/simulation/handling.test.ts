import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initDrivingHarness, type DrivingResult } from '../../src/testing/DrivingHarness';
import { HANDLING_SCENARIOS, runHandlingSuite } from '../../src/testing/HandlingSuite';
import { validateCity } from '../../src/world/City';

let results: DrivingResult[];
beforeAll(async () => {
  await initDrivingHarness();
  const city = validateCity(
    JSON.parse(readFileSync('public/cities/new-york-midtown/district.json', 'utf8')),
  );
  results = runHandlingSuite(city);
});

describe('scripted 3D driving scenarios', () => {
  for (const scenario of HANDLING_SCENARIOS)
    it(scenario.name, () => {
      const result = results.find((r) => r.id === scenario.id)!;
      for (const check of result.checks)
        expect(check.passed, `${check.name}: ${check.actual}; expected ${check.expected}`).toBe(
          true,
        );
    });
  it('has symmetric left/right steering and matching WASD/arrow trajectories', () => {
    for (const [left, right] of [
      ['left', 'right'],
      ['boost-left', 'boost-right'],
      ['air-left', 'air-right'],
    ]) {
      const a = results.find((r) => r.id === left)!.samples.at(-1)!;
      const b = results.find((r) => r.id === right)!.samples.at(-1)!;
      expect(Math.abs(a.yawDegrees + b.yawDegrees)).toBeLessThan(0.5);
      expect(Math.abs(a.localX + b.localX)).toBeLessThan(0.1);
    }
    for (const side of ['left', 'right']) {
      const wasd = results.find((r) => r.id === side)!.samples.at(-1)!;
      const arrows = results.find((r) => r.id === `arrows-${side}`)!.samples.at(-1)!;
      expect(arrows.position).toEqual(wasd.position);
      expect(arrows.yawDegrees).toEqual(wasd.yawDegrees);
    }
  });
});
