# Midtown source data

`new-york-midtown.osm.json` is an OpenStreetMap vector subset retrieved for this
prototype on October 16, 2026. It retains relevant ways, building relations,
referenced nodes and source feature tags. User/changeset metadata and unrelated
features were omitted. The query bounds and source checksum are recorded in
`public/cities/new-york-midtown/source.json`.

Data: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
The available source subset and adapted datasets are served alongside the game
under `cities/new-york-midtown/`. `source.osm.json` duplicates this source so the
deployed static site provides access without a Git checkout.

Run `npm run city:import` to reproduce the district and prototype directed road
graph from the committed subset. No network request, API token or account is used
by this command. Runtime gameplay also uses only bundled data.

The geometry approximates a flat district. Width/height estimates, omitted elevated
roads, incomplete boundary segments and unprocessed turn restrictions are listed
in `source.json`. Rendered facades are original procedural textures, not imagery of
the real buildings. The graph is not yet a production traffic-routing dataset.
