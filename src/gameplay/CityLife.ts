import RAPIER from '@dimforge/rapier3d-compat';
import { Vector3 } from 'three';
import type { City } from '../world/City';
import type { Vehicle } from '../vehicle/Vehicle';
import { HeatClock, type IncidentKind, type ScoreStorage } from './HeatClock';
import { RoadNetwork, seededRandom } from './RoadNetwork';
import { CAFES } from '../world/HarborCity';

export interface Pedestrian {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  anchor: Vector3;
  role: string;
  phase: number;
  hit: boolean;
  diner: boolean;
  walkDirection: Vector3;
}
export interface CityProp {
  id: string;
  kind: 'cone' | 'hydrant' | 'bin' | 'glass';
  position: Vector3;
  collider: RAPIER.Collider;
  dead: boolean;
}
export interface RoadAgent {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  kind: 'civilian' | 'taxi' | 'patrol' | 'interceptor' | 'suv';
  active: boolean;
  from: number;
  to: number;
  progress: number;
  speed: number;
  route: number[];
  planAt: number;
  heading: number;
  direct?: boolean;
}
export interface CityEvent {
  type: 'incident' | 'dialogue';
  speaker: string;
  text: string;
}
export interface Debris {
  position: Vector3;
  velocity: Vector3;
  life: number;
  glass: boolean;
}
const dialogue: Record<string, string[]> = {
  LOCAL: [
    'Hey, is that thing street legal?',
    'Only in New York. Seriously.',
    'That sunset almost makes the rent worth it.',
  ],
  COMMUTER: [
    'If it flies, can it skip the bridge traffic?',
    'My train is delayed. Can I get a lift?',
  ],
  'PIZZA COUNTER': [
    'Two slices and a view. That is the special.',
    'Best slice in the city. I will defend that.',
  ],
  'COFFEE QUEUE': ['I asked for oat milk, not a rocket launch.'],
  VISITOR: ['Is this the way to Brooklyn?'],
  'DELIVERY RIDER': ['Bike lane! Watch the bike lane!'],
};
export class CityLife {
  readonly heat: HeatClock;
  readonly roads: RoadNetwork;
  readonly people: Pedestrian[] = [];
  readonly traffic: RoadAgent[] = [];
  readonly cops: RoadAgent[] = [];
  readonly props: CityProp[] = [];
  readonly debris: Debris[] = Array.from({ length: 90 }, () => ({
    position: new Vector3(),
    velocity: new Vector3(),
    life: 0,
    glass: false,
  }));
  readonly helicopter = {
    active: false,
    position: new Vector3(0, 150, 0),
    heading: 0,
    near: false,
  };
  readonly events: CityEvent[] = [];
  private registry = new Map<
    number,
    { kind: IncidentKind; id: string; person?: Pedestrian; prop?: CityProp }
  >();
  private random = seededRandom();
  private time = 0;
  private talkAt = 0;
  private spawnAt = 0;
  private eventQueue = new RAPIER.EventQueue(true);
  private beforeVelocity = new Vector3();
  private roles = Object.keys(dialogue);

