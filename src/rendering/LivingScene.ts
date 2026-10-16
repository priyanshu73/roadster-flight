import * as T from 'three';
import type { CityLife } from '../gameplay/CityLife';
import type { Vehicle } from '../vehicle/Vehicle';
import { ShapeKit } from './ShapeKit';
import { SceneBatch } from './Batch';
import { CAFES, HARBOR_XS, HARBOR_ZS } from '../world/HarborCity';
import { seededRandom } from '../gameplay/RoadNetwork';

export class LivingScene {
  readonly group = new T.Group();
  readonly courierState = { perched: false };
  private kit = new ShapeKit();
  private pedestrians: ReturnType<ShapeKit['person']>[] = [];
  private vehicles: ReturnType<ShapeKit['car']>[] = [];
  private propGroups: T.Group[] = [];
  private courier = this.kit.person(0xe5a13e, true);
  private web = new T.Line(
    new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
    new T.LineBasicMaterial({ color: 0xe2f6ef }),
  );
  private chopper = new T.Group();
  private rotor: T.Mesh;
  private spotlight: T.SpotLight;
  private debris: T.InstancedMesh;
  private batch: SceneBatch;
  private water: T.Mesh<T.PlaneGeometry, T.MeshStandardMaterial> | null = null;
  constructor(readonly life: CityLife) {
    const k = this.kit;
    life.people.forEach((_, i) => {
      const p = k.person([0xd79b5b, 0x6b8990, 0xb35f55, 0x577364, 0xcfb892][i % 5]);
      this.pedestrians.push(p);
      this.group.add(p.group);
    });
    [...life.traffic, ...life.cops].forEach((agent, i) => {
      const p = k.car(
        agent.kind === 'taxi'
          ? 0xe5b84b
          : agent.kind === 'interceptor'
            ? 0x1d2428
            : agent.kind === 'suv'
              ? 0x2b3d66
              : agent.kind === 'patrol'
                ? 0xe1e7e7
                : [0x627b8b, 0xa15c4b, 0xc2c0b2][i % 3],
        ['patrol', 'interceptor', 'suv'].includes(agent.kind),
        agent.kind === 'suv',
      );
      this.vehicles.push(p);
      this.group.add(p.group);
    });
    const glass = new T.MeshPhysicalMaterial({
      color: 0x9fd6e8,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.3,
    });
    for (const prop of life.props) {
      const g = new T.Group();
      g.position.copy(prop.position);
      this.group.add(g);
      this.propGroups.push(g);
      if (prop.kind === 'glass') {
        for (const z of [-1.6, 1.6]) {
          const wall = new T.Mesh(k.cube, glass);
          wall.scale.set(1.6, 2.6, 0.08);
          wall.position.set(0, 1.4, z);
          g.add(wall);
        }
        k.box(g, 0, 2.85, 0, 1.8, 0.12, 3.8, 0x3b4b4e);
      } else {
        const m = new T.Mesh(
          prop.kind === 'cone' ? k.cone : k.cylinder,
          k.material(
            prop.kind === 'cone' ? 0xff7a1a : prop.kind === 'hydrant' ? 0xd2362e : 0x33403f,
          ),
        );
        m.scale.set(prop.kind === 'bin' ? 0.9 : 0.6, 1, prop.kind === 'bin' ? 0.9 : 0.6);
        m.position.y = 0.5;
        g.add(m);
      }
    }
    k.box(this.chopper, 0, 0, 0, 2.2, 1.6, 5, 0x161b1e);
    k.box(this.chopper, 0, 0, -4.5, 0.4, 0.4, 5, 0x161b1e);
    this.rotor = k.box(this.chopper, 0, 1.1, 0, 9, 0.08, 0.5, 0xaaaaaa);
    const beam = new T.Mesh(
      new T.ConeGeometry(7, 26, 16, 1, true),
      new T.MeshBasicMaterial({
        color: 0xfff6cf,
        transparent: true,
        opacity: 0.12,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    beam.position.y = -13;
    this.chopper.add(beam);
    this.spotlight = new T.SpotLight(0xfff2c8, 100, 350, 0.3, 0.65, 0.6);
    this.chopper.add(this.spotlight);
    this.group.add(this.spotlight.target, this.chopper);
    this.group.add(this.courier.group, this.web);
    if (life.city.id === 'new-york-harbor') this.harborExtras();
    this.batch = new SceneBatch(this.group);
    this.debris = new T.InstancedMesh(
      k.cube,
      new T.MeshStandardMaterial({
        color: 0xb3d4dc,
        roughness: 0.3,
        transparent: true,
        opacity: 0.8,
      }),
      life.debris.length,
    );
    this.debris.frustumCulled = false;
    this.group.add(this.debris);
  }
  private harborExtras(): void {
    const k = this.kit,
      rnd = seededRandom(948);
    this.water = new T.Mesh(
      new T.PlaneGeometry(1800, 1800, 32, 32),
      new T.MeshStandardMaterial({ color: 0x367b94, metalness: 0.45, roughness: 0.27 }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(110, -2.1, -160);
    this.group.add(this.water);
    k.box(this.group, 137, -0.05, -155, 18, 0.05, 850, 0xb8b09b);
    for (const z of [-165, -143]) {
      k.box(this.group, 300, 2, z, 310, 0.3, 0.3, 0x697c80);
      for (let x = 150; x < 455; x += 7) k.box(this.group, x, 1.2, z, 0.15, 2, 0.15, 0x697c80);
    }
    for (const x of [210, 380]) {
      for (const z of [-166, -142]) {
        k.box(this.group, x, 17, z, 6, 36, 5, 0xc4ad8b);
        k.box(this.group, x, 32, z, 10, 3, 7, 0xcfb995);
      }
      k.box(this.group, x, 29, -154, 6, 4, 25, 0xc4ad8b);
      k.box(this.group, x, 36, -154, 8, 2, 29, 0xcfb995);
    }
    for (const z of [-166, -142]) {
      let previous: T.Vector3 | null = null;
      for (let x = 150; x <= 455; x += 5) {
        const u = x < 210 ? (x - 150) / 60 : x < 380 ? (x - 210) / 170 : (455 - x) / 75,
          y = x >= 210 && x <= 380 ? 7 + 28 * (2 * u - 1) ** 2 : 3 + 32 * u,
          p = new T.Vector3(x, y, z);
        if (previous) k.cable(this.group, previous, p, 0.18);
        if (x % 10 === 0) k.cable(this.group, new T.Vector3(x, 1.4, z), p);
        previous = p;
      }
    }
    const bridgeSign = k.sign('BROOKLYN / HARBOR');
    bridgeSign.position.set(150, 4, -141);
    this.group.add(bridgeSign);
    for (const cafe of CAFES) {
      const sign = k.sign(cafe.name, 15);
      sign.position.set(cafe.x, 4, cafe.z);
      this.group.add(sign);
      k.box(this.group, cafe.x, 2, cafe.z - 1, 17, 4, 1, cafe.color);
      k.box(this.group, cafe.x, 4.8, cafe.z + 2, 18, 0.3, 5, cafe.color);
      for (const offset of [-5, 0, 5]) {
        k.box(this.group, cafe.x + offset, 1, cafe.z + 7, 2, 0.15, 2, 0xd9ae79);
        k.box(this.group, cafe.x + offset, 0.5, cafe.z + 7, 0.2, 1, 0.2, 0x3b4b4e);
        for (const dx of [-1.4, 1.4])
          k.box(this.group, cafe.x + offset + dx, 0.6, cafe.z + 7, 0.8, 0.8, 0.8, 0x50736b);
      }
    }
    for (const x of HARBOR_XS)
      for (const z of HARBOR_ZS)
        for (let i = -4; i <= 4; i++)
          k.box(this.group, x + i * 2, 0.05, z + 14, 1.2, 0.02, 4.5, 0xd9d9cb);
    for (let z = -490; z < 240; z += 42) {
      k.box(this.group, 128, 1, z, 3, 0.3, 1, 0x9d805b);
      k.box(this.group, 126, 2, z + 14, 0.5, 4, 0.5, 0x776349);
      k.ball(this.group, 126, 5, z + 14, 2.7, 0x7f9a78);
    }
    for (let i = 0; i < 22; i++) {
      const cloud = k.ball(
        this.group,
        -650 + rnd() * 1300,
        150 + rnd() * 100,
        -700 + rnd() * 900,
        1,
        0xd9dcd7,
      );
      cloud.scale.set(30 + rnd() * 45, 4 + rnd() * 4, 16 + rnd() * 15);
    }
    const disc = k.ball(this.group, 400, 180, -700, 27, 0xffe7b0);
    disc.userData.noBatch = true;
  }
  update(time: number, vehicle: Vehicle): void {
    this.life.people.forEach((p, i) => {
      const view = this.pedestrians[i];
      view.group.position.copy(p.body.translation()).y -= 0.9;
      view.group.quaternion.copy(p.body.rotation());
      if (!p.hit) {
        view.group.rotation.y = p.diner
          ? Math.sin(time * 0.3 + p.phase) * 0.3
          : Math.atan2(p.walkDirection.x, p.walkDirection.z) +
            (Math.cos(time * 0.12 + p.phase) > 0 ? 0 : Math.PI);
        view.legs.forEach(
          (l, j) => (l.rotation.x = p.diner ? 0 : Math.sin(time * 6 + p.phase + j * Math.PI) * 0.4),
        );
        view.arms.forEach(
          (a, j) =>
            (a.rotation.x = p.diner ? 0 : -Math.sin(time * 6 + p.phase + j * Math.PI) * 0.3),
        );
      }
    });
    [...this.life.traffic, ...this.life.cops].forEach((agent, i) => {
      const v = this.vehicles[i];
      v.group.visible = agent.active;
      v.group.position.copy(agent.body.translation());
      v.group.quaternion.copy(agent.body.rotation());
      const flash = Math.floor(time * 8) % 2 === 0;
      v.red.visible =
        agent.kind === 'patrol' || agent.kind === 'interceptor' || agent.kind === 'suv'
          ? flash
          : false;
      v.blue.visible = ['patrol', 'interceptor', 'suv'].includes(agent.kind) && !flash;
    });
    this.life.props.forEach((p, i) => (this.propGroups[i].visible = !p.dead));
    const h = this.life.helicopter;
    this.chopper.visible = h.active;
    this.chopper.position.copy(h.position);
    this.chopper.rotation.y = h.heading;
    this.rotor.rotation.y = time * 30;
    this.spotlight.target.position.copy(vehicle.currentPosition);
    const cycle = time % 24,
      perched = cycle >= 10 && cycle < 15;
    const roof = vehicle.currentPosition.clone().add(new T.Vector3(0, 0.75, 0));
    const swing = new T.Vector3(
      vehicle.spawn.x + Math.sin(time * 0.7) * 14,
      17 + Math.cos(time * 1.4) * 7,
      vehicle.spawn.z - 80 + Math.cos(time * 0.7) * 55,
    );
    const blend =
      cycle >= 9 && cycle < 10
        ? cycle - 9
        : cycle >= 15 && cycle < 16
          ? 16 - cycle
          : perched
            ? 1
            : 0;
    this.courier.group.position.lerpVectors(swing, roof, blend);
    this.courier.group.rotation.set(
      0,
      perched
        ? Math.atan2(
            Math.sin(vehicle.currentRotation.y * 2),
            Math.cos(vehicle.currentRotation.y * 2),
          )
        : time * 0.3,
      perched ? 0 : Math.sin(time * 0.7) * 0.5,
    );
    if (perched) this.courier.group.quaternion.copy(vehicle.currentRotation);
    this.courier.arms.forEach(
      (a, i) => (a.rotation.z = perched ? (i ? -0.4 : 0.4) : i ? -2.7 : 0.2),
    );
    this.web.visible = !perched;
    const arr = this.web.geometry.getAttribute('position');
    arr.setXYZ(
      0,
      this.courier.group.position.x,
      this.courier.group.position.y + 1.4,
      this.courier.group.position.z,
    );
    arr.setXYZ(1, vehicle.spawn.x - 30, 80, this.courier.group.position.z - 15);
    arr.needsUpdate = true;
    this.web.geometry.computeBoundingSphere();
    this.courierState.perched = perched;
    if (this.water) {
      const a = this.water.geometry.getAttribute('position');
      for (let i = 0; i < a.count; i++)
        a.setZ(
          i,
          Math.sin(a.getX(i) * 0.025 + time * 0.7) * 0.2 + Math.cos(a.getY(i) * 0.03 + time) * 0.17,
        );
      a.needsUpdate = true;
    }
    this.batch.update();
    const m = new T.Matrix4();
    this.life.debris.forEach((s, i) =>
      this.debris.setMatrixAt(
        i,
        s.life > 0
          ? m.compose(
              s.position,
              new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), time * 8),
              new T.Vector3(0.2, 0.2, 0.2),
            )
          : m.makeScale(0, 0, 0),
      ),
    );
    this.debris.instanceMatrix.needsUpdate = true;
  }
}
