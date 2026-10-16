import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const inputPath = 'data/sources/new-york-midtown.osm.json';
const directory = 'public/cities/new-york-midtown';
const source = JSON.parse(readFileSync(inputPath, 'utf8'));
const origin = { latitude: 40.7549, longitude: -73.984, altitudeMeters: 0 };
const bbox = [-73.994, 40.75, -73.978, 40.76];
const project = (n) =>
  [
    (((n.lon - origin.longitude) * Math.PI) / 180) *
      6378137 *
      Math.cos((origin.latitude * Math.PI) / 180),
    ((-(n.lat - origin.latitude) * Math.PI) / 180) * 6378137,
  ].map((v) => Math.round(v * 100) / 100);
const min = project({ lon: bbox[0], lat: bbox[3] });
const max = project({ lon: bbox[2], lat: bbox[1] });
const nodes = new Map(source.elements.filter((e) => e.type === 'node').map((n) => [n.id, n]));
const ways = new Map(source.elements.filter((e) => e.type === 'way').map((w) => [w.id, w]));
const inside = (p) => p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1];
const allowed = new Set([
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'unclassified',
  'living_street',
]);
const used = new Set();
const roads = [];
const buildings = [];
const graphNodes = new Map();
const edges = [];
let rejectedBuildings = 0;

function ring(ids) {
  const points = ids
    .map((id) => nodes.get(id))
    .filter(Boolean)
    .map(project);
  if (points.length < 4 || ids[0] !== ids.at(-1)) return null;
  const center = points.reduce(
    (p, q) => [p[0] + q[0] / points.length, p[1] + q[1] / points.length],
    [0, 0],
  );
  return inside(center) ? points.slice(0, -1) : null;
}
function addBuilding(id, tags, outerIds, innerIds = []) {
  const polygon = ring(outerIds);
  if (!polygon) {
    rejectedBuildings++;
    return;
  }
  const taggedHeight = parseFloat(tags.height);
  const levels = parseFloat(tags['building:levels']);
  const height = Math.min(
    450,
    Math.max(4, taggedHeight || (levels ? levels * 3.3 : 14 + (id % 34))),
  );
  buildings.push({
    id,
    name: tags.name || '',
    polygon,
    holes: innerIds.map(ring).filter(Boolean),
    height: Math.round(height * 10) / 10,
    estimatedHeight: !taggedHeight && !levels,
  });
}
// Join relation member fragments into closed outer/inner rings without inventing a closure.
function joinRings(members) {
  const fragments = members.map((m) => ways.get(m.ref)?.nodes?.slice()).filter(Boolean);
  const rings = [];
  while (fragments.length) {
    const part = fragments.shift();
    while (part[0] !== part.at(-1)) {
      const next = fragments.findIndex((f) => f[0] === part.at(-1) || f.at(-1) === part.at(-1));
      if (next < 0) break;
      const f = fragments.splice(next, 1)[0];
      if (f.at(-1) === part.at(-1)) f.reverse();
      part.push(...f.slice(1));
    }
    if (part[0] === part.at(-1)) rings.push(part);
  }
  return rings;
}
for (const relation of source.elements.filter(
  (e) => e.type === 'relation' && e.tags?.building && e.tags.type === 'multipolygon',
)) {
  const outer = joinRings(relation.members.filter((m) => m.type === 'way' && m.role === 'outer'));
  const inner = joinRings(relation.members.filter((m) => m.type === 'way' && m.role === 'inner'));
  // Multi-outer relations require hole containment assignment before support.
  if (outer.length !== 1) continue;
  addBuilding(relation.id, relation.tags, outer[0], inner);
  for (const member of relation.members) if (member.type === 'way') used.add(member.ref);
}
for (const way of ways.values()) {
  const tags = way.tags || {};
  if (tags.building && tags.building !== 'no' && !used.has(way.id))
    addBuilding(way.id, tags, way.nodes);
  if (
    !allowed.has(tags.highway) ||
    tags.area === 'yes' ||
    tags.access === 'private' ||
    tags.tunnel === 'yes' ||
    tags.bridge === 'yes' ||
    (tags.layer && tags.layer !== '0')
  )
    continue;
  const lanes = Math.max(
    1,
    Math.min(6, parseInt(tags.lanes) || (tags.highway === 'primary' ? 4 : 2)),
  );
  const width = Math.max(7, Math.min(26, parseFloat(tags.width) || lanes * 3.3 + 3));
  let sequence = [];
  const flush = () => {
    if (sequence.length > 1) {
      const id = `${way.id}-${roads.length}`;
      const points = sequence.map((n) => project(n));
      roads.push({
        id,
        sourceWay: way.id,
        name: tags.name || 'Local street',
        points,
        width,
        estimatedWidth: !tags.width,
        oneway: tags.oneway === 'yes' || tags.oneway === '-1',
        level: 0,
      });
      for (let i = 1; i < sequence.length; i++) {
        const a = sequence[i - 1],
          b = sequence[i];
        const pa = points[i - 1],
          pb = points[i];
        graphNodes.set(a.id, { id: a.id, position: pa, level: 0 });
        graphNodes.set(b.id, { id: b.id, position: pb, level: 0 });
        const length = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
        const edge = { from: a.id, to: b.id, way: way.id, length, speedLimitMps: 11.18 };
        edges.push(tags.oneway === '-1' ? { ...edge, from: b.id, to: a.id } : edge);
        if (tags.oneway !== 'yes' && tags.oneway !== '-1')
          edges.push({ ...edge, from: b.id, to: a.id });
      }
    }
    sequence = [];
  };
  for (const id of way.nodes) {
    const n = nodes.get(id);
    if (n && inside(project(n))) sequence.push(n);
    else flush();
  }
  flush();
}

