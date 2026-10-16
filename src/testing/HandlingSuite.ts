import {
  runDrivingScenario,
  type DrivingScenario,
  type DrivingResult,
  type Phase,
} from './DrivingHarness';
import type { City } from '../world/City';

const phase = (seconds: number, label: string, ...keys: string[]): Phase => ({
  seconds,
  label,
  keys,
});
export const HANDLING_SCENARIOS: DrivingScenario[] = [
  {
    id: 'tilt-recovery',
    name: 'Tilted hop / self-level before landing',
    airTilt: [0.25, -0.18],
    phases: [phase(2, 'recover')],
  },
  ...['left', 'right'].map((side) => ({
    id: `air-boost-${side}`,
    name: `Boosted hop / airborne ${side}`,
    phases: [
      phase(0.5, 'approach', 'KeyW'),
      phase(0.1, 'hop', 'ShiftLeft', 'Space'),
      phase(0.75, 'air-turn', 'Space', side === 'left' ? 'KeyA' : 'KeyD'),
      phase(2, 'land'),
    ],
  })),
  { id: 'forward', name: 'W / accelerate', phases: [phase(3, 'accelerate', 'KeyW')] },
  { id: 'reverse', name: 'S / reverse', phases: [phase(3, 'reverse', 'KeyS')] },
  {
    id: 'left',
    name: 'W + A / left',
    phases: [phase(1, 'approach', 'KeyW'), phase(1.2, 'turn', 'KeyW', 'KeyA')],
  },
  {
    id: 'right',
    name: 'W + D / right',
    phases: [phase(1, 'approach', 'KeyW'), phase(1.2, 'turn', 'KeyW', 'KeyD')],
  },
  {
    id: 'arrows-left',
    name: '↑ + ← / arrow aliases',
    phases: [phase(1, 'approach', 'ArrowUp'), phase(1.2, 'turn', 'ArrowUp', 'ArrowLeft')],
  },
  {
    id: 'arrows-right',
    name: '↑ + → / arrow aliases',
    phases: [phase(1, 'approach', 'ArrowUp'), phase(1.2, 'turn', 'ArrowUp', 'ArrowRight')],
  },
  {
    id: 'reverse-left',
    name: 'S + A / reverse steering',
    phases: [phase(1, 'approach', 'KeyS'), phase(1.2, 'turn', 'KeyS', 'KeyA')],
  },
  {
    id: 'reverse-right',
    name: 'S + D / reverse steering',
    phases: [phase(1, 'approach', 'KeyS'), phase(1.2, 'turn', 'KeyS', 'KeyD')],
  },
  {
    id: 'boost-left',
    name: 'Space + A / thrust and left',
    phases: [phase(1.5, 'boost', 'Space'), phase(1, 'turn', 'Space', 'KeyA')],
  },
  {
    id: 'boost-right',
    name: 'Space + D / thrust and right',
    phases: [phase(1.5, 'boost', 'Space'), phase(1, 'turn', 'Space', 'KeyD')],
  },
  {
    id: 'high-speed-left',
    name: 'Fast boost + left',
    phases: [phase(3, 'approach', 'KeyW', 'Space'), phase(1, 'turn', 'KeyW', 'Space', 'KeyA')],
  },
  {
    id: 'high-speed-right',
    name: 'Fast boost + right',
    phases: [phase(3, 'approach', 'KeyW', 'Space'), phase(1, 'turn', 'KeyW', 'Space', 'KeyD')],
  },
  {
    id: 'brake',
    name: 'W then S / brake before reverse',
    phases: [phase(2, 'accelerate', 'KeyW'), phase(0.6, 'brake', 'KeyS')],
  },
  {
    id: 'opposed',
    name: 'Opposite inputs / brake, no turn',
    phases: [phase(1, 'accelerate', 'KeyW'), phase(1, 'opposed', 'KeyW', 'KeyS', 'KeyA', 'KeyD')],
  },
  {
    id: 'recenter',
    name: 'Release steering / centre wheels',
    phases: [
      phase(1, 'approach', 'KeyW'),
      phase(0.5, 'turn', 'KeyW', 'KeyD'),
      phase(1, 'release', 'KeyW'),
    ],
  },
  {
    id: 'stationary',
    name: 'A alone / wheels turn, car stays still',
    phases: [phase(1, 'steer', 'KeyA')],
  },
  {
    id: 'hop',
    name: 'Shift / up, down, land',
    phases: [phase(0.1, 'hop', 'ShiftLeft'), phase(3, 'land')],
  },
  {
    id: 'air-left',
    name: 'Shift + A / airborne left',
    phases: [phase(0.1, 'hop', 'ShiftLeft'), phase(0.75, 'air-turn', 'KeyA'), phase(2, 'land')],
  },
  {
    id: 'air-right',
    name: 'Shift + D / airborne right',
    phases: [phase(0.1, 'hop', 'ShiftRight'), phase(0.75, 'air-turn', 'KeyD'), phase(2, 'land')],
  },
  { id: 'held-hop', name: 'Held Shift / one launch', phases: [phase(4, 'held', 'ShiftLeft')] },
  {
    id: 'depletion',
    name: 'Long thrust / pressure and speed limits',
    phases: [phase(8, 'boost', 'Space')],
  },
  {
    id: 'wall',
    name: 'Boost / wall collision',
    wall: 60,
    phases: [phase(4, 'boost', 'KeyW', 'Space')],
  },
  {
    id: 'rotated-left',
    name: 'Steering at rotated world heading',
    heading: 2.635,
    phases: [phase(1, 'approach', 'KeyW'), phase(1.2, 'turn', 'KeyW', 'KeyA')],
  },
  {
    id: 'reset',
    name: 'Reset / release velocity and wheel angle',
    phases: [phase(2, 'drive', 'KeyW', 'KeyD'), phase(0.1, 'reset', 'KeyR'), phase(1, 'settle')],
  },
  ...['left', 'right'].map((side) => ({
    id: `city-${side}`,
    name: `Actual Midtown colliders / ${side}`,
    city: true,
    phases: [
      phase(0.7, 'approach', 'KeyW'),
      phase(0.7, 'turn', 'KeyW', side === 'left' ? 'KeyA' : 'KeyD'),
    ],
  })),
  {
    id: 'twenty-hops',
    name: '20 launches and landings',
    phases: Array.from({ length: 20 }, (_, i) => [
      phase(0.05, `hop-${i + 1}`, 'ShiftLeft'),
      phase(5, 'recover'),
    ]).flat(),
  },
];

