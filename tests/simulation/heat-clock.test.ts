import { describe, expect, it } from 'vitest';
import { HeatClock, formatHeatTime } from '../../src/gameplay/HeatClock';
const safe = { speed: 12, seen: true, nearbyCops: 0, helicopterNear: false };
describe('Heat Clock survival rules', () => {
  it('starts only after an incident and deduplicates repeated contact', () => {
    const h = new HeatClock();
    h.tick(5, safe);
    expect(h.clock).toBe(0);
    expect(h.incident('shelter', 'glass')).toBe(true);
    expect(h.level).toBe(1);
    expect(h.smashes).toBe(1);
    expect(h.incident('shelter', 'glass')).toBe(false);
    expect(h.crimes).toBe(1);
  });
  it('escalates every 25 survival seconds with bounded dispatch counts', () => {
    const h = new HeatClock();
    h.incident('cone', 'cone');
    expect(h.targetCops).toBe(2);
    for (let level = 2; level <= 5; level++) {
      h.tick(25, safe);
      expect(h.level).toBe(level);
    }
    expect(h.targetCops).toBe(9);
    h.tick(100, safe);
    expect(h.level).toBe(5);
  });
  it('escalates for crimes, tracks people separately and cools after nine unseen seconds', () => {
    const h = new HeatClock();
    h.incident('cone', 'cone');
    for (let i = 0; i < 3; i++) h.incident(`ped-${i}`, 'pedestrian');
    expect(h.level).toBe(2);
    expect(h.peopleHit).toBe(3);
    expect(h.smashes).toBe(1);
    h.tick(8, { ...safe, seen: false });
    expect(h.level).toBe(2);
    h.tick(1, { ...safe, seen: false });
    expect(h.level).toBe(1);
    expect(h.peak).toBe(2);
  });
  it('requires nearby police to capture, saves the best once and resets every run field', () => {
    const values = new Map<string, string>(),
      writes: string[] = [];
    const h = new HeatClock({
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => {
        values.set(k, v);
        writes.push(v);
      },
    });
    h.incident('traffic', 'traffic');
    h.tick(10, safe);
    expect(h.busted).toBe(0);
    for (let i = 0; i < 180; i++) h.tick(1 / 60, { ...safe, speed: 0, nearbyCops: 2 });
    expect(h.over).toBe(true);
    expect(h.newBest).toBe(true);
    expect(writes).toHaveLength(1);
    const best = h.best;
    h.finish();
    expect(writes).toHaveLength(1);
    h.reset();
    expect(h.best).toBe(best);
    expect(h.snapshot()).toMatchObject({
      chase: false,
      over: false,
      clock: 0,
      level: 0,
      peak: 0,
      busted: 0,
      cool: 0,
      distance: 0,
      smashes: 0,
      peopleHit: 0,
      crimes: 0,
    });
    expect(h.incident('traffic', 'traffic')).toBe(true);
  });
  it('ignores corrupt scores and blocked local storage', () => {
    expect(new HeatClock({ getItem: () => 'Infinity', setItem: () => {} }).best).toBe(0);
    const h = new HeatClock({
      getItem: () => {
        throw Error('denied');
      },
      setItem: () => {
        throw Error('denied');
      },
    });
    h.incident('hit', 'traffic');
    h.tick(2, { ...safe, nearbyCops: 9, speed: 0 });
    expect(h.over).toBe(true);
  });
  it('formats scores consistently at minute boundaries', () => {
    expect(formatHeatTime(60)).toBe('1:00.0');
    expect(formatHeatTime(9.99)).toBe('0:09.9');
  });
});