// Choose a long central avenue segment, then offset into its right-hand lane.
const candidates = roads
  .filter((r) => /Avenue of the Americas|6th Avenue/i.test(r.name))
  .flatMap((r) => r.points.slice(1).map((b, i) => ({ road: r, a: r.points[i], b })))
  .filter((s) => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) > 45)
  .sort((a, b) => Math.hypot(...a.a) - Math.hypot(...b.a));
if (!candidates.length) throw new Error('No suitable central avenue spawn');
const segment = candidates[0];
const dx = segment.b[0] - segment.a[0],
  dz = segment.b[1] - segment.a[1];
const length = Math.hypot(dx, dz);
const position = [
  (segment.a[0] + segment.b[0]) / 2 + (dz / length) * segment.road.width * 0.17,
  1.1,
  (segment.a[1] + segment.b[1]) / 2 - (dx / length) * segment.road.width * 0.17,
];
const spawn = { position, headingRadians: Math.atan2(dx, dz), street: segment.road.name };
const city = {
  schemaVersion: 1,
  id: 'new-york-midtown',
  name: 'New York',
  district: 'Midtown Manhattan',
  origin,
  drivingSide: 'right',
  bounds: { min, max },
  spawn,
  roads,
  buildings,
  attribution: '© OpenStreetMap contributors',
  attributionUrl: 'https://www.openstreetmap.org/copyright',
};

// Retain only the relevant vector source with source tags; no user/changeset metadata.
const keepWays = new Set(
  [...ways.values()]
    .filter((w) => w.tags?.building || allowed.has(w.tags?.highway))
    .map((w) => w.id),
);
for (const r of source.elements.filter((e) => e.type === 'relation' && e.tags?.building))
  for (const m of r.members) if (m.type === 'way') keepWays.add(m.ref);
const keepNodes = new Set([...keepWays].flatMap((id) => ways.get(id)?.nodes || []));
const slim = {
  version: 0.6,
  generator: 'roadster-flight source subset',
  elements: source.elements
    .filter(
      (e) =>
        (e.type === 'node' && keepNodes.has(e.id)) ||
        (e.type === 'way' && keepWays.has(e.id)) ||
        (e.type === 'relation' && e.tags?.building),
    )
    .map((e) =>
      e.type === 'node'
        ? { type: e.type, id: e.id, lat: e.lat, lon: e.lon }
        : {
            type: e.type,
            id: e.id,
            ...(e.nodes ? { nodes: e.nodes } : { members: e.members }),
            tags: e.tags,
          },
    ),
};
writeFileSync(inputPath, JSON.stringify(slim));
const hash = createHash('sha256').update(readFileSync(inputPath)).digest('hex');
const metadata = {
  sourceUrl: 'https://api.openstreetmap.org/api/0.6/map.json?bbox=-73.994,40.750,-73.978,40.760',
  acquiredDate: '2026-10-16',
  sourceLicence: 'ODbL-1.0',
  licenceUrl: city.attributionUrl,
  boundsWgs84: bbox,
  inputSha256: hash,
  converter: 'tools/city/import.mjs v1',
  sourceSubset: 'source.osm.json',
  limitations: [
    'Flat local projection; elevated/tunnel roads excluded',
    'Widths and missing heights estimated',
    'Boundary-crossing road segments omitted',
    'Multi-outer building relations not yet supported',
    'Road graph is a source-topology prototype; turn restrictions and lane connectors not yet imported',
  ],
  counts: {
    roads: roads.length,
    buildings: buildings.length,
    rejectedBuildings,
    graphNodes: graphNodes.size,
    graphEdges: edges.length,
  },
};
mkdirSync(directory, { recursive: true });
writeFileSync(`${directory}/district.json`, JSON.stringify(city));
writeFileSync(
  `${directory}/road-graph.json`,
  JSON.stringify({ schemaVersion: 1, nodes: [...graphNodes.values()], edges }),
);
writeFileSync(`${directory}/source.json`, JSON.stringify(metadata, null, 2) + '\n');
writeFileSync(`${directory}/source.osm.json`, JSON.stringify(slim));
console.log(
  JSON.stringify({ ...metadata.counts, spawn, bytes: JSON.stringify(city).length }, null, 2),
);
