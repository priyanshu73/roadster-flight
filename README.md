# Roadster Flight

Free desktop-only browser game: you're the only driver with the thruster-equipped flying Roadster. Pick a real city, cruise, hop over traffic, do flips, and when you break stuff the cops come after you. Outrun them on the street or in the air.

Inspired by the Tesla Roadster demo (Oct 15, 2026): SpaceX cold-gas thrusters, a mid-air barrel roll, a jump over the Tesla Semi, and fan suction that let it drive upside down.

## Current status

The current build integrates the car rear, living city and Heat Clock features from
PRs #1–#3. Choose **Harbor** for a fictional NYC-inspired district with pedestrians,
cabs, cafes, a driveable bridge and a swinging/roof-riding courier; choose **Midtown**
for real OpenStreetMap streets. A crash starts a police pursuit: survive, escape
sight, avoid capture and beat your saved Heat Clock time.

Rapier owns driving, collisions, boost and hop. The hero car remains procedural;
sustained flight/flips, inverted driving and the other cities are still pending.
See [integrated PR coverage](docs/PR_INTEGRATION.md).

Use **Node.js 24** (or compatible Node >=22.12), then:

```sh
npm ci
npm run dev
```

Open [the local game](http://127.0.0.1:5173/roadster-flight/). No map key is required.

```sh
npm test                    # simulation and data checks
npm run test:handling        # renderer-free 3D driving suite + CSV/JSON/HTML report
npm run build               # typecheck and production build
npx playwright install chromium
npm run test:browser         # production browser checks
npm run city:import          # regenerate Midtown from committed vector source
npm run city:harbor          # regenerate original procedural harbor district
```

See [current build status](docs/BUILD_STATUS.md) for verified behaviour and remaining
release gates. [Third-party notices](THIRD_PARTY_NOTICES.md) cover runtime libraries
and map data.

The [driving test engine](docs/HANDLING_TESTS.md) scripts input through the real
physics controller and checks heading, thrust, braking, hops and collisions without
manual computer use. On the road, hold **W/Up** or **S/Down** while steering with
**A/D** or **Left/Right**; a stationary car only turns its wheels.

## Build plan

- [Detailed architecture](docs/ARCHITECTURE.md): system ownership, fixed-step physics,
  vehicle/flight controls, real-city data pipeline, traffic/police, performance and hosting.
- [Implementation roadmap](docs/ROADMAP.md): ordered work, dependencies, release gates
  and verification scenarios.
- [Separate asset checklist](docs/ASSETS.md): reveal-accurate car model/references,
  geographic data, materials, landmarks, traffic, police, helicopter and sound.

The first playable targets one bounded New York district with a recognisable car,
driving, boost and hop. Complete version one adds assisted flight, flips, designated
upside-down stunt surfaces, chases, a globe, and distinct districts in all four cities.
City names describe district destinations; whole-city coverage is outside v1.

## Game concept

- One player, one special car. Everyone else is normal traffic.
- Pick a city from a 3D globe (starter set: New York, Tokyo, London, Dubai).
- Real locations: streets and buildings from open map data.
- Thrusters: boost, hop over cars, mid-air flips, soft landings.
- Wanted system: hit something or break anything and the cops chase you. Escape with speed or thrust.
- Completely free. Browser only, desktop + keyboard for now.

## Controls (draft)

- WASD / arrows: drive
- Space: thruster boost
- Shift: hop jets (one press per hop)
- F: flip (planned; not implemented in this prototype)
- C: cycle chase, close chase and district overview
- E: talk to a nearby pedestrian
- H: horn
- M: mute
- R: restart the run (best time retained)
- Enter: restart after capture
- Escape: pause/menu

## Tech plan (don't build everything from scratch)

- Rendering: Three.js, bundled with Vite and TypeScript
- Real cities: bounded OpenStreetMap-derived district packages, prepared offline and served as static assets; optional photorealistic 3D tiles evaluated later inside the same Three.js renderer
- Car physics: Rapier (WASM), reusing its raycast vehicle controller for ground driving
- Flight model: limited thruster impulses/lift and attitude control over the same chassis body; explicit assistance for selected inverted stunt surfaces
- Cop AI: wanted level, pursuit steering on the OSM road graph, helicopter at high heat
- Damage triggers: collision impulses on props, parked cars, street furniture
- Menu: three.js globe with selectable city markers
- Hosting: GitHub Pages, with no runtime map key required by the default build

Real street geometry does not automatically provide photographic facade detail;
the asset checklist covers the additional work needed for visual fidelity. These
are reveal-inspired game mechanics; handling values and flight assists are game
tuning rather than verified vehicle specifications. Streamed map providers have
their own usage limits and terms, separate from free app hosting.

## Roadmap

1. Foundation, then one New York district: drive, boost, hop, land and reset.
2. Flight: limited lift, flips, soft-landing assistance and designated upside-down driving.
3. Traffic, collision incidents, wanted levels, road-chase police and high-heat helicopter.
4. Globe city picker and playable New York, Tokyo, London and Dubai districts.
5. Visual/audio polish, performance, verification and free Pages release.

See the roadmap for acceptance criteria and the build-status document for what is
implemented. The integrated New York build still leaves flight, globe and other-city milestones open.
