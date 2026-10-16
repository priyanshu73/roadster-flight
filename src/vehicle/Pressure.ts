export class Pressure {
  value = 100;
  private sinceUse = 0;

  spend(amount: number): boolean {
    if (amount < 0 || !Number.isFinite(amount) || this.value + 1e-8 < amount) return false;
    this.value = Math.max(0, this.value - amount);
    this.sinceUse = 0;
    return true;
  }

  update(dt: number, grounded: boolean, idle: boolean): void {
    this.sinceUse += dt;
    if (grounded && idle && this.sinceUse > 1.8) this.value = Math.min(100, this.value + 16 * dt);
  }

  reset(): void {
    this.value = 100;
    this.sinceUse = 0;
  }
}
