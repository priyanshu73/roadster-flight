import type { City } from '../world/City';
export interface RoadNode {
  id: number;
  x: number;
  z: number;
  next: number[];
}
export class RoadNetwork {
  readonly nodes: RoadNode[] = [];
  constructor(city: City) {
    const ids = new Map<string, number>();
    const node = (p: [number, number]) => {
      const key = `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
      let id = ids.get(key);
      if (id === undefined) {
        id = this.nodes.length;
        ids.set(key, id);
        this.nodes.push({ id, x: p[0], z: p[1], next: [] });
      }
      return id;
    };
    for (const road of city.roads)
      for (let i = 1; i < road.points.length; i++) {
        const a = node(road.points[i - 1]),
          b = node(road.points[i]);
        if (a === b) continue;
        this.nodes[a].next.push(b);
        if (!road.oneway) this.nodes[b].next.push(a);
      }
  }
  nearest(x: number, z: number): number {
    let best = 0,
      d = Infinity;
    for (const n of this.nodes) {
      const ds = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (ds < d) {
        d = ds;
        best = n.id;
      }
    }
    return best;
  }
  route(start: number, end: number): number[] {
    const open = new Set([start]),
      cost = new Map([[start, 0]]),
      from = new Map<number, number>();
    while (open.size) {
      let id = -1,
        best = Infinity;
      for (const n of open) {
        const a = this.nodes[n],
          b = this.nodes[end],
          f = cost.get(n)! + Math.hypot(a.x - b.x, a.z - b.z);
        if (f < best) {
          best = f;
          id = n;
        }
      }
      if (id === end) {
        const path = [id];
        while (from.has(id)) {
          id = from.get(id)!;
          path.unshift(id);
        }
        return path;
      }
      open.delete(id);
      for (const next of this.nodes[id].next) {
        const a = this.nodes[id],
          b = this.nodes[next],
          g = cost.get(id)! + Math.hypot(a.x - b.x, a.z - b.z);
        if (g < (cost.get(next) ?? Infinity)) {
          cost.set(next, g);
          from.set(next, id);
          open.add(next);
        }
      }
    }
    return [start];
  }
}

export function seededRandom(seed = 734): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