export function assessHandling(result: DrivingResult): DrivingResult {
  const samples = result.samples,
    last = samples.at(-1)!;
  const peak = (field: 'speed' | 'height') => Math.max(...samples.map((s) => s[field]));
  const check = (name: string, actual: number, predicate: boolean, expected: string) =>
    result.checks.push({ name, actual, passed: predicate, expected });
  check(
    'Finite 3D state',
    samples.filter((s) =>
      [...s.position, ...s.velocity, s.heading, s.pressure].some((n) => !Number.isFinite(n)),
    ).length,
    samples.every((s) =>
      [...s.position, ...s.velocity, s.heading, s.pressure].every(Number.isFinite),
    ),
    '0 invalid samples',
  );
  check(
    'Pressure stays within bounds',
    Math.min(...samples.map((s) => s.pressure)),
    samples.every((s) => s.pressure >= 0 && s.pressure <= 100),
    '0–100%',
  );
  check(
    'Car stays upright',
    Math.min(...samples.map((s) => s.upright)),
    samples.every((s) => s.upright > 0.8),
    '> 0.8 up-vector alignment',
  );
  if (result.id === 'forward')
    check('Moves forwards without thrust', last.localZ, last.localZ > 20, '> 20 m');
  if (result.id === 'reverse') check('Moves backwards', last.localZ, last.localZ < -10, '< -10 m');
  if (/left|right/.test(result.id)) {
    const sign = result.id.includes('left') ? -1 : 1;
    const backwards = result.id.startsWith('reverse');
    const turnSamples = samples.filter((s) => s.phase === 'turn' || s.phase === 'air-turn');
    const yaw = turnSamples.at(-1)!.yawDegrees;
    const minimum = result.city ? 10 : result.id.startsWith('air') ? 15 : 20;
    check(
      'Heading changes in the commanded direction',
      yaw,
      yaw * -sign * (backwards ? -1 : 1) > minimum,
      `${(backwards ? sign : -sign) > 0 ? 'positive' : 'negative'} world yaw, > ${minimum}° magnitude`,
    );
    if (!result.id.startsWith('air'))
      check(
        'Actual displacement follows the turn',
        last.localX,
        last.localX * sign > (result.city ? 0.2 : 1),
        `commanded side, > ${result.city ? 0.2 : 1} m`,
      );
  }
  if (result.id === 'brake') {
    const before = samples.filter((s) => s.phase === 'accelerate').at(-1)!.speed;
    check(
      'S brakes a forward-moving car',
      last.speed / before,
      last.speed < before * 0.5,
      '< 50% approach speed',
    );
  }
  if (result.id === 'opposed') {
    check('Opposite pedals brake', last.speed, last.speed < 0.5, '< 0.5 m/s');
    check('Opposite steering cancels', last.yawDegrees, Math.abs(last.yawDegrees) < 1, '< 1°');
  }
  if (result.id === 'recenter' || result.id === 'reset')
    check(
      'Wheel steering returns to centre',
      last.steering,
      Math.abs(last.steering) < 0.001,
      '< 0.001 rad',
    );
  if (result.id === 'reset')
    check('Reset stops the car', last.speed, last.speed < 0.1, '< 0.1 m/s');
  if (result.id === 'stationary') {
    check('Steering wheels respond', last.steering, last.steering > 0.4, '> 0.4 rad (left)');
    check('No fake stationary pivot', last.yawDegrees, Math.abs(last.yawDegrees) < 1, '< 1°');
    check(
      'Resting suspension is not displayed as road speed',
      last.speed,
      last.speed < 0.05,
      '< 0.05 m/s',
    );
  }
  if (result.id === 'tilt-recovery') {
    const airborne = samples.find((s) => s.time >= 0.6)!;
    check(
      'Restoring torque levels a tilted car in the air',
      airborne.upright,
      airborne.upright > 0.985,
      '> 0.985 up-vector alignment at 0.6 s',
    );
    check(
      'Lands upright after recovery',
      last.upright,
      last.grounded && last.upright > 0.99,
      'grounded and > 0.99 alignment',
    );
  }
  if (['hop', 'held-hop', 'twenty-hops'].includes(result.id) || result.id.startsWith('air-')) {
    check(
      'Hop gains altitude',
      peak('height'),
      peak('height') > 1.8 && peak('height') < 3.5,
      '1.8–3.5 m',
    );
    check(
      'Returns to ground',
      last.height,
      last.grounded && Math.abs(last.height) < 0.15,
      'grounded, < 0.15 m from rest',
    );
    const launches = samples.filter((s) => s.hopping).length;
    const expected = result.id === 'twenty-hops' ? 20 : 1;
    check(
      'Exactly one launch per key press',
      launches,
      launches === expected,
      `${expected} launches`,
    );
  }
  if (result.id === 'depletion') {
    check('Thrust consumes pressure', last.pressure, last.pressure < 1, '< 1%');
    check('Road speed is capped', peak('speed'), peak('speed') <= 70.1, '≤ 70.1 m/s');
    check(
      'Empty tank cannot produce thrust',
      samples.filter((s) => s.time > 5 && s.boostForce > 0).length,
      samples.filter((s) => s.time > 5 && s.boostForce > 0).length === 0,
      '0 powered samples after depletion',
    );
  }
  if (result.id === 'wall')
    check(
      'Does not tunnel through wall',
      Math.max(...samples.map((s) => s.position[2])),
      samples.every((s) => s.position[2] < 60),
      '< 60 m at every tick',
    );
  return result;
}

export function runHandlingSuite(city: City): DrivingResult[] {
  return HANDLING_SCENARIOS.map((s) => assessHandling(runDrivingScenario(s, city)));
}
