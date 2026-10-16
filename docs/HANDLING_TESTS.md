# Driving test engine

Run `npm run test:handling` from the repository root. It executes the real Rapier
vehicle and input buffer at 60 Hz, without starting a browser, renderer or display.
The command exits with a failure status if any behavioural check fails.

The test track is a flat collision course; two scenarios use the actual bundled
Midtown colliders and spawn. The city collider builder and building geometry are
shared with gameplay, so these checks do not substitute a separate physics model.
Rendering, camera composition and browser focus still need a small browser smoke
suite: `npm run test:browser`. Those tests send keyboard events programmatically;
manual computer use is not needed.

## Current scenarios

30 scenarios / 158 behavioural checks cover:

- W/Up acceleration and S/Down reverse without relying on boost.
- A/Left and D/Right heading changes and lateral displacement, matching across aliases.
- Reverse steering, coasting/recentring and rotated world headings.
- Steering while using Space, including high-speed boost turns.
- Braking before reverse and braking when both pedals are pressed.
- Wheel steering at rest without inventing a stationary chassis pivot.
- Shift hop, gravity-driven descent and landing, held-key deduplication, and 20 cycles.
- Airborne left/right yaw assistance with minimum heading response, including boosted hops.
- Recovery from an initially tilted airborne pose before landing.
- Pressure depletion, thrust cutoff, speed envelope, uprightness and wall impacts.
- Reset clearing velocity and wheel angle.
- Left/right direction with Midtown's actual building/ground collision geometry.

The headless scenarios also run inside `npm test`. Additional browser checks verify
that real keyboard A/D events reach the running app and turn the chassis in the
expected direction, rather than only changing a wheel animation or translating it.

## Generated diagnostics

`artifacts/handling/` is local generated output, excluded from Git and the deployed
game. CI generates and uploads the report as an artifact, including on a failing run.

| File | Contents |
| --- | --- |
| `report.html` | Scenario selector, top-down and projected 3D paths, tick scrubber, charts, pass/fail checks |
| `telemetry.json` | Full 60 Hz samples, exact tuning snapshot and checks |
| `telemetry.csv` | Input keys, phase, time, XYZ position, road/vertical speed, yaw, steering, pressure, forces, contacts |

Open the HTML directly or, while Vite is running, visit
`http://127.0.0.1:5173/roadster-flight/artifacts/handling/report.html`.
The report is self-contained and does not require third-party scripts or accounts.
Height is exaggerated in its projected 3D view to make a short hop readable.

## Reading a result

For a vehicle facing local +Z with +Y up, the driver’s left is local **+X**.
The rear chase camera therefore sees positive world yaw as a left turn. The
report’s driver-relative X uses **right-positive** coordinates, so a left turn
produces negative reported X displacement. Right should mirror that. In
reverse the yaw direction reverses while the rear path follows the requested side.
Checks measure heading as well as displacement so sideways sliding cannot pass as
steering. Heading is unwrapped to preserve complete turns; local coordinates are
relative to the initial vehicle pose, including the rotated Midtown spawn.

Each record captures requested keys **and** resulting wheel angle, body yaw rate,
engine force, boost force, hop impulse, pressure and contact state. A log that only
records requested keys would not prove that the car responded.

Current measured examples from the scripted suite:

- W+A and W+D: approximately +71.7° / -71.7° after the defined approach and 1.2 s turn.
- Space+A and Space+D: approximately +46.8° / -46.8° after a 1.5 s boost approach and 1 s turn.
- Hop then 0.75 s airborne steering: approximately +39.5° / -39.5° by landing.
- Midtown short turns: approximately +36.9° / -36.9° with the recorded scenario timing.

These are regression observations under the current tuning, not vehicle specs or
promises of identical real-time play on an overloaded rendering device.

## Extending and tuning

Change handling values in `src/vehicle/VehicleTuning.ts`. Add timed keyboard phases
in `src/testing/HandlingSuite.ts`, along with a meaningful expected outcome. The
harness in `src/testing/DrivingHarness.ts` runs and frees each physics world.
Rerun the command to inspect trajectory, pressure and yaw before changing thresholds.
Thresholds should express usable behaviour; do not lower a failing directional
check merely to make a test green.

For live debugging, add `?debug=1` to the game URL and inspect
`window.__roadster.snapshot()`. Backtick displays contact, yaw, slip and thrust
diagnostics. The HUD highlights received direction keys and shows actual wheel
steering angle on the road or yaw rate in the air.

Ground controls remain car controls: hold W/Up or S/Down to move while steering
with A/D or Left/Right. A/D at rest turns the wheels; it does not rotate a stationary
car. Air steering controls yaw during a hop. Sustained flight and flips remain a
later milestone.

## Camera-direction regression

`tests/simulation/camera-steering.test.ts` checks the car nose projected through
the actual chase camera, rather than assuming a world-coordinate sign means left.
It covers left/right, four initial headings, both chase distances, and road/air
steering: 32 cases. All 32 failed with the reversed mapping and pass after the
correction. These tests remain independent of the handling suite’s yaw conventions.
