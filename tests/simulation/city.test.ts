import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateCity } from '../../src/world/City';

const load = (file: string) =>
  JSON.parse(readFileSync(`public/cities/new-york-midtown/${file}`, 'utf8'));

describe('bundled city package', () => {
  it('has valid geometry, a real-street spawn and finite dimensions', () => {
    const city = validateCity(load('district.json'));
    expect(city.roads.length).toBeGreaterThan(100);
    expect(city.buildings.length).toBeGreaterThan(500);
    expect(city.spawn.street).toMatch(/6th Avenue/);
    expect(city.spawn.position[0]).toBeGreaterThan(city.bounds.min[0]);
    expect(city.spawn.position[2]).toBeLessThan(city.bounds.max[1]);
  });
  it('rejects broken geometry before creating physics', () => {
    const city = load('district.json');
    city.buildings[0].height = NaN;
    expect(() => validateCity(city)).toThrow('Invalid building geometry');
  });
  it('retains a consistent, obtainable ODbL source subset', () => {
    const source = load('source.json');
    const hash = createHash('sha256')
      .update(readFileSync('public/cities/new-york-midtown/source.osm.json'))
      .digest('hex');
    expect(hash).toBe(source.inputSha256);
    expect(source.sourceLicence).toBe('ODbL-1.0');
  });
  it('contains graph edges with no dangling references or zero lengths', () => {
    const graph = load('road-graph.json');
    const nodes = new Set(graph.nodes.map((n: { id: number }) => n.id));
    expect(graph.edges.length).toBeGreaterThan(100);
    for (const edge of graph.edges) {
      expect(nodes.has(edge.from)).toBe(true);
      expect(nodes.has(edge.to)).toBe(true);
      expect(edge.length).toBeGreaterThan(0);
    }
  });
});
