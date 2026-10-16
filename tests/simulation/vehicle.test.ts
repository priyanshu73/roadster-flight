import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vector3 } from 'three';
import { Vehicle } from '../../src/vehicle/Vehicle';
import { idleActions, type Actions } from '../../src/core/Input';
import { STEP, FixedClock } from '../../src/core/Clock';

beforeAll(async () => {
  await RAPIER.init();
});

function fixture() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = STEP;
  world.integrationParameters.maxCcdSubsteps = 3;
  world.createCollider(RAPIER.ColliderDesc.cuboid(500, 0.5, 500).setTranslation(0, -0.5, 0));
  const vehicle = new Vehicle(world, new Vector3(0, 1.1, 0), 0);
  const tick = (actions: Partial<Actions> = {}, count = 1) => {
    for (let i = 0; i < count; i++) {
      vehicle.beforeStep(STEP, { ...idleActions(), ...actions });
      world.step();
      vehicle.afterStep();
    }
  };
  tick({}, 120);
  return { world, vehicle, tick };
}

describe('Rapier vehicle integration', () => {
  it('rests on four suspension rays and accelerates in local +Z', () => {
    const { world, vehicle, tick } = fixture();
    try {
      expect(vehicle.grounded).toBe(true);
      expect(vehicle.currentPosition.y).toBeGreaterThan(0.3);
      tick({ forward: true }, 180);
      expect(vehicle.currentPosition.z).toBeGreaterThan(15);
      expect(vehicle.speed).toBeGreaterThan(8);
    } finally {
      world.free();
    }
  });
  it('brakes before reversing', () => {
    const { world, vehicle, tick } = fixture();
    try {
      tick({ forward: true }, 120);
      const speed = vehicle.speed;
      tick({ backward: true }, 30);
      expect(vehicle.speed).toBeLessThan(speed);
      tick({ backward: true }, 300);
      expect(vehicle.body.linvel().z).toBeLessThan(-1);
    } finally {
      world.free();
    }
  });
  it('steers left toward local +X for a +Z-forward chassis', () => {
    const { world, vehicle, tick } = fixture();
    try {
      tick({ forward: true }, 90);
      tick({ forward: true, left: true }, 90);
      expect(vehicle.currentPosition.x).toBeGreaterThan(2);
    } finally {
      world.free();
    }
  });
  it('hops once, lands and can hop again without pressure underflow', () => {
    const { world, vehicle, tick } = fixture();
    try {
      const groundY = vehicle.currentPosition.y;
      tick({ hop: true });
      expect(vehicle.pressure.value).toBe(78);
      expect(vehicle.grounded).toBe(false);
      let maxY = groundY;
      for (let i = 0; i < 60; i++) {
        tick();
        maxY = Math.max(maxY, vehicle.currentPosition.y);
      }
      expect(maxY - groundY).toBeGreaterThan(1.8);
      expect(maxY - groundY).toBeLessThan(3.5);
      tick({}, 120);
      expect(vehicle.grounded).toBe(true);
      tick({ hop: true });
      expect(vehicle.hopping).toBe(true);
      expect(vehicle.pressure.value).toBeGreaterThanOrEqual(0);
    } finally {
      world.free();
    }
  });
  it('uses pressure for boost and hits a wall instead of passing through', () => {
    const { world, vehicle, tick } = fixture();
    try {
      world.createCollider(RAPIER.ColliderDesc.cuboid(20, 5, 0.5).setTranslation(0, 4.5, 60));
      tick({ forward: true, boost: true }, 240);
      expect(vehicle.currentPosition.z).toBeLessThan(60);
      expect(vehicle.currentPosition.z).toBeGreaterThan(25);
      expect(vehicle.pressure.value).toBeGreaterThanOrEqual(0);
      expect(vehicle.pressure.value).toBeLessThan(2);
    } finally {
      world.free();
    }
  });
  it('follows comparable trajectories at different rendering rates', () => {
    const results: number[] = [];
    for (const fps of [30, 60, 144]) {
      const { world, vehicle } = fixture();
      const clock = new FixedClock();
      try {
        const tick = (dt: number) => {
          vehicle.beforeStep(dt, { ...idleActions(), forward: true });
          world.step();
          vehicle.afterStep();
        };
        clock.advance(0, tick);
        for (let f = 1; f <= fps * 3; f++) clock.advance((f / fps) * 1000, tick);
        results.push(vehicle.currentPosition.z);
      } finally {
        world.free();
      }
    }
    expect(Math.max(...results) - Math.min(...results)).toBeLessThan(0.01);
  });
});
