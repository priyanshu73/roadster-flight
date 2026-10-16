import type { CityLife } from '../gameplay/CityLife';
import type { Vehicle } from '../vehicle/Vehicle';
export function drawMinimap(
  canvas: HTMLCanvasElement,
  life: CityLife,
  vehicle: Vehicle,
  time: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width,
    h = canvas.height,
    scale = 0.38,
    p = vehicle.currentPosition;
  const point = (x: number, z: number) =>
    [w / 2 + (x - p.x) * scale, h / 2 + (z - p.z) * scale] as const;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#122b37';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#687a7d';
  ctx.lineWidth = 3;
  for (const road of life.city.roads) {
    ctx.beginPath();
    road.points.forEach(([x, z], i) => {
      const q = point(x, z);
      i ? ctx.lineTo(...q) : ctx.moveTo(...q);
    });
    ctx.stroke();
  }
  ctx.fillStyle = '#dcc27f';
  for (const car of life.traffic) {
    const q = point(car.body.translation().x, car.body.translation().z);
    ctx.fillRect(q[0] - 1, q[1] - 1, 2, 2);
  }
  ctx.fillStyle = Math.floor(time * 6) % 2 ? '#ff554b' : '#4a8fff';
  for (const cop of life.cops)
    if (cop.active) {
      const q = point(cop.body.translation().x, cop.body.translation().z);
      ctx.beginPath();
      ctx.arc(...q, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  if (life.helicopter.active) {
    const q = point(life.helicopter.position.x, life.helicopter.position.z);
    ctx.strokeStyle = '#ffbb77';
    ctx.strokeRect(q[0] - 4, q[1] - 4, 8, 8);
  }
  const yaw = vehicle.telemetry().heading;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-yaw);
  ctx.fillStyle = '#fff5e3';
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
