# Roadster Flight — separate asset and source checklist

Status: the Midtown OSM source and original procedural development assets are
integrated. External hero-car, landmark and audio assets remain outstanding.
Priorities align with [ROADMAP.md](ROADMAP.md); see [build status](BUILD_STATUS.md).

The most useful outside help is **reveal-accurate Roadster references and a
redistributable 3D model**. The project can develop mechanics with a temporary
proxy, but public visual fidelity depends on that model. Geographic data should
come from documented open sources; no one needs to hand-build an entire city.

## 1. First-playable blockers

### Hero car references — needed for milestone 1

- [ ] Front, rear, side, front three-quarter and rear three-quarter images from the
  October 15, 2026 reveal or official current product imagery.
- [ ] Clear views of headlights, taillights, glass/roof, wheel design, rear
  diffuser and thruster/nozzle locations.
- [ ] Footage/time references for hop, roll and inverted driving, to guide motion
  and VFX. Reference material is not automatically redistributable game content.
- [ ] Verified dimensions if available; otherwise mark model dimensions as estimates.
- [ ] Identify whether each candidate model depicts the reveal vehicle or an older
  concept. Record differences instead of quietly calling an older model exact.

Start reference search with [Tesla's current Roadster page](https://www.tesla.com/roadster).
Human help: provide links to useful angles, an owned model, or a modeller's source.
No purchase is required for planning; evaluate free/owned candidates first.

### Hero model — needed before the public first playable

- [ ] GLB/glTF source with permission to redistribute inside a public GitHub repo
  and downloadable browser game, including any required credit.
- [ ] Editable source file if available, for silhouette/material corrections.
- [ ] Separate chassis, four wheels, glass, lamps and optional nozzle meshes.
- [ ] Wheel pivots at axle centres; front wheels can steer independently.
- [ ] Consistent real-world metre scale; normalised origin and forward axis.
- [ ] Named thrust attachment points with position/direction and intended effect.
- [ ] Clean PBR materials; usable body paint, glass, rubber, metal and emissive lamps.
- [ ] Initial target: <=100k triangles for main car, 20–30k medium LOD, <10k far LOD.
- [ ] Initial target: <=8 material groups, 2K main textures, <=10 MB transferred model
  plus textures after optimisation. These are budgets to inspect, not requirements
  to accept a poor silhouette.
- [ ] Simple compound collision dimensions supplied separately or generated in code.
- [ ] Front/rear/side visual review against selected reveal references.

A download button or “royalty free” label is insufficient evidence of web/repo
redistribution rights. If no suitable model exists, commission/create the hero car
from references; continue internal physics work with a clearly labelled proxy.

### New York geographic source — needed for milestone 1

- [x] Pin a vector OSM extract for the selected Midtown bounds.
- [x] Record source URL/provider, extract date, bounds and checksum.
- [ ] Verify usable streets, footprint coverage, height tags and road connectivity.
- [ ] Select a connected driving loop, boost straight, spawn and safe stunt-pad area.
- [x] Record derived road/graph/collision datasets and required ODbL availability.
- [x] Include visible OpenStreetMap attribution and the licence link in the game.
- [x] Inspect missing elevations/bridges/tunnels and exclude unresolved route sections.

Possible detail source to evaluate, not yet approved or downloaded:
[NYC 3D Model by Community District](https://data.nyc.gov/City-Government/NYC-3D-Model-by-Community-District/u5j4-zxpn).
It describes a model based on 2014 buildings, so evaluate age, conversion effort,
licence and size before relying on it. Do not ship a whole municipal archive when
only a few optimised buildings are needed.

## 2. First-playable visual support

- [ ] Asphalt, pavement, kerb, painted road markings and a small facade material set.
- [ ] Daylight HDR/environment image or a procedural environment; choose one
  redistributable source and ship an optimised version.
- [ ] A small set of New York landmark/building details visible from the selected
  route. Select specific assets after bounds and sightlines are confirmed.
- [ ] Streetlight, bollard, barrier, sign and bin props; shared materials where possible.
- [ ] One generic parked-car asset as a hop target; no traffic AI asset pack needed yet.
- [ ] Font with appropriate web redistribution rights; use a system font initially.

Use a restrained realistic material palette. Landmark authenticity and hero-car
proportions matter more than hundreds of generic props. Keep source-map features
and invented stunt furniture distinguishable in source records.

## 3. Flight and inverted-driving assets — milestone 2

- [ ] Stunt ramp with clean road surface, continuous inverted section, readable entry/exit.
- [ ] Separate low-complexity collision mesh and `adhesionEligible` surface metadata.
- [ ] Pale cold-gas vapour sprite/texture or procedural particle material.
- [ ] Short nozzle onset/release sounds and a loop suitable for lift/boost.
- [ ] Subtle air rush and landing/impact variations.
- [ ] Tested attachment-point positions on the final hero car model.

Prefer procedural geometry for the stunt ramp and simple particles for vapour.
AI image generation is optional for textures; it cannot replace a correctly
rigged interactive 3D car model.

## 4. Traffic and police assets — milestone 3

- [ ] Two or three generic civilian vehicle models/material variants, reusable across cities.
- [ ] One police sedan with separate wheels and configurable lightbar/livery.
- [ ] One helicopter with separately rotatable main/tail rotors and spotlight attachment.
- [ ] A small set of breakable road props with intact/broken states or simple fragments.
- [ ] Tyre roll/skid, minor/major impacts, police siren and helicopter rotor audio.
- [ ] City livery variants if affordable within scope; generic marked units are sufficient
  before a locally accurate livery pass.

Suggested initial budgets: 10–25k triangles per nearby traffic/police vehicle,
<5k far LOD, <=4 main materials; 20–40k for the helicopter with lower LOD. Use
shared textures/instancing where appropriate. Inspect real assets before fixing
budgets; do not spend the whole scene budget on traffic.

## 5. Globe and additional cities — milestone 4

- [ ] Lightweight licensed Earth day texture, or a procedural globe if texture rights/size are awkward.
- [ ] City marker and selection-state design, all keyboard accessible.
- [ ] Separate Tokyo district source package; left-side lane/turn validation.
- [ ] Separate London district source package; left-side validation and verified bridge levels if used.
- [ ] Separate Dubai district source package; junction/road-access validation.
- [ ] One or two recognisable sightline details per new district, chosen after bounds are set.
- [ ] Per-city source date, origin, bounds, spawn, attribution and derived-data release record.
- [ ] Per-city texture/model byte totals and complete package acceptance review.

Candidate areas are listed in the roadmap. Verify the availability and licence of
any municipal 3D source separately; public access does not establish identical
rights across New York, Tokyo, London and Dubai.

## 6. Final polish assets — milestone 5

- [ ] Balanced UI start/select/pause sounds and capture/escape feedback.
- [ ] Optional ambient city bed with a short loop; music is not a release blocker.
- [ ] Final hero-car and city preview images generated from the game itself.
- [ ] Project icon/social image if desired, without implying official endorsement.
- [ ] Complete credits/third-party notices linked from menu and release documentation.

## 7. Asset handoff and provenance

For each candidate, provide a source link and licence evidence before integration.
An acceptable source record contains:

```text
id:
kind: model | texture | audio | font | map-data | reference-only
title:
creator:
source URL:
licence name/version and licence URL:
proof/receipt path, if applicable:
repo redistribution allowed:
browser-game redistribution allowed:
required attribution:
modifications and derived outputs:
input checksum and acquisition date:
output path / bytes / dimensions or duration / triangle-material counts:
milestone:
status: candidate | approved | integrated | rejected
```

Game-deliverable defaults: GLB/glTF for 3D, optimised image textures with browser
fallback where required, and supported encoded audio (e.g. MP3 plus a tested
alternative if needed). Preserve editable source files outside the shipped build.
Bundle required decoders; test visual output after mesh/texture compression.

Acceptance: correct scale/orientation, clean pivots, no missing textures, correct
normal maps, no unexplained external fetches, reasonable GPU cost, and recorded
redistribution terms. Code licences do not replace model, sound or map licences.

## 8. Where outside help is most valuable

| Priority | Helpful handoff | What development can do meanwhile |
| --- | --- | --- |
| 1 | Current reveal reference angles and a licensed accurate Roadster GLB/source | Build suspension, input, hop and camera with a temporary proxy |
| 2 | Useful model corrections: proportions, glazing, lights, wheels, thruster positions | Import real streets and validate colliders/route connectivity |
| 3 | Licensed landmark detail for the chosen New York sightlines | Build the open-data district and generic materials |
| 4 | Reusable police/helicopter models and usable siren/thrust audio | Implement incident rules, road routing and perception with proxies |

No asset request needs to block this architecture plan. Acquire the milestone-one
car/data first; delay large prop libraries, extra cities and decorative audio until
their implementation gates approach.

Integrated development assets are original code-generated meshes/materials.
They unblock mechanics and do not close the final hero-car/fidelity checklist.

## Integrated PR assets

PRs #1–#3 now supply original procedural rear styling, civilian/taxi/patrol/interceptor/
SUV meshes, helicopter, 96 pedestrian avatars, an original masked courier, cafes,
bridge, harbor scenery, props/shards and synthesized sound. These are integrated
in the running game; the earlier external-asset checklist remains an optional
production-quality replacement list. A final reveal-accurate hero-car model and
higher-fidelity architecture are still the most valuable outside asset help.
See [PR feature coverage](PR_INTEGRATION.md).
