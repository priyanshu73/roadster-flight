# Third-party notices

## Runtime dependencies

- Three.js 0.170.0 and its `RoomEnvironment` / `BufferGeometryUtils` examples:
  [MIT licence](https://github.com/mrdoob/three.js/blob/r170/LICENSE).
- Rapier JavaScript compatibility package 0.19.3:
  [Apache 2.0 licence](https://github.com/dimforge/rapier.js/blob/master/LICENSE).

Full runtime licence texts are bundled in `public/licenses/` and retained in the
production site's `licenses/` directory. Development tools are listed in the npm
lockfile with their respective package licences.

## Geographic data

© OpenStreetMap contributors. Data is available under the
[Open Database License 1.0](https://www.openstreetmap.org/copyright).

The Midtown package's vector source subset, adapted district geometry and directed
graph are distributed in `public/cities/new-york-midtown/`. This directory includes
the source query, input checksum, transformation limitations and ODbL licence text.
The converter is `tools/city/import.mjs`. OSM attribution remains visible in-game.

## Original development assets

The current car mesh, facade texture, ground/road materials, lamp geometry and HUD
are created in code for this project. The car is a procedural development stand-in,
not an exact licensed model of the October 2026 reveal. No downloaded Tesla model,
Tesla photographs, commercial city textures or third-party audio are bundled.

This is an independent fan project. Tesla and Roadster names identify the
inspiration; the project does not claim official affiliation or endorsement.
The owner's choice of licence for original application code is still pending;
the third-party and map-data licences above remain applicable independently.

## Integrated original feature assets

Rear styling is adapted from project PR #1; harbor/actors/dialogue/audio and Heat
Clock are integrated from the feature specifications/code in PRs #2–#3. These are
original code-generated assets within this project. No external character model,
recorded voice, commercial soundtrack or new mapping subscription is included.
The fictional harbor has its own source record and does not use OSM attribution
for its geography. Real Midtown retains the ODbL records above.
