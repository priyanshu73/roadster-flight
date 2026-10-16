# Roadster Flight

Free desktop-only browser game: you're the only driver with the thruster-equipped flying Roadster. Pick a real city, cruise, hop over traffic, do flips, and when you break stuff the cops come after you. Outrun them on the street or in the air.

Inspired by the Tesla Roadster demo (Oct 15, 2026): SpaceX cold-gas thrusters, a mid-air barrel roll, a jump over the Tesla Semi, and fan suction that let it drive upside down.

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
- Shift: hop jets
- F: flip (mid-air)
- C: camera

## Tech plan (don't build everything from scratch)

- Rendering: Three.js (WebGL)
- Real cities: CesiumJS with photorealistic 3D tiles, or MapLibre + OpenStreetMap 3D buildings for a fully free stack
- Car physics: Rapier (WASM) or cannon-es, on top of an existing open-source browser driving base
- Flight model: thruster impulses over the car physics (vertical jets plus attitude control for flips)
- Cop AI: wanted level, pursuit steering on the OSM road graph, helicopter at high heat
- Damage triggers: collision impulses on props, parked cars, street furniture
- Menu: three.js globe with selectable city markers
- Hosting: GitHub Pages or itch.io, free

## Roadmap

1. MVP: one city, drivable car, thruster hop, basic cop chase
2. Flight: sustained thrust, flips, soft landing
3. Wanted system and damage
4. Globe city picker with 4 starter cities
5. Polish: sound, traffic density, scoring