  constructor(
    readonly city: City,
    readonly world: RAPIER.World,
    readonly vehicle: Vehicle,
    storage?: ScoreStorage,
  ) {
    this.heat = new HeatClock(storage);
    this.roads = new RoadNetwork(city);
    for (let i = 0; i < 96; i++) {
      const road = city.roads[i % city.roads.length],
        a = road.points[0],
        b = road.points.at(-1)!;
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz) || 1,
        t = 0.1 + this.random() * 0.8,
        side = i % 2 ? 1 : -1;
      const sidewalk = road.id === 'bridge' ? 8.8 : road.width / 2 + 2.5;
      const anchor = new Vector3(
        a[0] + dx * t + (-dz / length) * side * sidewalk,
        0,
        a[1] + dz * t + (dx / length) * side * sidewalk,
      );
      if (city.id === 'new-york-harbor' && i < 4) anchor.set(55, 0, 62 + i * 3);
      else if (city.id === 'new-york-harbor' && i < 18) {
        const cafe = CAFES[(i - 4) % 3];
        anchor.set(cafe.x + [-5, 0, 5][Math.floor((i - 4) / 3) % 3], 0, cafe.z + 9);
      }
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(anchor.x, 0.9, anchor.z),
      );
      const collider = world.createCollider(
        RAPIER.ColliderDesc.capsule(0.5, 0.25).setMass(65).setSensor(true),
        body,
      );
      const p: Pedestrian = {
        body,
        collider,
        anchor,
        role:
          city.id === 'new-york-harbor' && i < 4
            ? ['LOCAL', 'COMMUTER', 'VISITOR', 'LOCAL'][i]
            : city.id === 'new-york-harbor' && i < 18
              ? ['PIZZA COUNTER', 'COFFEE QUEUE', 'LOCAL'][(i - 4) % 3]
              : this.roles[i % this.roles.length],
        phase: this.random() * 6,
        hit: false,
        diner: i < 18,
        walkDirection: new Vector3(dx / length, 0, dz / length),
      };
      this.people.push(p);
      this.registry.set(collider.handle, { kind: 'pedestrian', id: `ped-${i}`, person: p });
    }
    for (let i = 0; i < 32; i++)
      this.traffic.push(this.makeAgent(i % 3 === 0 ? 'taxi' : 'civilian', i, true));
    // Two ordinary patrols share traffic duties; nine pooled pursuit units escalate separately.
    this.traffic[30].kind = this.traffic[31].kind = 'patrol';
    for (let i = 0; i < 9; i++)
      this.cops.push(
        this.makeAgent(['patrol', 'interceptor', 'suv'][i % 3] as RoadAgent['kind'], i, false),
      );
    for (let i = 0; i < 80; i++) {
      const road = city.roads[i % city.roads.length],
        a = road.points[0],
        b = road.points.at(-1)!,
        t = 0.08 + this.random() * 0.84;
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz) || 1,
        side = i % 2 ? 1 : -1;
      let x = a[0] + dx * t - (dz / len) * side * (road.width / 2 + 0.8),
        z = a[1] + dz * t + (dx / len) * side * (road.width / 2 + 0.8);
      if (city.id === 'new-york-harbor' && i === 0) {
        x = 42;
        z = 38;
      }
      const kind = (['cone', 'hydrant', 'bin', 'glass'] as const)[i % 4];
      const collider = world.createCollider(
        RAPIER.ColliderDesc.cuboid(
          kind === 'glass' ? 0.8 : 0.35,
          kind === 'glass' ? 1.4 : 0.5,
          kind === 'glass' ? 1.8 : 0.35,
        ).setTranslation(x, kind === 'glass' ? 1.4 : 0.5, z),
      );
      const prop: CityProp = {
        id: `prop-${i}`,
        kind,
        position: new Vector3(x, 0, z),
        collider,
        dead: false,
      };
      this.props.push(prop);
      this.registry.set(collider.handle, { kind, id: prop.id, prop });
    }
    this.reset();
  }

  private makeAgent(kind: RoadAgent['kind'], index: number, active: boolean): RoadAgent {
    const node = this.roads.nodes[(index * 7 + 3) % this.roads.nodes.length];
    const target = node.next[0] ?? node.id;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(node.x, 0.65, node.z),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(kind === 'suv' ? 1.15 : 0.95, 0.65, 2.1).setFriction(0.4),
      body,
    );
    const result: RoadAgent = {
      body,
      collider,
      kind,
      active,
      from: node.id,
      to: target,
      progress: 0.2,
      speed: kind === 'taxi' ? 11 : 8 + (index % 5),
      route: [],
      planAt: 0,
      heading: 0,
    };
    collider.setEnabled(active);
    this.registry.set(collider.handle, {
      kind: kind === 'civilian' || kind === 'taxi' ? 'traffic' : 'police',
      id: `${active ? 'traffic' : 'cop'}-${index}`,
    });
    return result;
  }
  beforeStep(dt: number): void {
    this.time += dt;
    this.events.length = 0;
    this.beforeVelocity.copy(this.vehicle.body.linvel());
    for (const p of this.people)
      if (!p.hit) {
        const offset = p.diner ? 0 : Math.sin(this.time * 0.12 + p.phase) * 12;
        p.body.setNextKinematicTranslation({
          x: p.anchor.x + p.walkDirection.x * offset,
          y: 0.9,
          z: p.anchor.z + p.walkDirection.z * offset,
        });
      }
    for (const agent of this.traffic) this.moveAgent(agent, dt, false);
    if (this.heat.chase && !this.heat.over) {
      let count = this.cops.filter((c) => c.active).length;
      if (count < this.heat.targetCops && this.time >= this.spawnAt) {
        const c = this.cops.find((c) => !c.active);
        if (c && this.spawnCop(c)) this.spawnAt = this.time + 1.2;
      }
      for (const c of this.cops) {
        if (c.active && count > this.heat.targetCops && this.distanceToPlayer(c) > 65) {
          c.active = false;
          c.collider.setEnabled(false);
          count--;
        }
        if (c.active) this.moveAgent(c, dt, true);
      }
    }
  }
  step(): void {
    this.world.step(this.eventQueue);
  }
  afterStep(dt: number): void {
    this.eventQueue.drainCollisionEvents((a, b, started) => {
      if (!started || this.heat.over) return;
      const ca = this.world.getCollider(a),
        cb = this.world.getCollider(b);
      const other =
        ca.parent()?.handle === this.vehicle.body.handle
          ? b
          : cb.parent()?.handle === this.vehicle.body.handle
            ? a
            : null;
      if (other === null) return;
      const object = this.registry.get(other);
      if (object && this.beforeVelocity.length() > 2.5) {
        if (object.prop?.dead || object.person?.hit) return;
        if (this.heat.incident(object.id, object.kind)) {
          if (object.prop) {
            object.prop.dead = true;
            object.prop.collider.setEnabled(false);
            this.burst(object.prop.position, object.kind === 'glass');
          }
          if (object.person) {
            const p = object.person;
            p.hit = true;
            p.collider.setSensor(false);
            p.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
            p.body.applyImpulse(
              { x: this.beforeVelocity.x * 50, y: 500, z: this.beforeVelocity.z * 50 },
              true,
            );
          }
          this.events.push({
            type: 'incident',
            speaker: 'DISPATCH',
            text: `${object.kind.toUpperCase()} COLLISION. All units respond.`,
          });
        }
      } else if (
        !object &&
        this.beforeVelocity.length() > 9 &&
        (this.world.getCollider(other).shape.type === RAPIER.ShapeType.TriMesh ||
          this.world.getCollider(other).translation().y > 0.1)
      ) {
        if (this.heat.incident(`building-${other}`, 'building'))
          this.events.push({
            type: 'incident',
            speaker: 'DISPATCH',
            text: 'BUILDING CRASH. All units respond.',
          });
      }
    });
    const cp = this.vehicle.currentPosition;
    let seen = false,
      nearbyCops = 0,
      nearest = Infinity;
    for (const c of [...this.traffic.filter((c) => c.kind === 'patrol'), ...this.cops])
      if (c.active) {
        const d = this.distanceToPlayer(c);
        nearest = Math.min(nearest, d);
        const visible = d < 100 && this.lineOfSight(c.body.translation(), cp);
        seen ||= visible;
        if (visible && d < 7 && cp.y < 3) nearbyCops++;
        if (c.kind === 'suv' && d < 3.5 && cp.y < 3) {
          const v = this.vehicle.body.linvel();
          const factor = this.vehicle.body.mass() * Math.min(0.1, dt * 2.2);
          this.vehicle.body.applyImpulse({ x: -v.x * factor, y: 0, z: -v.z * factor }, true);
        }
      }
    this.updateHelicopter(dt);
    if (this.helicopter.active && this.lineOfSight(this.helicopter.position, cp)) seen = true;
    this.heat.tick(dt, {
      speed: this.vehicle.speed,
      seen,
      nearbyCops,
      helicopterNear: this.helicopter.near,
    });
    for (const s of this.debris)
      if (s.life > 0) {
        s.life -= dt;
        s.velocity.y -= 22 * dt;
        s.position.addScaledVector(s.velocity, dt);
        if (s.position.y < 0) s.life = 0;
      }
    if (this.time - this.talkAt > 12) this.talk();
  }
  private moveAgent(agent: RoadAgent, dt: number, pursue: boolean): void {
    if (!agent.active) return;
    if (
      pursue &&
      this.distanceToPlayer(agent) < 45 &&
      this.lineOfSight(agent.body.translation(), this.vehicle.currentPosition) &&
      this.closePursuit(agent, dt)
    ) {
      agent.direct = true;
      return;
    }
    if (agent.direct) {
      this.reattach(agent);
      agent.direct = false;
      agent.planAt = 0;
    }
    if (pursue && this.time > agent.planAt) {
      const p = this.vehicle.currentPosition,
        v = this.vehicle.body.linvel(),
        lead = agent.kind === 'interceptor' ? 0.7 : 0.3;
      const goal = this.roads.nearest(p.x + v.x * lead, p.z + v.z * lead);
      agent.route = this.roads.route(agent.to, goal).slice(1);
      agent.planAt = this.time + 0.7;
    }
    const a = this.roads.nodes[agent.from],
      b = this.roads.nodes[agent.to];
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const desired = pursue
      ? (agent.kind === 'interceptor' ? 31 : agent.kind === 'suv' ? 22 : 25) *
        (1 + this.heat.level * 0.04)
      : agent.kind === 'taxi'
        ? 11
        : 9;
    const p = agent.body.translation();
    const blocked = [...this.traffic, ...this.cops].some(
      (other) =>
        other !== agent &&
        other.active &&
        Math.hypot(other.body.translation().x - p.x, other.body.translation().z - p.z) < 5 &&
        Math.sin(agent.heading) * (other.body.translation().x - p.x) +
          Math.cos(agent.heading) * (other.body.translation().z - p.z) >
          0,
    );
    agent.speed += ((blocked ? 0 : desired) - agent.speed) * Math.min(1, dt * 3);
    agent.progress += (agent.speed * dt) / length;
    if (agent.progress >= 1) {
      const next =
        agent.route.shift() ??
        b.next.filter((n) => n !== a.id)[
          Math.floor(this.random() * Math.max(1, b.next.filter((n) => n !== a.id).length))
        ] ??
        b.next[0];
      if (next === undefined) {
        agent.progress = 1;
        agent.speed = 0;
        return;
      }
      agent.from = b.id;
      agent.to = next;
      agent.progress = 0;
    }
    const start = this.roads.nodes[agent.from],
      end = this.roads.nodes[agent.to],
      dx = end.x - start.x,
      dz = end.z - start.z,
      len = Math.hypot(dx, dz) || 1;
    agent.heading = Math.atan2(dx, dz);
    const pos = {
      x: start.x + dx * agent.progress - (dz / len) * 3.2,
      y: 0.65,
      z: start.z + dz * agent.progress + (dx / len) * 3.2,
    };
    agent.body.setNextKinematicTranslation(pos);
    agent.body.setNextKinematicRotation({
      x: 0,
      y: Math.sin(agent.heading / 2),
      z: 0,
      w: Math.cos(agent.heading / 2),
    });
  }
  private closestRoad(
    x: number,
    z: number,
  ): { from: number; to: number; t: number; distance: number } {
    let best = { from: 0, to: this.roads.nodes[0].next[0] ?? 0, t: 0, distance: Infinity };
    for (const a of this.roads.nodes)
      for (const id of a.next) {
        const b = this.roads.nodes[id],
          dx = b.x - a.x,
          dz = b.z - a.z,
          t = Math.max(
            0,
            Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)),
          ),
          distance = Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
        if (distance < best.distance) best = { from: a.id, to: id, t, distance };
      }
    return best;
  }
  private reattach(agent: RoadAgent): void {
    const p = agent.body.translation(),
      r = this.closestRoad(p.x, p.z);
    agent.from = r.from;
    agent.to = r.to;
    agent.progress = r.t;
    agent.route = [];
  }
  private closePursuit(agent: RoadAgent, dt: number): boolean {
    const p = agent.body.translation(),
      target = this.vehicle.currentPosition,
      dx = target.x - p.x,
      dz = target.z - p.z,
      distance = Math.hypot(dx, dz);
    const desired = Math.atan2(dx, dz),
      delta = Math.atan2(Math.sin(desired - agent.heading), Math.cos(desired - agent.heading));
    const turn = (agent.kind === 'interceptor' ? 2.8 : agent.kind === 'suv' ? 1.7 : 2.2) * dt;
    agent.heading += Math.max(-turn, Math.min(turn, delta));
    const speed =
      distance < 5
        ? Math.max(0, this.vehicle.speed)
        : Math.min(agent.kind === 'interceptor' ? 31 : 25, Math.max(4, distance * 1.5));
    agent.speed += (speed - agent.speed) * Math.min(1, dt * 4);
    const move = {
      x: Math.sin(agent.heading) * agent.speed * dt,
      y: 0,
      z: Math.cos(agent.heading) * agent.speed * dt,
    };
    if (this.closestRoad(p.x + move.x, p.z + move.z).distance > 10) return false;
    const rotation = { x: 0, y: Math.sin(agent.heading / 2), z: 0, w: Math.cos(agent.heading / 2) };
    const hit = this.world.castShape(
      { x: p.x, y: 0.8, z: p.z },
      rotation,
      move,
      new RAPIER.Cuboid(1, 0.45, 2.1),
      0,
      1,
      true,
      RAPIER.QueryFilterFlags.ONLY_FIXED,
    );
    const fraction = hit ? Math.max(0, hit.time_of_impact - 0.02) : 1;
    agent.body.setNextKinematicTranslation({
      x: p.x + move.x * fraction,
      y: 0.65,
      z: p.z + move.z * fraction,
    });
    agent.body.setNextKinematicRotation(rotation);
    return true;
  }
  private distanceToPlayer(agent: RoadAgent): number {
    const p = agent.body.translation(),
      v = this.vehicle.currentPosition;
    return Math.hypot(p.x - v.x, p.z - v.z);
  }
  private spawnCop(agent: RoadAgent): boolean {
    const choices = this.roads.nodes.filter((n) => {
      const d = Math.hypot(
        n.x - this.vehicle.currentPosition.x,
        n.z - this.vehicle.currentPosition.z,
      );
      return n.next.length && d > 75 && d < 160;
    });
    if (!choices.length) return false;
    const n = choices[Math.floor(this.random() * choices.length)];
    if (
      [...this.cops, ...this.traffic].some(
        (c) =>
          c.active && Math.hypot(c.body.translation().x - n.x, c.body.translation().z - n.z) < 7,
      )
    )
      return false;
    agent.from = n.id;
    agent.to = n.next[0];
    agent.progress = 0;
    agent.route = [];
    agent.speed = 8;
    agent.planAt = 0;
    agent.body.setTranslation({ x: n.x, y: 0.65, z: n.z }, true);
    agent.collider.setEnabled(true);
    agent.active = true;
    return true;
  }
  private lineOfSight(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
  ): boolean {
    const origin = { x: from.x, y: from.y + 1.5, z: from.z };
    const dx = to.x - origin.x,
      dy = to.y + 0.5 - origin.y,
      dz = to.z - origin.z;
    // Visibility is blocked by fixed geometry, not by a unit's own collider.
    const hit = this.world.castRay(
      new RAPIER.Ray(origin, { x: dx, y: dy, z: dz }),
      1,
      true,
      RAPIER.QueryFilterFlags.ONLY_FIXED | RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    return !hit || hit.timeOfImpact >= 0.98;
  }
  private updateHelicopter(dt: number): void {
    this.helicopter.active = this.heat.level >= 4 && this.heat.chase && !this.heat.over;
    if (!this.helicopter.active) {
      this.helicopter.near = false;
      return;
    }
    const p = this.vehicle.currentPosition,
      h = this.helicopter.position;
    const x = p.x + Math.sin(this.time * 0.4) * 12,
      z = p.z + Math.cos(this.time * 0.4) * 12;
    const roof = this.world.castRay(
      new RAPIER.Ray({ x, y: 500, z }, { x: 0, y: -1, z: 0 }),
      500,
      true,
      RAPIER.QueryFilterFlags.ONLY_FIXED,
    );
    const height = Math.max(28, 500 - (roof?.timeOfImpact ?? 500) + 24);
    h.lerp(new Vector3(x, height, z), 1 - Math.exp(-dt * 0.9));
    this.helicopter.heading = Math.atan2(p.x - h.x, p.z - h.z);
    this.helicopter.near = Math.hypot(h.x - p.x, h.z - p.z) < 14 && this.lineOfSight(h, p);
  }
  talk(): void {
    this.talkAt = this.time;
    const cp = this.vehicle.currentPosition;
    const nearest = this.people
      .filter((p) => !p.hit)
      .sort(
        (a, b) =>
          new Vector3().copy(a.body.translation()).distanceToSquared(cp) -
          new Vector3().copy(b.body.translation()).distanceToSquared(cp),
      )[0];
    if (nearest && new Vector3().copy(nearest.body.translation()).distanceTo(cp) < 30) {
      const lines = dialogue[nearest.role];
      this.events.push({
        type: 'dialogue',
        speaker: nearest.role,
        text: lines[Math.floor(this.random() * lines.length)],
      });
    } else
      this.events.push({
        type: 'dialogue',
        speaker: 'CITY',
        text: 'Get closer to a sidewalk or cafe to hear people.',
      });
  }
  private burst(position: Vector3, glass: boolean): void {
    let count = 0;
    for (const s of this.debris)
      if (s.life <= 0 && count++ < (glass ? 28 : 12)) {
        s.position.copy(position).y = 1.3;
        s.velocity.set((this.random() - 0.5) * 9, 3 + this.random() * 6, (this.random() - 0.5) * 9);
        s.life = 1.6;
        s.glass = glass;
      }
  }
  reset(): void {
    this.heat.reset();
    this.random = seededRandom();
    this.eventQueue.drainCollisionEvents(() => {});
    this.time = this.talkAt = this.spawnAt = 0;
    this.events.length = 0;
    for (const p of this.people) {
      p.hit = false;
      p.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
      p.collider.setSensor(true);
      p.body.setTranslation({ x: p.anchor.x, y: 0.9, z: p.anchor.z }, true);
      p.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      p.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    for (const p of this.props) {
      p.dead = false;
      p.collider.setEnabled(true);
    }
    for (const c of this.cops) {
      c.active = false;
      c.direct = false;
      c.route = [];
      c.planAt = 0;
      c.collider.setEnabled(false);
    }
    this.traffic.forEach((c, i) => {
      const n = this.roads.nodes[(i * 7 + 3) % this.roads.nodes.length];
      c.from = n.id;
      c.to = n.next[0] ?? n.id;
      c.progress = 0.2;
      c.speed = 8;
      c.active = true;
      const next = this.roads.nodes[c.to],
        dx = next.x - n.x,
        dz = next.z - n.z,
        len = Math.hypot(dx, dz) || 1;
      c.heading = Math.atan2(dx, dz);
      c.body.setTranslation(
        {
          x: n.x + dx * c.progress - (dz / len) * 3.2,
          y: 0.65,
          z: n.z + dz * c.progress + (dx / len) * 3.2,
        },
        true,
      );
      c.body.setRotation(
        { x: 0, y: Math.sin(c.heading / 2), z: 0, w: Math.cos(c.heading / 2) },
        true,
      );
      c.collider.setEnabled(true);
      c.direct = false;
      c.route = [];
      c.planAt = 0;
      if (this.city.id === 'new-york-harbor' && i >= 24 && i < 30) {
        const x = 170 + (i - 24) * 44,
          r = this.closestRoad(x, -154),
          dir = i % 2 === 0 ? 1 : -1;
        c.from = dir > 0 ? r.from : r.to;
        c.to = dir > 0 ? r.to : r.from;
        c.progress = dir > 0 ? r.t : 1 - r.t;
        c.heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        c.body.setTranslation({ x, y: 0.65, z: -154 + (dir > 0 ? 3.2 : -3.2) }, true);
        c.body.setRotation(
          { x: 0, y: Math.sin(c.heading / 2), z: 0, w: Math.cos(c.heading / 2) },
          true,
        );
      }
    });
    this.helicopter.active = this.helicopter.near = false;
    this.helicopter.position.set(this.vehicle.spawn.x + 60, 140, this.vehicle.spawn.z + 60);
    this.debris.forEach((s) => (s.life = 0));
    this.world.propagateModifiedBodyPositionsToColliders();
  }
  snapshot() {
    return {
      heat: this.heat.snapshot(),
      pedestrians: this.people.length,
      traffic: this.traffic.length,
      activeCops: this.cops.filter((c) => c.active).length,
      helicopter: this.helicopter.active,
      props: this.props.length,
      brokenProps: this.props.filter((p) => p.dead).length,
      peopleHit: this.people.filter((p) => p.hit).length,
      debris: this.debris.filter((s) => s.life > 0).length,
    };
  }
  dispose(): void {
    this.eventQueue.free();
  }
}
