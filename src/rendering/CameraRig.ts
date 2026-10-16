import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { Vehicle } from '../vehicle/Vehicle';

export class CameraRig {
  private mode = 0;
  private initialized = false;
  private direction = new THREE.Vector3();
  private target = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private rayDirection = new THREE.Vector3();
  private overviewCentre: THREE.Vector3 | null = null;
  private overviewDistance = 300;
  constructor(readonly camera: THREE.PerspectiveCamera) {}
  setOverviewBounds(min: [number, number], max: [number, number]): void {
    this.overviewCentre = new THREE.Vector3((min[0] + max[0]) / 2, 0, (min[1] + max[1]) / 2);
    this.overviewDistance = Math.max(max[0] - min[0], max[1] - min[1]) * 0.8;
    this.camera.far = Math.max(1800, this.overviewDistance * 3);
  }
  cycle(): void {
    this.mode = (this.mode + 1) % 3;
  }
  get modeName(): string {
    return ['chase', 'close', 'overview'][this.mode];
  }
  reset(toDefault = false): void {
    if (toDefault) this.mode = 0;
    this.initialized = false;
  }

  update(
    position: THREE.Vector3,
    rotation: THREE.Quaternion,
    vehicle: Vehicle,
    dt: number,
    showcase: boolean,
    reducedMotion: boolean,
  ): void {
    this.direction.set(0, 0, 1).applyQuaternion(rotation);
    this.direction.y = 0;
    this.direction.normalize();
    if (showcase) {
      this.desired.set(8, 4.1, 9).applyQuaternion(rotation).add(position);
      this.target.copy(position).add(new THREE.Vector3(0, 0.25, 0));
    } else {
      const close = this.mode === 1;
      const distance = close ? 6.2 : 10.5;
      this.desired
        .copy(position)
        .addScaledVector(this.direction, -distance)
        .add(new THREE.Vector3(0, close ? 2.5 : 4.2, 0));
      this.target
        .copy(position)
        .addScaledVector(this.direction, close ? 4 : 7)
        .add(new THREE.Vector3(0, 1, 0));
      const origin = position.clone().add(new THREE.Vector3(0, 0.7, 0));
      this.rayDirection.subVectors(this.desired, origin);
      const length = this.rayDirection.length();
      this.rayDirection.normalize();
      const hit = vehicle.world.castRay(
        new RAPIER.Ray(origin, this.rayDirection),
        length,
        true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined,
        vehicle.body,
      );
      if (hit && hit.timeOfImpact < length)
        this.desired
          .copy(origin)
          .addScaledVector(this.rayDirection, Math.max(0.5, hit.timeOfImpact - 0.5));
      if (this.mode === 2) {
        const centre = this.overviewCentre ?? position,
          d = this.overviewDistance;
        this.desired.copy(centre).add(new THREE.Vector3(d * 0.45, d * 0.65, d * 0.65));
        this.target.copy(centre);
      }
    }
    if (!this.initialized) {
      this.camera.position.copy(this.desired);
      this.initialized = true;
    } else this.camera.position.lerp(this.desired, 1 - Math.exp(-dt * (showcase ? 2 : 7)));
    this.camera.lookAt(this.target);
    const fov = 52 + (!reducedMotion && !showcase ? Math.min(9, vehicle.speed * 0.12) : 0);
    this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 5);
    this.camera.updateProjectionMatrix();
  }
}
