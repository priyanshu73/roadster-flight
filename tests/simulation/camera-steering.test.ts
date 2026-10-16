import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PerspectiveCamera, Vector3 } from 'three';
import { Vehicle } from '../../src/vehicle/Vehicle';
import { CameraRig } from '../../src/rendering/CameraRig';
import { idleActions } from '../../src/core/Input';

beforeAll(async () => {
  await RAPIER.init();
});

describe('steering as seen through the actual chase camera', () => {
  for (const heading of [0, Math.PI / 2, -Math.PI / 2, 2.635])
    for (const close of [false, true])
      for (const airborne of [false, true])
        for (const direction of ['left', 'right'] as const)
          it(`${direction}, heading ${heading.toFixed(2)}, ${close ? 'close' : 'far'}, ${airborne ? 'air' : 'road'}`, () => {
            const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
            world.timestep = 1 / 60;
            world.createCollider(
              RAPIER.ColliderDesc.cuboid(500, 0.5, 500).setTranslation(0, -0.5, 0),
            );
            const vehicle = new Vehicle(world, new Vector3(0, 1.1, 0), heading);
            const tick = (input = idleActions()) => {
              vehicle.beforeStep(1 / 60, input);
              world.step();
              vehicle.afterStep();
            };
            try {
              for (let i = 0; i < 120; i++) tick();
              for (let i = 0; i < 60; i++) tick({ ...idleActions(), forward: true });
              if (airborne) tick({ ...idleActions(), hop: true });
              const camera = new PerspectiveCamera(52, 16 / 9, 0.15, 1800);
              const rig = new CameraRig(camera);
              if (close) rig.cycle();
              rig.update(
                vehicle.currentPosition,
                vehicle.currentRotation,
                vehicle,
                1 / 60,
                false,
                true,
              );
              camera.updateMatrixWorld(true);
              // Freeze the pre-turn view, then measure the car's nose on screen.
              // This assertion intentionally makes no assumption about world +/-X or yaw signs.
              for (let i = 0; i < 24; i++)
                tick({ ...idleActions(), forward: !airborne, [direction]: true });
              const centre = vehicle.currentPosition.clone().project(camera);
              const nose = new Vector3(0, 0, 2)
                .applyQuaternion(vehicle.currentRotation)
                .add(vehicle.currentPosition)
                .project(camera);
              const screenTurn = nose.x - centre.x;
              expect(screenTurn * (direction === 'left' ? -1 : 1)).toBeGreaterThan(0.01);
            } finally {
              world.free();
            }
          });
});
