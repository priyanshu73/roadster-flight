export const STEP = 1 / 60;

export class FixedClock {
  private previous: number | null = null;
  private accumulator = 0;
  droppedSeconds = 0;

  reset(): void {
    this.previous = null;
    this.accumulator = 0;
  }

  advance(nowMs: number, tick: (dt: number) => void): number {
    if (this.previous === null) {
      this.previous = nowMs;
      return 0;
    }
    this.accumulator += Math.min(Math.max((nowMs - this.previous) / 1000, 0), 0.1);
    this.previous = nowMs;
    let steps = 0;
    while (this.accumulator + 1e-10 >= STEP && steps < 5) {
      tick(STEP);
      this.accumulator -= STEP;
      steps++;
    }
    if (this.accumulator >= STEP) {
      const remainder = this.accumulator % STEP;
      this.droppedSeconds += this.accumulator - remainder;
      this.accumulator = remainder;
    }
    return Math.max(0, this.accumulator / STEP);
  }
}
