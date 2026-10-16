export type IncidentKind =
  'building' | 'traffic' | 'police' | 'pedestrian' | 'glass' | 'hydrant' | 'bin' | 'cone';
export interface ScoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const weight: Record<IncidentKind, number> = {
  building: 2,
  traffic: 2,
  police: 2,
  pedestrian: 3,
  glass: 2,
  hydrant: 1.2,
  bin: 1.2,
  cone: 0.5,
};

/** Pure fixed-tick game rules, shared by the game and headless interaction tests. */
export class HeatClock {
  chase = false;
  over = false;
  clock = 0;
  level = 0;
  peak = 0;
  busted = 0;
  cool = 0;
  distance = 0;
  smashes = 0;
  peopleHit = 0;
  crimes = 0;
  best = 0;
  newBest = false;
  banner = '';
  bannerUntil = 0;
  private time = 0;
  private nextEscalation = 25;
  private crimeWeight = 0;
  private incidents = new Map<string, number>();

  constructor(private storage?: ScoreStorage) {
    try {
      const best = Number(storage?.getItem('heatclock.best') || 0);
      if (Number.isFinite(best) && best >= 0) this.best = best;
    } catch {
      /* Optional storage. */
    }
  }
  get targetCops(): number {
    return [0, 2, 3, 5, 7, 9][this.level];
  }
  incident(id: string, kind: IncidentKind): boolean {
    if (this.over || this.time - (this.incidents.get(id) ?? -Infinity) < 1.2) return false;
    this.incidents.set(id, this.time);
    this.crimes++;
    this.cool = 0;
    if (kind === 'pedestrian') this.peopleHit++;
    if (['glass', 'hydrant', 'bin', 'cone'].includes(kind)) this.smashes++;
    if (!this.chase) {
      this.chase = true;
      this.level = this.peak = 1;
      this.clock = 0;
      this.nextEscalation = 25;
      this.announce('HEAT CLOCK STARTED');
    } else {
      this.crimeWeight += weight[kind];
      if (this.crimeWeight >= 8 && this.level < 5) {
        this.crimeWeight -= 8;
        this.level++;
        this.peak = Math.max(this.peak, this.level);
      }
      this.announce(kind === 'pedestrian' ? 'PEDESTRIAN HIT' : `${kind.toUpperCase()} COLLISION`);
    }
    return true;
  }
  tick(
    dt: number,
    perception: { speed: number; seen: boolean; nearbyCops: number; helicopterNear: boolean },
  ): void {
    this.time += dt;
    if (!this.chase || this.over) return;
    this.clock += dt;
    this.distance += perception.speed * dt;
    if (this.clock >= this.nextEscalation && this.level < 5) {
      this.level++;
      this.peak = Math.max(this.peak, this.level);
      this.nextEscalation = this.clock + 25;
      this.announce(`HEAT LEVEL ${this.level}`);
    }
    this.cool = perception.seen ? 0 : this.cool + dt;
    if (this.cool >= 9) {
      this.cool = 0;
      this.level = Math.max(1, this.level - 1);
      this.nextEscalation = this.clock + 25;
      this.announce(`LOST THEM · HEAT ${this.level}`);
    }
    const rate =
      perception.nearbyCops * 0.2 * (perception.speed < 8 ? 1.7 : 1) +
      (perception.helicopterNear ? 0.12 : 0);
    this.busted = Math.max(0, Math.min(1, this.busted + (rate ? rate * dt : -0.35 * dt)));
    if (this.busted >= 1) this.finish();
  }
  finish(): void {
    if (this.over || !this.chase) return;
    this.over = true;
    this.newBest = this.clock > this.best;
    if (this.newBest) {
      this.best = this.clock;
      try {
        this.storage?.setItem('heatclock.best', String(this.best));
      } catch {
        /* Play remains available. */
      }
    }
  }
  announce(text: string): void {
    this.banner = text;
    this.bannerUntil = this.time + 2;
  }
  get notice(): string {
    return this.time < this.bannerUntil ? this.banner : '';
  }
  reset(): void {
    this.chase = this.over = this.newBest = false;
    this.clock =
      this.level =
      this.peak =
      this.busted =
      this.cool =
      this.distance =
      this.smashes =
      this.peopleHit =
      this.crimes =
      this.time =
      this.crimeWeight =
        0;
    this.nextEscalation = 25;
    this.incidents.clear();
    this.banner = '';
    this.bannerUntil = 0;
  }
  snapshot() {
    return {
      chase: this.chase,
      over: this.over,
      clock: this.clock,
      level: this.level,
      peak: this.peak,
      busted: this.busted,
      cool: this.cool,
      distance: this.distance,
      smashes: this.smashes,
      peopleHit: this.peopleHit,
      crimes: this.crimes,
      best: this.best,
      newBest: this.newBest,
      targetCops: this.targetCops,
    };
  }
}

export function formatHeatTime(seconds: number): string {
  const tenths = Math.floor(Math.max(0, seconds) * 10 + 1e-7);
  return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`;
}
