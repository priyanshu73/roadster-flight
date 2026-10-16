import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Vector3, Quaternion } from 'three';
import { createHarborCity } from '../../src/world/HarborCity';
import { createCityColliders } from '../../src/world/CityPhysics';
import { CityLife } from '../../src/gameplay/CityLife';
import { Vehicle } from '../../src/vehicle/Vehicle';
import { idleActions, type Actions } from '../../src/core/Input';
import { RoadNetwork } from '../../src/gameplay/RoadNetwork';

beforeAll(async () => {
  await RAPIER.init();
});
function fixture() {
  const city = createHarborCity(),
    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / 60;
  createCityColliders(city, world);
  const vehicle = new Vehicle(
    world,
    new Vector3(...city.spawn.position),
    city.spawn.headingRadians,
  );
  for (let i = 0; i < 120; i++) {
    vehicle.beforeStep(1 / 60, idleActions());
    world.step();
    vehicle.afterStep();
  }
  const life = new CityLife(city, world, vehicle);
  const tick = (count: number, input: Partial<Actions> = {}) => {
    for (let i = 0; i < count; i++) {
      vehicle.beforeStep(1 / 60, { ...idleActions(), ...input });
      life.beforeStep(1 / 60);
      life.step();
      vehicle.afterStep();
      life.afterStep(1 / 60);
    }
  };
  const dispose = () => {
    life.dispose();
    world.free();
  };
  return { city, world, vehicle, life, tick, dispose };
}
describe('integrated living city physics', () => {
  it('a restarted run stays clear of incidents on its first physics ticks',()=>{
    const f=fixture();try{
      for(let run=0;run<3;run++) {
        f.tick(150,{forward:true,boost:true});expect(f.life.heat.chase).toBe(true);
        f.vehicle.reset(true);f.vehicle.pressure.reset();f.life.reset();f.tick(10);
        expect(f.life.heat.chase).toBe(false);expect(f.vehicle.speed).toBeLessThan(1);
      }
    }finally{f.dispose();}
  });
  it('has 96 pedestrians, 32 traffic vehicles, bounded cop/debris pools and a connected bridge route', () => {
    const f = fixture();
    try {
      expect(f.life.snapshot()).toMatchObject({
        pedestrians: 96,
        traffic: 32,
        activeCops: 0,
        props: 80,
        brokenProps: 0,
      });
      expect(f.life.cops).toHaveLength(9);
      expect(
        f.life.traffic.slice(24, 30).every((c) => Math.abs(c.body.translation().z + 154) < 4),
      ).toBe(true);
      const roads = new RoadNetwork(f.city),
        path = roads.route(roads.nearest(42, 72), roads.nearest(510, -154));
      expect(path.length).toBeGreaterThan(3);
      expect(roads.nodes[path.at(-1)!].x).toBe(510);
    } finally {
      f.dispose();
    }
  });
  it('a real driving collision starts heat, breaks a prop, emits debris and dispatches cops', () => {
    const f = fixture();
    try {
      f.tick(240, { forward: true, boost: true });
      expect(f.life.heat.chase).toBe(true);
      expect(f.life.props[0].dead).toBe(true);
      expect(f.life.heat.smashes).toBeGreaterThan(0);
      expect(f.life.cops.some((c) => c.active)).toBe(true);
      f.life.reset();
      expect(f.life.props.every((p) => !p.dead && p.collider.isEnabled())).toBe(true);
      expect(f.life.cops.every((c) => !c.active && !c.collider.isEnabled())).toBe(true);
      expect(f.life.heat.clock).toBe(0);
    } finally {
      f.dispose();
    }
  });
  it('talk selects a nearby pedestrian and times out otherwise', () => {
    const f = fixture();
    try {
      f.life.talk();
      expect(f.life.events.at(-1)!.speaker).not.toBe('CITY');
      f.vehicle.body.setTranslation({ x: 1000, y: 1, z: 1000 }, true);
      f.vehicle.afterStep();
      f.life.talk();
      expect(f.life.events.at(-1)!.speaker).toBe('CITY');
    } finally {
      f.dispose();
    }
  });
  it('pedestrian contact causes a physical knockdown once and reset restores them', () => {
    const f = fixture();
    try {
      const p = f.life.people[3],
        a = p.anchor;
      f.vehicle.body.setTranslation({ x: a.x - 4, y: 0.55, z: a.z }, true);
      f.vehicle.body.setRotation(
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
        true,
      );
      f.vehicle.body.setLinvel({ x: 10, y: 0, z: 0 }, true);
      f.vehicle.afterStep();
      f.tick(20);
      expect(f.life.heat.peopleHit).toBeGreaterThan(0);
      expect(f.life.people.some((p) => p.hit && p.body.isDynamic())).toBe(true);
      f.life.reset();
      expect(
        f.life.people.every((p) => !p.hit && p.collider.isSensor() && p.body.isKinematic()),
      ).toBe(true);
    } finally {
      f.dispose();
    }
  });
  it('activates a helicopter at heat four and removes it on reset', () => {
    const f = fixture();
    try {
      f.life.heat.incident('crime', 'traffic');
      f.life.heat.level = 4;
      f.tick(2);
      expect(f.life.helicopter.active).toBe(true);
      expect(f.life.helicopter.position.y).toBeGreaterThan(20);
      f.life.reset();
      expect(f.life.helicopter.active).toBe(false);
    } finally {
      f.dispose();
    }
  });
  it('supports the bridge deck over water and lets water falls recover naturally', () => {
    const f = fixture();
    try {
      f.vehicle.body.setTranslation({ x: 300, y: 1.1, z: -159 }, true);
      f.vehicle.afterStep();
      f.tick(120);
      expect(f.vehicle.grounded).toBe(true);
      expect(f.vehicle.currentPosition.y).toBeGreaterThan(0.3);
      f.vehicle.body.setTranslation({ x: 300, y: 1, z: -100 }, true);
      f.vehicle.afterStep();
      f.tick(90);
      expect(f.vehicle.currentPosition.y).toBeLessThan(-2);
    } finally {
      f.dispose();
    }
  });
});
