import { describe, expect, it } from 'vitest';
import { InputBuffer } from '../../src/core/Input';
import { FixedClock, STEP } from '../../src/core/Clock';
import { Pressure } from '../../src/vehicle/Pressure';

describe('keyboard actions', () => {
  it('keeps a quick press/release until the next tick and consumes the edge once', () => {
    const input = new InputBuffer();
    input.down('ShiftLeft');
    input.up('ShiftLeft');
    expect(input.tick().hop).toBe(true);
    expect(input.tick().hop).toBe(false);
  });
  it('ignores browser key repeat for hop', () => {
    const input = new InputBuffer();
    input.down('ShiftRight');
    expect(input.tick().hop).toBe(true);
    input.down('ShiftRight', true);
    expect(input.tick().hop).toBe(false);
  });
  it('preserves an action held through an alternative physical key', () => {
    const input = new InputBuffer();
    input.down('KeyW');
    input.down('ArrowUp');
    input.up('KeyW');
    expect(input.tick().forward).toBe(true);
    input.up('ArrowUp');
    expect(input.tick().forward).toBe(false);
  });
  it('clears held keys and queued actions on blur/pause', () => {
    const input = new InputBuffer();
    input.down('KeyW');
    input.down('ShiftLeft');
    input.clear();
    expect(input.tick().forward).toBe(false);
    expect(input.tick().hop).toBe(false);
  });
});

describe('fixed clock', () => {
  it('advances the same number of ticks across render schedules', () => {
    for (const fps of [30, 60, 144]) {
      const clock = new FixedClock();
      let ticks = 0;
      clock.advance(0, () => ticks++);
      for (let f = 1; f <= fps * 5; f++) clock.advance((f / fps) * 1000, () => ticks++);
      expect(ticks).toBe(300);
    }
  });
  it('bounds catchup and does not simulate a suspended tab', () => {
    const clock = new FixedClock();
    let ticks = 0;
    clock.advance(0, () => ticks++);
    clock.advance(100000, () => ticks++);
    expect(ticks).toBe(5);
    clock.reset();
    clock.advance(200000, () => ticks++);
    expect(ticks).toBe(5);
  });
});

describe('pressure', () => {
  it('rejects insufficient and invalid costs without going negative', () => {
    const pressure = new Pressure();
    expect(pressure.spend(90)).toBe(true);
    expect(pressure.spend(22)).toBe(false);
    expect(pressure.spend(-1)).toBe(false);
    expect(pressure.spend(NaN)).toBe(false);
    expect(pressure.value).toBe(10);
  });
  it('only recharges after grounded coasting delay and caps capacity', () => {
    const pressure = new Pressure();
    pressure.spend(60);
    for (let i = 0; i < 90; i++) pressure.update(STEP, true, true);
    expect(pressure.value).toBe(40);
    pressure.update(10, false, true);
    expect(pressure.value).toBe(40);
    pressure.update(10, true, false);
    expect(pressure.value).toBe(40);
    pressure.update(10, true, true);
    expect(pressure.value).toBe(100);
  });
});
