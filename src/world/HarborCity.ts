import type { City, Building, Road } from './City';

export const HARBOR_XS = [-210, -126, -42, 42];
export const HARBOR_ZS = [-490, -406, -322, -238, -154, -70, 14, 98, 182];
export const CAFES = [
  { x: 60, z: 68, name: 'CORNER SLICE', color: 0xb46143 },
  { x: -24, z: -16, name: 'HARBOR COFFEE', color: 0x39786e },
  { x: -108, z: -100, name: 'NOODLE HOUSE', color: 0xb37a4f },
];
export function createHarborCity(): City {
  const roads: Road[] = [],
    buildings: Building[] = [];
  for (const [i, x] of HARBOR_XS.entries())
    roads.push({
      id: `avenue-${i}`,
      sourceWay: -i - 1,
      name: `Harbor Avenue ${i + 1}`,
      width: 23,
      estimatedWidth: false,
      oneway: false,
      level: 0,
      points: HARBOR_ZS.map((z) => [x, z]),
    });
  for (const [i, z] of HARBOR_ZS.entries())
    roads.push({
      id: `street-${i}`,
      sourceWay: -i - 20,
      name: `Harbor Street ${i + 1}`,
      width: 22,
      estimatedWidth: false,
      oneway: false,
      level: 0,
      points: [...HARBOR_XS.map((x) => [x, z] as [number, number]), [130, z]],
    });
  roads.push({
    id: 'bridge',
    sourceWay: -100,
    name: 'Brooklyn-inspired Harbor Crossing',
    width: 22,
    estimatedWidth: false,
    oneway: false,
    level: 0,
    points: [
      [130, -154],
      [210, -154],
      [380, -154],
      [455, -154],
      [510, -154],
    ],
  });
  for (let ix = 0; ix < 4; ix++)
    for (let iz = 0; iz < 8; iz++)
      for (const side of [-1, 1]) {
        const x = -168 + ix * 84 + side * 15,
          z = -448 + iz * 84 + side * 9,
          w = 22 + ((ix + iz) % 4),
          d = 32 + ((ix * 3 + iz) % 8);
        const height = 18 + ((ix * 47 + iz * 31 + (side + 1) * 17) % 90);
        buildings.push({
          id: -(ix * 100 + iz * 2 + (side + 1) / 2 + 1),
          name: 'Harbor block',
          height,
          estimatedHeight: false,
          holes: [],
          polygon: [
            [x - w / 2, z - d / 2],
            [x + w / 2, z - d / 2],
            [x + w / 2, z + d / 2],
            [x - w / 2, z + d / 2],
          ],
        });
      }
  for (let i = 0; i < 8; i++) {
    const x = 475 + (i % 3) * 25,
      z = -260 + Math.floor(i / 3) * 70;
    buildings.push({
      id: -1000 - i,
      name: 'Opposite shore',
      height: 18 + i * 3,
      estimatedHeight: false,
      holes: [],
      polygon: [
        [x - 8, z - 12],
        [x + 8, z - 12],
        [x + 8, z + 12],
        [x - 8, z + 12],
      ],
    });
  }
  return {
    schemaVersion: 1,
    id: 'new-york-harbor',
    name: 'New York',
    district: 'Harbor District · fictional NYC-inspired slice',
    origin: { latitude: 40.7549, longitude: -73.984, altitudeMeters: 0 },
    drivingSide: 'right',
    bounds: { min: [-264, -580], max: [555, 280] },
    spawn: { position: [42, 1.1, 72], headingRadians: Math.PI, street: 'Harbor Avenue' },
    roads,
    buildings,
    attribution: 'Original procedural harbor district',
    attributionUrl: 'https://github.com/priyanshu73/roadster-flight',
  };
}
