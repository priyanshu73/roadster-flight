import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Actions } from '../core/Input';
import type { City } from '../world/City';
import { CityScene } from '../world/CityScene';
import { Vehicle } from '../vehicle/Vehicle';
import { CarModel } from '../rendering/CarModel';
import { CameraRig } from '../rendering/CameraRig';
import { CityLife } from '../gameplay/CityLife';
import { LivingScene } from '../rendering/LivingScene';
import { CityAudio } from '../audio/CityAudio';

export class GameSession {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(52, 1, 0.15, 1800);
  readonly world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly vehicle: Vehicle;
  readonly city: CityScene;
  readonly car = new CarModel();
  readonly life: CityLife;
  readonly living: LivingScene;
  readonly audio = new CityAudio();
  dialogue = {
    speaker: 'HARBOR RADIO',
    text: 'Welcome to the neighborhood. E to talk, H to honk, C for the skyline.',
    until: 6,
  };
  readonly cameraRig = new CameraRig(this.camera);
  private sun = new THREE.DirectionalLight(0xffedcf, 3.2);
  private debugMesh: THREE.LineSegments;
  private lastInput: Actions | null = null;
  elapsed = 0;
  distance = 0;
  notice = '';
  debug = false;

  constructor(
    readonly data: City,
    environment: THREE.Texture,
  ) {
    this.world.timestep = 1 / 60;
    this.world.integrationParameters.maxCcdSubsteps = 3;
    this.cameraRig.setOverviewBounds(data.bounds.min, data.bounds.max);
    this.scene.background = new THREE.Color(0xb6cbd3);
    this.scene.fog = new THREE.FogExp2(0xb6cbd3, 0.00155);
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.65;
    this.scene.add(new THREE.HemisphereLight(0xcbdce4, 0x918471, 2));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -65,
      right: 65,
      top: 65,
      bottom: -65,
      near: 1,
      far: 340,
    });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);
    this.city = new CityScene(data, this.world);
    this.scene.add(this.city.group);
    this.vehicle = new Vehicle(
      this.world,
      new THREE.Vector3(...data.spawn.position),
      data.spawn.headingRadians,
    );
    this.scene.add(this.car.group);
    this.debugMesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }),
    );
    this.debugMesh.frustumCulled = false;
    this.debugMesh.renderOrder = 10;
    this.scene.add(this.debugMesh);
    for (let i = 0; i < 90; i++) {
      this.vehicle.beforeStep(1 / 60, {
        forward: false,
        backward: false,
        left: false,
        right: false,
        boost: false,
        hop: false,
        reset: false,
        camera: false,
      });
      this.world.step();
      this.vehicle.afterStep();
    }
    this.vehicle.previousPosition.copy(this.vehicle.currentPosition);
    this.vehicle.previousRotation.copy(this.vehicle.currentRotation);
    let storage: Storage | undefined;
    try {
      storage = localStorage;
    } catch {}
    this.life = new CityLife(data, this.world, this.vehicle, storage);
    this.living = new LivingScene(this.life);
    this.scene.add(this.living.group);
  }

  tick(dt: number, input: Actions): void {
    if (input.reset) {
      this.restart();
      return;
    }
    if (this.life.heat.over) return;
    this.lastInput = input;
    if (input.camera) this.cameraRig.cycle();
    this.vehicle.beforeStep(dt, input);
    this.life.beforeStep(dt);
    this.life.step();
    this.vehicle.afterStep();
    this.life.afterStep(dt);
    if (input.talk) this.life.talk();
    if (input.horn) this.audio.horn();
    if (input.mute) this.audio.mute();
    for (const event of this.life.events) {
      this.dialogue = { speaker: event.speaker, text: event.text, until: this.elapsed + 6 };
      if (event.type === 'incident') this.audio.tone(140, 0.15, 0.15);
      else this.audio.speak(event.text);
    }
    this.elapsed += dt;
    this.distance += this.vehicle.speed * dt;
    const p = this.vehicle.currentPosition,
      { min, max } = this.data.bounds;
    const margin = Math.min(p.x - min[0], max[0] - p.x, p.z - min[1], max[1] - p.z);
    this.notice =
      this.life.heat.notice ||
      this.vehicle.message ||
      (margin < 45 ? 'District edge · turn back or press R' : '');
    if (margin < 2 || p.y < -10 || p.y > 150) {
      this.vehicle.reset(true);
      this.cameraRig.reset();
      this.notice = `Returned to ${this.data.spawn.street}`;
    }
  }

  render(alpha: number, dt: number, showcase: boolean, reducedMotion: boolean): void {
    this.car.update(this.vehicle, alpha, this.lastInput?.backward ?? false, this.elapsed);
    const wasPerched = this.living.courierState.perched;
    this.living.update(this.elapsed, this.vehicle);
    if (this.living.courierState.perched && !wasPerched && !showcase) {
      this.dialogue = {
        speaker: 'WEB COURIER',
        text: 'Mind if I ride for a block? My arms are killing me.',
        until: this.elapsed + 5,
      };
      this.audio.speak(this.dialogue.text);
    }
    this.audio.update(
      this.vehicle.speed,
      this.vehicle.boosting,
      this.life.heat.chase && !this.life.heat.over ? this.life.heat.level : 0,
      this.life.helicopter.active,
      this.elapsed,
    );
    this.cameraRig.update(
      this.car.group.position,
      this.car.group.quaternion,
      this.vehicle,
      dt,
      showcase,
      reducedMotion,
    );
    const p = this.car.group.position;
    this.sun.position.set(p.x + 70, 150, p.z + 80);
    this.sun.target.position.copy(p);
    this.debugMesh.visible = this.debug;
    if (this.debug) {
      const { vertices, colors } = this.world.debugRender();
      this.debugMesh.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      this.debugMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    }
  }

  snapshot() {
    return {
      ...this.vehicle.telemetry(),
      input: this.lastInput,
      elapsed: this.elapsed,
      distance: this.distance,
      bodies: this.world.bodies.len(),
      colliders: this.world.colliders.len(),
      roads: this.data.roads.length,
      buildings: this.data.buildings.length,
      district: this.data.id,
      cameraMode: this.cameraRig.modeName,
      ...this.life.snapshot(),
      perched: this.living.courierState.perched,
      audio: this.audio.snapshot(),
      dialogue: this.dialogue,
    };
  }

  restart(): void {
    this.vehicle.reset(true);
    this.vehicle.pressure.reset();
    this.life.reset();
    this.elapsed = this.distance = 0;
    this.lastInput = null;
    this.cameraRig.reset(true);
    this.dialogue = {
      speaker: 'HARBOR RADIO',
      text: 'Free roam. A crash starts the Heat Clock. E to talk, H to honk.',
      until: 6,
    };
    this.audio.pause(true);
    this.audio.start();
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Sprite
      ) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(material);
          if ('map' in material && material.map instanceof THREE.Texture)
            textures.add(material.map);
        }
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    this.audio.dispose();
    this.life.dispose();
    this.sun.shadow.dispose();
    this.world.free();
    this.scene.clear();
  }
}
