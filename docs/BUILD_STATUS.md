# Current build — 0.1 driving prototype

Implemented October 16, 2026. This is the foundation and a partial milestone-one
prototype, not the complete v1 or a passed visual-fidelity release gate.

## Working

- Vite/TypeScript, locked dependencies, one renderer/canvas and application lifecycle.
- Rapier raycast suspension, fixed 60 Hz simulation and render interpolation.
- WASD/arrows acceleration/steering, braking/reverse, Space boost, Shift hop, C camera,
  R reset, Escape pause. Blur/tab visibility loss clears input and pauses simulation.
- Pressure use, recharge after grounded coasting delay, speed envelope and CCD.
- Tuned steering response and air yaw/levelling assistance; live directional key indicators.
- Renderer-free 3D handling test engine with CSV/JSON telemetry and scrub-able trajectory reports.
- Real Midtown vector package: 230 road sections, 1,160 building footprints,
  651 graph nodes and 774 directed graph edges. Widths and missing heights are estimates.
- Independent static building colliders, ground support and bounded district recovery.
- Original procedural car and facade materials, daylight, shadows and follow camera.
- Destination menu, instruments, pause/settings, quality presets and reduced camera motion.
- Explicitly disabled unbuilt cities; download failure/retry and WebGL capability errors.
- Bundled map source/attribution, deterministic offline converter, CI and Pages workflow.

The finite district is loaded completely before driving. Collision batches are
grouped spatially, but runtime chunk streaming, unloading and GLB/LOD packages are
not implemented. All-city switches and floating-origin support are future work.

## Still needed

- Reveal-accurate licensed hero car and reference review: see `ASSETS.md`.
- Landmark/real facade detail, better road junctions/markings, kerbs and hop targets.
- More road-surface/rough-landing testing and graphics profiling on real reference devices.
- Flight hold, F flips, inverted surfaces and adhesion controller.
- Moving traffic, incidents, wanted state, police, helicopter and sound.
- Globe, Tokyo/London/Dubai packages, runtime streaming and final polish.
- Final original-code licence decision and actual GitHub Pages publication.

## Verification recorded

- `npm test`: 81 tests cover input, timing, pressure, physics, source/graph integrity
  and the scripted handling scenarios, plus 32 chase-camera projection checks.
- `npm run test:handling`: 30 scenarios / 158 behavioural checks pass, including
  reverse/boost/air steering, actual Midtown colliders, tilted-air recovery and 20 hops.
  See [test engine documentation](HANDLING_TESTS.md) for reports and repeatable inputs.
- `npm run build`: TypeScript and production Vite build succeed. Rapier's inlined
  WASM makes the JavaScript bundle larger than Vite's default warning threshold;
  the combined JS was about 0.98 MB gzip in this build.
- `npm run test:browser`: four Chromium software-WebGL scenarios cover nested Pages
  paths, loading, driving/boost/hop, real A/D heading response, pause/blur/reset/menu
  restart and failed city retry.
- Menu and driving screenshots inspected at 1440×900. These are functional browser
  checks, not hardware FPS benchmarks or proof of the architecture's visual targets.
- `npm audit`: no reported vulnerabilities after updating the test runner.

Headless software rendering does not establish real GPU performance or support in
Firefox/Safari. Twenty repeated hop/landing cycles now pass the shared headless controller. Full
ten-minute city driving and multi-device acceptance gates in `ROADMAP.md` remain open.

## Local commands

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/roadster-flight/`.
For the production build: `npm run build`, then `npm run preview`.
For headless driving checks and logs: `npm run test:handling`.
For browser checks: `npx playwright install chromium`, then `npm run test:browser`.
Add `?debug=1` for a read-only `window.__roadster.snapshot()` diagnostic interface;
backtick toggles collider/frame diagnostics while driving.

No map keys or runtime city service are needed. To publish later, enable GitHub
Pages with GitHub Actions as its source, then land the tested changes on `main`.
The implementation has not been pushed or published by this work session.
