import * as THREE from 'three';
import { WHEELS, type Vehicle } from '../vehicle/Vehicle';
import { buildRear } from './RearModel';

/** Original procedural development model. Replace with the licensed reveal model. */
export class CarModel {
  readonly group = new THREE.Group();
  readonly wheels: THREE.Group[] = [];
  private rear: THREE.Group;

  constructor(color = 0xb9c2c8) {
    const paint = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.72,
      roughness: 0.24,
      clearcoat: 1,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x101619,
      roughness: 0.5,
      metalness: 0.45,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x101f27,
      metalness: 0.65,
      roughness: 0.13,
      clearcoat: 1,
    });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x121416, roughness: 0.9 });
    const rim = new THREE.MeshStandardMaterial({
      color: 0x707b82,
      metalness: 0.9,
      roughness: 0.25,
    });
    const light = new THREE.MeshStandardMaterial({
      color: 0xe3f7ff,
      emissive: 0xc8eaff,
      emissiveIntensity: 2.2,
    });
    const mesh = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(x, y, z);
      part.castShadow = true;
      part.receiveShadow = true;
      this.group.add(part);
      return part;
    };
    // A shaped sports-car body, with narrower nose and tapering shoulders.
    const sections = [
      { z: -2.15, w: 0.83, bottom: -0.22, top: 0.22 },
      { z: -1.4, w: 0.99, bottom: -0.24, top: 0.35 },
      { z: -0.3, w: 0.96, bottom: -0.24, top: 0.25 },
      { z: 1.35, w: 0.95, bottom: -0.22, top: 0.2 },
      { z: 2.2, w: 0.8, bottom: -0.17, top: 0.04 },
    ];
    const vertices: number[] = [],
      indices: number[] = [];
    sections.forEach((s) =>
      vertices.push(-s.w, s.bottom, s.z, s.w, s.bottom, s.z, s.w, s.top, s.z, -s.w, s.top, s.z),
    );
    for (let j = 0; j < sections.length - 1; j++)
      for (let k = 0; k < 4; k++) {
        const a = j * 4 + k,
          b = j * 4 + ((k + 1) % 4),
          c = b + 4,
          d = a + 4;
        indices.push(a, b, d, b, c, d);
      }
    indices.push(0, 3, 1, 1, 3, 2, 16, 17, 19, 17, 18, 19);
    const body = new THREE.BufferGeometry();
    body.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    body.setIndex(indices);
    body.computeVertexNormals();
    mesh(body, paint, 0, 0, 0);

    // Sloping canopy: rear deck -> roof -> windscreen -> bonnet.
    const canopy = new THREE.BufferGeometry();
    canopy.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          -0.76, 0.26, -1.12, 0.76, 0.26, -1.12, -0.62, 0.76, -0.62, 0.62, 0.76, -0.62, -0.58, 0.72,
          0.12, 0.58, 0.72, 0.12, -0.76, 0.22, 0.94, 0.76, 0.22, 0.94,
        ],
        3,
      ),
    );
    canopy.setIndex([
      0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 4, 6, 5, 5, 6, 7, 0, 6, 2, 2, 6, 4, 1, 3, 7, 3, 5, 7,
    ]);
    canopy.computeVertexNormals();
    mesh(canopy, glass, 0, 0, 0);
    mesh(new THREE.BoxGeometry(1.21, 0.045, 0.76), dark, 0, 0.75, -0.25);
    mesh(new THREE.BoxGeometry(1.68, 0.08, 0.13), dark, 0, -0.14, 2.17);

    for (const side of [-1, 1]) {
      const lamp = mesh(new THREE.BoxGeometry(0.5, 0.035, 0.075), light, side * 0.56, 0.1, 2.12);
      lamp.rotation.z = side * -0.08;
      mesh(new THREE.BoxGeometry(0.12, 0.1, 0.26), dark, side * 0.92, 0.36, 0.32);
      mesh(new THREE.BoxGeometry(0.06, 0.14, 2.7), dark, side * 0.97, -0.19, 0);
      for (const z of [-1.32, 1.34]) {
        const wing = mesh(
          new THREE.SphereGeometry(0.52, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
          paint,
          side * 0.72,
          0.05,
          z,
        );
        wing.scale.set(0.52, 0.55, 1.15);
      }
    }
    this.rear = buildRear();
    this.rear.scale.setScalar(0.45);
    this.rear.rotation.y = Math.PI;
    this.rear.position.set(0, -0.25, -1.93);
    this.group.add(this.rear);
    WHEELS.forEach((point) => {
      const pivot = new THREE.Group();
      pivot.position.set(point.x, -0.27, point.z);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 24), rubber);
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      pivot.add(tyre);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.265, 16), rim);
      disc.rotation.z = Math.PI / 2;
      pivot.add(disc);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.272, 6), dark);
      hub.rotation.z = Math.PI / 2;
      pivot.add(hub);
      this.group.add(pivot);
      this.wheels.push(pivot);
    });
  }

  update(vehicle: Vehicle, alpha: number, braking: boolean, time = 0): void {
    this.group.position.lerpVectors(vehicle.previousPosition, vehicle.currentPosition, alpha);
    this.group.quaternion.slerpQuaternions(
      vehicle.previousRotation,
      vehicle.currentRotation,
      alpha,
    );
    this.wheels.forEach((wheel, i) => {
      wheel.position.y = WHEELS[i].y - (vehicle.controller.wheelSuspensionLength(i) ?? 0.32);
      wheel.rotation.set(
        vehicle.controller.wheelRotation(i) ?? 0,
        vehicle.controller.wheelSteering(i) ?? 0,
        0,
        'YXZ',
      );
    });
    this.rear.userData.update(
      time,
      vehicle.boosting || vehicle.hopping || (!vehicle.grounded && vehicle.body.linvel().y > 1),
      braking,
    );
  }
}
