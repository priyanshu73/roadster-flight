import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Actions } from '../core/Input';
import type { City } from '../world/City';
import { CityScene } from '../world/CityScene';
import { Vehicle } from '../vehicle/Vehicle';
import { CarModel } from '../rendering/CarModel';
import { CameraRig } from '../rendering/CameraRig';

export class GameSession {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(52, 1, 0.15, 1800);
  readonly world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  readonly vehicle: Vehicle;
  readonly city: CityScene;
  readonly car = new CarModel();
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
  }

  tick(dt: number, input: Actions): void {
    this.lastInput = input;
    if (input.camera) this.cameraRig.cycle();
    this.vehicle.beforeStep(dt, input);
    if (input.reset) this.cameraRig.reset();
    this.world.step();
    this.vehicle.afterStep();
    this.elapsed += dt;
    this.distance += this.vehicle.speed * dt;
    const p = this.vehicle.currentPosition,
      { min, max } = this.data.bounds;
    const margin = Math.min(p.x - min[0], max[0] - p.x, p.z - min[1], max[1] - p.z);
    this.notice =
      this.vehicle.message || (margin < 45 ? 'District edge · turn back or press R' : '');
    if (margin < 2 || p.y < -10 || p.y > 150) {
      this.vehicle.reset(true);
      this.cameraRig.reset();
      this.notice = 'Returned to 6th Avenue';
    }
  }

  render(alpha: number, dt: number, showcase: boolean, reducedMotion: boolean): void {
    this.car.update(this.vehicle, alpha, this.lastInput?.backward ?? false);
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
    };
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
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
    this.sun.shadow.dispose();
    this.world.free();
    this.scene.clear();
  }
}
