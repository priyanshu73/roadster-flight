# Integrated PR features

Reviewed all three open PR descriptions, their code, review records and comment
threads on October 16, 2026. No open issues or PR review comments were returned.
The PRs are stacked against the original CDN/bootstrap scene. Their features are
ported into the bundled TypeScript/Rapier application; there is one renderer,
physics simulation, input system, lifecycle and test suite.

## Feature coverage

| Source | Integrated features | Implementation |
| --- | --- | --- |
| [PR #1](https://github.com/priyanshu73/roadster-flight/pull/1) | Bronze swept wing/struts, red lightbar/glow, ROSTR plate, silver/vented panels, four gold exhaust tips and fan nozzles, four jets and pooled smoke, default rear chase view | `RearModel.ts`, `CarModel.ts`, `CameraRig.ts` |
| [PR #2](https://github.com/priyanshu73/roadster-flight/pull/2) | Fictional harbor district, buildings/crosswalks/lamps, water animation, clouds/sky, waterfront benches/trees, suspension bridge and opposite shore, 96 animated NPCs, three cafe fronts/tables/crowds, 32 moving vehicles including six starting on the bridge and two patrols, original masked gold courier with swing/roof transitions, dialogue, horn, audio fallback, mute, overview and minimap | `HarborCity.ts`, `CityPhysics.ts`, `CityLife.ts`, `LivingScene.ts`, `CityAudio.ts`, `Minimap.ts` |
| [PR #3](https://github.com/priyanshu73/roadster-flight/pull/3) | Collision-triggered survival clock, 1–5 stars, time/crime escalation, 2–9 pursuit cars, patrol/interceptor/SUV roles, level-four helicopter/searchlight, proximity busted meter, unseen cooldown, best-time persistence, caught summary, Enter/R/button restart, pedestrian knockdowns, smashed props/glass and pooled shards, siren and minimap police markers | `HeatClock.ts`, `CityLife.ts`, `GameSession.ts`, `App.ts` |

The rear geometry is adapted from PR #1's second rear pass. It is an original
procedural approximation, not a photoreal or downloaded Tesla model. Smoke is
bounded to 48 sprites, active during thrust/hop, instead of an always-on cloud.
No external model, audio, font or paid API was added.

## District choice

The entry screen selects **Harbor** by default. It is explicitly labelled fictional
NYC-inspired geometry. **Midtown** remains selectable and uses the original real
OpenStreetMap district and attribution. Source links reflect the selected district.
`npm run city:harbor` reproduces the harbor package; `npm run city:import` reproduces
Midtown. Harbor water has no invisible support floor; bridge/land do have colliders.

## Behaviour and fixes

- Vehicle control stays with Rapier, including corrected camera-relative steering.
- Pedestrians use capsule sensors while walking and dynamic knockdowns on impact.
  Wheel/camera rays exclude sensors. Impact cooldowns prevent repeated crimes from
  a resting contact, and broken props disable their colliders.
- Police use directed graph routes for interception, then bounded turning and fixed-
  geometry shape checks at close range. Sight checks use fixed world colliders.
  The helicopter checks roof elevation and line of sight.
- Actor boxes are instanced by shared geometry/material. Visibility of shattered
  props, inactive police and flashing lights is preserved when batching.
- R abandons the current run and starts a fresh one, as requested by PR #3. It
  restores props/NPCs, resets dispatch/heat/pressure/timers and preserves the best.
  This supersedes the earlier architecture's safe-position-only R behaviour.
- Pause/blur/caught/menu suspend audio; mute cancels speech and queued chatter.
  Contexts, sprite/line textures, batches and physics are disposed on district switch.
- C cycles chase, close chase and a district-wide overview. Multiple taps queued
  between physics ticks are retained, with a regression test.
- Local English SpeechSynthesis is used only when available. Otherwise original
  synthesised chatter and captions work without an API/account.

## Verification

- 95 simulation/data tests pass, including 32 camera-direction regressions and the
  new Heat Clock, prop collision, pedestrian, bridge, dialogue and lifecycle cases.
- The separate handling suite still passes 30 scenarios / 158 checks.
- Seven Chromium software-WebGL browser scenarios cover the existing Midtown
  controls, retry, harbor actor counts, E/H/M/C controls, courier roof visit,
  crash→pursuit→capture→saved best→Enter/R restart, and district resource disposal.
- TypeScript and the production build pass. Street, courier, overview and caught
  screenshots are generated under `artifacts/` for visual review.
- No human audio-quality or real-GPU FPS claim is made. Browser audio reaches
  running state; local spoken English voice quality depends on installed voices.

## Remaining scope

The PRs' implemented feature lists are integrated. Their stated future work—full
traffic signals/turn restrictions, interiors, roadblocks/spikes and art/balance
polish—is not represented as complete. The broader roadmap's sustained flight,
flips, inverted driving, globe and other cities remain separate milestones.
The harbor is stylised and fictional; Midtown's estimated road widths/building
heights and graph limitations remain documented with its source package.
