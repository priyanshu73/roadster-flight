import RAPIER from '@dimforge/rapier3d-compat';
import { Vector3, Quaternion, Euler } from 'three';
import { InputBuffer } from '../core/Input';
import { STEP } from '../core/Clock';
import { Vehicle } from '../vehicle/Vehicle';
import type { City } from '../world/City';
import { createCityColliders } from '../world/CityPhysics';

let ready: Promise<void> | undefined;
export const initDrivingHarness = () => (ready ??= RAPIER.init());
export interface Phase {
  seconds: number;
  keys: string[];
  label: string;
}
export interface DrivingScenario {
  id: string;
  name: string;
  phases: Phase[];
  city?: boolean;
  heading?: number;
  wall?: number;
  airTilt?: [number, number];
}
export type DrivingSample = ReturnType<Vehicle['telemetry']> & {
  time: number;
  phase: string;
  keys: string[];
  yawDegrees: number;
  localX: number;
  localZ: number;
  height: number;
};
export interface DrivingResult {
  id: string;
  name: string;
  city: boolean;
  samples: DrivingSample[];
  checks: { name: string; passed: boolean; actual: number; expected: string }[];
}

/** Runs the real input buffer, vehicle controller and city colliders; no DOM or GPU. */
export function runDrivingScenario(scenario: DrivingScenario, city?: City): DrivingResult {
  if (scenario.city && !city) throw new Error('City scenario requires the bundled city');
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = STEP;
  world.integrationParameters.maxCcdSubsteps = 3;
  if (scenario.city) createCityColliders(city!, world);
  else
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(1000, 0.5, 1000).setTranslation(0, -0.5, 0).setFriction(1),
    );
  if (scenario.wall)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(30, 5, 0.5).setTranslation(0, 4.5, scenario.wall),
    );
  const spawn = scenario.city ? new Vector3(...city!.spawn.position) : new Vector3(0, 1.1, 0);
  const heading = scenario.city ? city!.spawn.headingRadians : (scenario.heading ?? 0);
  const vehicle = new Vehicle(world, spawn, heading);
  const input = new InputBuffer();
  const samples: DrivingSample[] = [];
  const step = () => {
    vehicle.beforeStep(STEP, input.tick());
    world.step();
    vehicle.afterStep();
  };
  try {
    for (let i = 0; i < 120; i++) step();
    if (scenario.airTilt) {
      const pose = vehicle.body.translation();
      vehicle.body.setTranslation({ x: pose.x, y: pose.y + 4, z: pose.z }, true);
      const rotation = new Quaternion().setFromEuler(
        new Euler(scenario.airTilt[0], heading, scenario.airTilt[1], 'YXZ'),
      );
      vehicle.body.setRotation(rotation, true);
      vehicle.afterStep();
    }
    const initial = vehicle.telemetry();
    let lastHeading = initial.heading,
      yaw = 0,
      tick = 0;
    let held: string[] = [];
    for (const phase of scenario.phases) {
      for (const key of held) if (!phase.keys.includes(key)) input.up(key);
      for (const key of phase.keys) if (!held.includes(key)) input.down(key);
      held = phase.keys;
      for (let i = 0; i < Math.round(phase.seconds / STEP); i++) {
        step();
        tick++;
        const s = vehicle.telemetry();
        yaw += Math.atan2(Math.sin(s.heading - lastHeading), Math.cos(s.heading - lastHeading));
        lastHeading = s.heading;
        const dx = s.position[0] - initial.position[0],
          dz = s.position[2] - initial.position[2];
        samples.push({
          ...s,
          time: tick * STEP,
          phase: phase.label,
          keys: held.slice(),
          yawDegrees: (yaw * 180) / Math.PI,
          // Right-positive driver frame: forward cross up is local -X.
          localX: -Math.cos(heading) * dx + Math.sin(heading) * dz,
          localZ: Math.sin(heading) * dx + Math.cos(heading) * dz,
          height: s.position[1] - initial.position[1],
        });
      }
    }
    return { id: scenario.id, name: scenario.name, city: !!scenario.city, samples, checks: [] };
  } finally {
    world.free();
  }
}
