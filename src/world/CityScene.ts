import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { City, Point } from './City';
import { buildingGeometry, createCityColliders } from './CityPhysics';

function facadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b5b1a8';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 256; y += 32)
    for (let x = 8; x < 128; x += 32) {
      ctx.fillStyle = (x * 7 + y * 13) % 5 < 2 ? '#73838a' : '#4c626e';
      ctx.fillRect(x, y, 20, 23);
      ctx.fillStyle = '#bbc3bf';
      ctx.fillRect(x, y + 11, 20, 1);
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.075, 0.075);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roadSegment(a: Point, b: Point, width: number, y: number): THREE.BufferGeometry {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const geometry = new THREE.PlaneGeometry(width, length + 0.3);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1]));
  geometry.translate((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
  return geometry;
}

function mergedMesh(
  parts: THREE.BufferGeometry[],
  material: THREE.Material,
  group: THREE.Group,
  shadows = false,
): THREE.Mesh | null {
  if (!parts.length) return null;
  const geometry = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!geometry) throw new Error('Unable to assemble district geometry');
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export class CityScene {
  readonly group = new THREE.Group();
  readonly collisionMeshes: THREE.Mesh[] = [];

  constructor(
    readonly data: City,
    world: RAPIER.World,
  ) {
    const { min, max } = data.bounds;
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x90958e, roughness: 0.97 });
    const ground = new THREE.Mesh(
      data.id === 'new-york-harbor'
        ? new THREE.PlaneGeometry(414, 850)
        : new THREE.PlaneGeometry(max[0] - min[0] + 100, max[1] - min[1] + 100),
      groundMaterial,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((min[0] + max[0]) / 2, -0.015, (min[1] + max[1]) / 2);
    if (data.id === 'new-york-harbor') {
      ground.position.set(-57, -0.015, -155);
      const shore = ground.clone();
      shore.geometry = new THREE.PlaneGeometry(110, 260);
      shore.position.set(500, -0.015, -155);
      this.group.add(shore);
    }
    ground.receiveShadow = true;
    this.group.add(ground);
    createCityColliders(data, world);

    const paving: THREE.BufferGeometry[] = [],
      asphalt: THREE.BufferGeometry[] = [],
      markings: THREE.BufferGeometry[] = [];
    data.roads.forEach((road) => {
      for (let i = 1; i < road.points.length; i++) {
        const a = road.points[i - 1],
          b = road.points[i];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.3) continue;
        paving.push(roadSegment(a, b, road.width + 4.8, 0.012));
        asphalt.push(roadSegment(a, b, road.width, 0.025));
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          distance = Math.hypot(dx, dz);
        // Keep markings back from segment endpoints to avoid painting over junctions.
        for (let d = 8; d < distance - 8; d += 12) {
          const p: Point = [a[0] + (dx * d) / distance, a[1] + (dz * d) / distance];
          const q: Point = [
            a[0] + (dx * Math.min(d + 4, distance - 8)) / distance,
            a[1] + (dz * Math.min(d + 4, distance - 8)) / distance,
          ];
          markings.push(roadSegment(p, q, 0.14, 0.038));
        }
      }
    });
    mergedMesh(
      paving,
      new THREE.MeshStandardMaterial({ color: 0xbbbab2, roughness: 0.97 }),
      this.group,
    );
    mergedMesh(
      asphalt,
      new THREE.MeshStandardMaterial({ color: 0x383f43, roughness: 0.92 }),
      this.group,
    );
    mergedMesh(
      markings,
      new THREE.MeshStandardMaterial({ color: 0xf1e9c7, roughness: 0.85 }),
      this.group,
    );

    const texture = facadeTexture();
    const palette = [0xb8b5ae, 0xaab4b7, 0x9a938a, 0xc6c1af, 0x829ba4, 0x9aabae];
    const materials = palette.map(
      (color) =>
        new THREE.MeshStandardMaterial({ color, map: texture, roughness: 0.78, metalness: 0.12 }),
    );
    const buckets = palette.map(() => [] as THREE.BufferGeometry[]);
    for (const building of data.buildings) {
      const simple = buildingGeometry(building);
      buckets[Math.abs(building.id) % palette.length].push(simple);
    }
    buckets.forEach((parts, i) => {
      const mesh = mergedMesh(parts, materials[i], this.group, true);
      if (mesh) this.collisionMeshes.push(mesh);
    });
    this.addStreetDetails();
  }

  private addStreetDetails(): void {
    const posts: THREE.Matrix4[] = [];
    const heads: THREE.Matrix4[] = [];
    const matrix = new THREE.Matrix4();
    this.data.roads.forEach((road, index) => {
      if (index % 2) return;
      const a = road.points[0],
        b = road.points.at(-1)!;
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz);
      if (len < 20) return;
      for (let d = 15; d < len; d += 55) {
        const x = a[0] + (dx * d) / len + (dz / len) * (road.width / 2 + 1.5);
        const z = a[1] + (dz * d) / len - (dx / len) * (road.width / 2 + 1.5);
        posts.push(matrix.makeTranslation(x, 3.5, z).clone());
        heads.push(matrix.makeTranslation(x, 7, z).clone());
      }
    });
    for (const [geometry, transforms] of [
      [new THREE.CylinderGeometry(0.06, 0.1, 7, 6), posts],
      [new THREE.BoxGeometry(0.4, 0.12, 1.4), heads],
    ] as const) {
      const lamps = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: 0x465156, metalness: 0.6, roughness: 0.5 }),
        transforms.length,
      );
      transforms.forEach((m, i) => lamps.setMatrixAt(i, m));
      this.group.add(lamps);
    }
  }
}
