# Current build — integrated living city and Heat Clock

October 16, 2026. Features from PRs #1–#3 are integrated into the TypeScript/Rapier
prototype. See [feature coverage and validation](PR_INTEGRATION.md).

## Working

- Two New York district options: fictional **Harbor** (default) and real OSM **Midtown**.
- Fixed-step driving, braking/reverse, corrected left/right steering, boost, hop,
  camera cycle, restart, pause, quality presets and reduced camera motion.
- Rear styling: bronze swept wing, lightbar, ROSTR plate, gold exhaust/fan nozzles,
  side jets and pooled vapour. Hero model remains procedural.
- Harbor waterfront, animated water, clouds, trees, crosswalks, cafes/tables/crowds,
  bridge collision deck, six initial bridge cars and opposite shore.
- 96 pedestrians, 32 traffic vehicles including cabs/two patrols, local dialogue on
  E and periodic proximity dialogue; original swinging/roof-riding masked courier.
- Heat Clock survival mode: crashes/smashes/pedestrian hits start the chase; timed
  and crime escalation; 2–9 patrol/interceptor/SUV units; helicopter at heat four.
- Busted/search bars, sirens, police minimap markers, physical knockdowns, smashed
  props/glass and shards; caught summary and saved best (`heatclock.best`).
- Enter/button/R restart restores the world and score state, retaining best time.
- Synthesised engine/traffic/horn/chatter/siren/rotor audio; local English speech
  when available; captions/fallback and mute; audio pauses with the game.
- Source/attribution records, reproducible city generators, static build and CI.

## Verification

`npm test`: 95 tests. `npm run test:handling`: 30 scenarios / 158 checks.
`npm run test:browser`: seven scenarios. TypeScript and production build pass.
See [handling test engine](HANDLING_TESTS.md) and [PR integration](PR_INTEGRATION.md).
The combined JS is about 0.99 MB gzip, including Rapier's inlined WASM; Vite reports
its existing large-chunk warning. This is not an error or a GPU benchmark.

Screenshots of street, rear, courier, district overview and caught screen are
reviewed. AudioContext running/mute/fallback are checked programmatically; installed
local voice quality and human listening balance remain unverified.

## Next milestones and limits

- Final licensed/reveal-accurate hero model, refined landmark/facade detail and art polish.
- Sustained lift, F flips, inverted surfaces and adhesion.
- Globe and Tokyo/London/Dubai packages; those menu buttons remain disabled.
- Runtime chunk streaming/LODs, production traffic signals/turn restrictions,
  capture/pursuit balance and profiling on reference desktop GPUs.
- Original-code licence decision and actual main-branch Pages deployment.

Both finite districts load fully before driving; runtime chunk streaming is not
implemented. The new PR scope intentionally adds a fictional harbor option without
calling it real geography. Midtown keeps its 230 roads/1,160 building footprints
and original data limitations. This is not the entire broader v1 roadmap.

## Run locally

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/roadster-flight/`. Select Harbor or Midtown before starting.
Controls: WASD/arrows, Space boost, Shift hop, C camera, E talk, H horn, M mute,
R restart, Escape pause. Enter restarts after capture.

`?debug=1` exposes read-only telemetry and backtick diagnostics. Browser integration
checks additionally use `?debug=1&test=1` to expose a bounded fixed-tick fast-forward
helper that runs the real input/physics/gameplay rules; it is absent during normal
play. This avoids waiting for real-time pursuits in UI tests.
