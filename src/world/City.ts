export type Point = [number, number];
export interface Road {
  id: string;
  sourceWay: number;
  name: string;
  points: Point[];
  width: number;
  estimatedWidth: boolean;
  oneway: boolean;
  level: number;
}
export interface Building {
  id: number;
  name: string;
  polygon: Point[];
  holes: Point[][];
  height: number;
  estimatedHeight: boolean;
}
export interface City {
  schemaVersion: 1;
  id: string;
  name: string;
  district: string;
  bounds: { min: Point; max: Point };
  origin: { latitude: number; longitude: number; altitudeMeters: number };
  drivingSide: 'right' | 'left';
  spawn: { position: [number, number, number]; headingRadians: number; street: string };
  roads: Road[];
  buildings: Building[];
  attribution: string;
  attributionUrl: string;
}

function point(value: unknown): value is Point {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
}

export function validateCity(value: unknown): City {
  if (!value || typeof value !== 'object') throw new Error('Missing city package');
  const c = value as City;
  if (
    c.schemaVersion !== 1 ||
    c.id !== 'new-york-midtown' ||
    !Array.isArray(c.roads) ||
    !Array.isArray(c.buildings) ||
    !c.bounds ||
    !point(c.bounds.min) ||
    !point(c.bounds.max) ||
    c.bounds.min.some((n, i) => n >= c.bounds.max[i]) ||
    !c.spawn ||
    !Array.isArray(c.spawn.position) ||
    c.spawn.position.length !== 3 ||
    !c.spawn.position.every(Number.isFinite) ||
    !Number.isFinite(c.spawn.headingRadians)
  ) {
    throw new Error('Unsupported or invalid city package');
  }
  if (
    !c.roads.length ||
    c.roads.some(
      (r) =>
        !Array.isArray(r.points) ||
        r.points.length < 2 ||
        !r.points.every(point) ||
        !Number.isFinite(r.width) ||
        r.width <= 0,
    )
  ) {
    throw new Error('Invalid road geometry');
  }
  if (
    c.buildings.some(
      (b) =>
        !Array.isArray(b.polygon) ||
        b.polygon.length < 3 ||
        !b.polygon.every(point) ||
        !Array.isArray(b.holes) ||
        b.holes.some((h) => h.length < 3 || !h.every(point)) ||
        !Number.isFinite(b.height) ||
        b.height <= 0,
    )
  ) {
    throw new Error('Invalid building geometry');
  }
  return c;
}

export async function loadCity(signal: AbortSignal): Promise<City> {
  const response = await fetch(`${import.meta.env.BASE_URL}cities/new-york-midtown/district.json`, {
    signal,
  });
  if (!response.ok) throw new Error(`City download failed (${response.status}). Try reloading.`);
  return validateCity(await response.json());
}
