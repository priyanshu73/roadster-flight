import RAPIER from '@dimforge/rapier3d-compat';
import { ExtrudeGeometry, Shape, Path, Vector2, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Building, City } from './City';
import { CAFES } from './HarborCity';

/** Shared by rendering, runtime collision and the renderer-free test engine. */
export function buildingGeometry(building: Building): BufferGeometry {
  const shape = new Shape(building.polygon.map(([x, z]) => new Vector2(x, -z)));
  for (const hole of building.holes)
    shape.holes.push(new Path(hole.map(([x, z]) => new Vector2(x, -z))));
  const geometry = new ExtrudeGeometry(shape, {
    depth: building.height,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.clearGroups();
  return geometry;
}

export function createCityColliders(data: City, world: RAPIER.World): void {
  const { min, max } = data.bounds;
  const cx = (min[0] + max[0]) / 2,
    cz = (min[1] + max[1]) / 2;
  if (data.id === 'new-york-harbor') {
    for (const cafe of CAFES)
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(8.5, 2, 0.5).setTranslation(cafe.x, 2, cafe.z - 1),
      );
    for (const [x, z, hx, hz] of [
      [-57, -155, 207, 425],
      [500, -155, 55, 130],
      [300, -154, 155, 11],
    ])
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, 0.5, hz).setTranslation(x, -0.5, z).setFriction(1),
      );
    for (const z of [-165, -143])
      world.createCollider(RAPIER.ColliderDesc.cuboid(155, 1, 0.2).setTranslation(300, 1, z));
  } else
    world.createCollider(
      RAPIER.ColliderDesc.cuboid((max[0] - min[0]) / 2 + 50, 0.5, (max[1] - min[1]) / 2 + 50)
        .setTranslation(cx, -0.5, cz)
        .setFriction(1),
    );
  const chunks = new Map<string, BufferGeometry[]>();
  for (const building of data.buildings) {
    const [x, z] = building.polygon[0];
    const key = `${Math.floor(x / 250)},${Math.floor(z / 250)}`;
    const parts = chunks.get(key) ?? [];
    parts.push(buildingGeometry(building));
    chunks.set(key, parts);
  }
  for (const parts of chunks.values()) {
    const geometry = mergeGeometries(parts, false)!;
    const positions = geometry.getAttribute('position').array as Float32Array;
    const indices = Uint32Array.from({ length: positions.length / 3 }, (_, i) => i);
    world.createCollider(
      RAPIER.ColliderDesc.trimesh(new Float32Array(positions), indices).setFriction(0.6),
    );
    geometry.dispose();
    parts.forEach((p) => p.dispose());
  }
  for (const x of [min[0], max[0]])
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.5, 30, (max[1] - min[1]) / 2).setTranslation(x, 29, cz),
    );
  for (const z of [min[1], max[1]])
    world.createCollider(
      RAPIER.ColliderDesc.cuboid((max[0] - min[0]) / 2, 30, 0.5).setTranslation(cx, 29, z),
    );
}
