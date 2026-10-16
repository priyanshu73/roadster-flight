// Original procedural NYC-inspired world and dialogue. No downloaded art or recordings.
// Audio: Web Audio synthesis + local browser SpeechSynthesis voices, generated chatter + captions fallback.
import * as T from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { buildRear } from "./rear.js";
document.getElementById("menu").remove();
document.getElementById("hud").remove();
const style = document.createElement("style");
style.textContent = `body{font-family:system-ui;color:#fff}canvas{display:block}#ui{position:fixed;inset:0;pointer-events:none}#brand{position:absolute;top:25px;left:28px}.gold{color:#ffce87;font-size:10px;letter-spacing:3px}h1{font-weight:400;font-size:32px;margin:5px 0}.sub{font-size:12px;color:#d3e0e9}#stats{position:absolute;top:28px;right:28px;text-align:right;font-size:32px}#stats small{font-size:12px}#heat{font-size:12px;color:#ffd290}#controls{position:absolute;bottom:24px;left:28px;font-size:11px;line-height:2;padding:12px 18px;background:#102238d9;border-left:2px solid #ffd290}#dialogue{position:absolute;bottom:120px;left:28px;background:#102238e8;padding:16px 20px;max-width:380px;border-left:3px solid #ffd290;display:none}#dialogue small{display:block;color:#ffd290;font-size:10px;letter-spacing:2px;margin-bottom:6px}#map{position:absolute;bottom:24px;right:28px;border-radius:50%;border:1px solid #a0bec0}#entry{position:fixed;inset:0;background:linear-gradient(90deg,#081b31ee,transparent);padding:14vh 8vw;box-sizing:border-box}#entry h2{font-size:64px;font-weight:400;line-height:1.05;margin:18px 0}#entry p{max-width:350px;font-size:14px;color:#dae5ec;line-height:1.8}button{cursor:pointer;border:0;padding:14px 24px;border-radius:3px;background:#ffd290;color:#152538;font:inherit}#sound{pointer-events:auto;position:absolute;top:110px;right:28px;font-size:10px;padding:7px 10px}#notice{position:absolute;top:142px;left:28px;font-size:12px;color:#ffd290}`;
document.head.append(style);
const ui = document.createElement("div");
ui.id = "ui";
ui.innerHTML = `<div id="brand"><div class="gold">ROADSTER FLIGHT / CITY 01</div><h1>NEW YORK</h1><div class="sub">Harbor district · Golden hour · Fictional city slice</div></div><div id="stats"><span id="speed">0</span> <small>MPH</small><div id="heat">FREE ROAM</div></div><button id="sound">SOUND ON · M</button><div id="notice"></div><div id="dialogue"><small id="speaker"></small><span id="words"></span></div><div id="controls">W A S D / arrows · drive &nbsp; SPACE · boost &nbsp; SHIFT · hop<br>E · talk nearby &nbsp; H · horn &nbsp; C · city view &nbsp; M · mute &nbsp; R · reset</div><canvas id="map" width="170" height="170"></canvas>`;
document.body.append(ui);
const entry = document.createElement("div");
entry.id = "entry";
entry.innerHTML = `<div class="gold">A LITTLE CHAOS. A LOT OF CITY.</div><h2>The city<br>has company.</h2><p>Cabs, corner pizza, bridge traffic and conversations you weren't meant to hear. Look up: a web courier might catch a ride.</p><button id="start">ENTER NEW YORK →</button><p style="font-size:10px">Keyboard + desktop · Stylized prototype · Audio starts on entry</p>`;
document.body.append(entry);
const $ = (id) => document.getElementById(id),
  scene = new T.Scene();
scene.background = new T.Color("#a8c4d4");
scene.fog = new T.Fog("#b6c6cf", 180, 950);
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.prepend(renderer.domElement);
const camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1800);
scene.add(new T.HemisphereLight("#d7edff", "#6a5141", 2));
const sun = new T.DirectionalLight("#ffd2a0", 3);
sun.position.set(-100, 180, 80);
scene.add(sun);
const cube = new T.BoxGeometry(1, 1, 1),
  sphere = new T.SphereGeometry(1, 10, 7),
  mats = new Map();
function mat(c) {
  if (!mats.has(c))
    mats.set(c, new T.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  return mats.get(c);
}
function box(p, x, y, z, w, h, d, c) {
  const m = new T.Mesh(cube, mat(c));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  p.add(m);
  return m;
}
function ball(p, x, y, z, r, c) {
  const m = new T.Mesh(sphere, mat(c));
  m.position.set(x, y, z);
  m.scale.setScalar(r);
  p.add(m);
  return m;
}
function cable(a, b, c = "#6c797e", r = 0.07) {
  const d = new T.Vector3().subVectors(b, a),
    m = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 5), mat(c));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  scene.add(m);
}
let seed = 734;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const solid = [];
function sign(text, w = 13) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 80;
  const g = c.getContext("2d");
  g.fillStyle = "#254e4a";
  g.fillRect(0, 0, 512, 80);
  g.fillStyle = "#ffe5b5";
  g.font = "bold 36px sans-serif";
  g.textAlign = "center";
  g.fillText(text, 256, 53, 500);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(
    new T.PlaneGeometry(w, 2),
    new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }),
  );
}
box(scene, -57, -1.3, -155, 414, 2, 850, "#7b8076");
const water = new T.Mesh(
  new T.PlaneGeometry(1800, 1800, 35, 35),
  new T.MeshStandardMaterial({
    color: "#367b94",
    metalness: 0.5,
    roughness: 0.27,
  }),
);
water.rotation.x = -Math.PI / 2;
water.position.set(110, -2.1, -160);
scene.add(water);
box(scene, 137, 0.1, -155, 18, 0.25, 850, "#b8b09b");
box(scene, 147, -0.5, -155, 4, 3, 850, "#aeac98");
const xs = [-210, -126, -42, 42],
  zs = [-490, -406, -322, -238, -154, -70, 14, 98, 182];
for (const x of xs) {
  box(scene, x, 0.02, -155, 23, 0.1, 850, "#35434e");
  for (let z = -550; z < 260; z += 12)
    box(scene, x, 0.1, z, 0.2, 0.03, 5, "#dfc781");
}
for (const z of zs) {
  box(scene, -57, 0.08, z, 414, 0.1, 22, "#35434e");
  for (let x = -250; x < 145; x += 12)
    box(scene, x, 0.16, z, 5, 0.03, 0.2, "#dfc781");
}
const wc = document.createElement("canvas");
wc.width = 128;
wc.height = 256;
const wg = wc.getContext("2d");
wg.fillStyle = "#bbb5a7";
wg.fillRect(0, 0, 128, 256);
for (let y = 6; y < 256; y += 22)
  for (let x = 8; x < 128; x += 23) {
    wg.fillStyle = rnd() > 0.25 ? "#354c5c" : "#edce8c";
    wg.fillRect(x, y, 11, 14);
  }
const wt = new T.CanvasTexture(wc);
wt.colorSpace = T.SRGBColorSpace;
for (const x of xs)
  for (const z of zs)
    for (let i = -4; i <= 4; i++)
      box(scene, x + i * 2, 0.19, z + 14, 1.2, 0.03, 4.5, "#d9d9cb");
for (let ix = 0; ix < 4; ix++)
  for (let iz = 0; iz < 8; iz++) {
    const x = -168 + ix * 84,
      z = -448 + iz * 84;
    box(scene, x, 0.22, z, 60, 0.4, 60, "#aba99c");
    for (const side of [-1, 1]) {
      const bx = x + side * 15,
        bz = z + side * 9,
        w = 22 + rnd() * 6,
        d = 30 + rnd() * 12,
        h = 18 + rnd() * 65 + (iz < 3 ? rnd() * 45 : 0),
        b = new T.Mesh(
          cube,
          new T.MeshStandardMaterial({
            map: wt,
            color: ["#c1a38b", "#9eaaa9", "#b6aaa0", "#c9b69a"][ix],
            roughness: 0.9,
          }),
        );
      b.position.set(bx, h / 2 + 0.5, bz);
      b.scale.set(w, h, d);
      scene.add(b);
      solid.push({ x: bx, z: bz, w: w / 2 + 1.5, d: d / 2 + 1.5, h });
      box(scene, bx, h + 1, bz, w + 1, 1, d + 1, "#777d7c");
      box(scene, bx, h + 2, bz, 5, 2, 5, "#777d7c");
    }
  }
box(scene, -145, 80, -520, 36, 160, 34, "#9fa7a6");
box(scene, -145, 168, -520, 22, 20, 22, "#adb6b2");
box(scene, -145, 190, -520, 9, 24, 9, "#bdc5bf");
cable(
  new T.Vector3(-145, 202, -520),
  new T.Vector3(-145, 228, -520),
  "#a6b3b6",
  0.7,
);
for (let i = 0; i < 22; i++) {
  const c = ball(
    scene,
    -650 + rnd() * 1300,
    150 + rnd() * 100,
    -700 + rnd() * 900,
    1,
    "#d9dcd7",
  );
  c.scale.set(30 + rnd() * 45, 4 + rnd() * 4, 16 + rnd() * 15);
}
const disc = new T.Mesh(sphere, new T.MeshBasicMaterial({ color: "#ffe7b0" }));
disc.position.set(400, 180, -700);
disc.scale.setScalar(27);
scene.add(disc);
// Short, driveable Brooklyn-inspired harbor crossing.
box(scene, 300, 0.08, -154, 310, 0.8, 22, "#4d5a60");
box(scene, 300, 0.65, -154, 310, 0.6, 2, "#baa88b");
for (const z of [-165, -143]) {
  box(scene, 300, 2, z, 310, 0.3, 0.3, "#697c80");
  for (let x = 150; x < 455; x += 7)
    box(scene, x, 1.2, z, 0.15, 2, 0.15, "#697c80");
}
for (const x of [210, 380]) {
  for (const z of [-166, -142]) {
    box(scene, x, 17, z, 6, 36, 5, "#c4ad8b");
    box(scene, x, 32, z, 10, 3, 7, "#cfb995");
  }
  box(scene, x, 29, -154, 6, 4, 25, "#c4ad8b");
  box(scene, x, 36, -154, 8, 2, 29, "#cfb995");
}
for (const z of [-166, -142]) {
  let prev;
  for (let x = 150; x <= 455; x += 5) {
    const u =
        x < 210 ? (x - 150) / 60 : x < 380 ? (x - 210) / 170 : (455 - x) / 75,
      y = x >= 210 && x <= 380 ? 7 + 28 * (2 * u - 1) ** 2 : 3 + 32 * u,
      p = new T.Vector3(x, y, z);
    if (prev) cable(prev, p, "#4b6068", 0.18);
    if (x % 10 === 0) cable(new T.Vector3(x, 1.4, z), p);
    prev = p;
  }
}
box(scene, 500, -1.3, -155, 90, 2, 260, "#7b8076");
for (let i = 0; i < 10; i++)
  box(scene, 475 + rnd() * 60, 10, -270 + rnd() * 220, 12, 20, 14, "#b5aa98");
const bs = sign("BROOKLYN / HARBOR");
bs.position.set(150, 4, -141);
scene.add(bs);
const dining = [];
for (const [x, z, name, color] of [
  [-27, 58, "CORNER SLICE", "#b46143"],
  [57, -26, "HARBOR COFFEE", "#39786e"],
  [-111, -110, "NOODLE HOUSE", "#b37a4f"],
]) {
  const s = sign(name, 15);
  s.position.set(x, 4, z);
  scene.add(s);
  box(scene, x, 2, z - 1, 17, 4, 1, color);
  box(scene, x, 4.8, z + 2, 18, 0.3, 5, color);
  for (let i = -1; i <= 1; i++) {
    const tx = x + i * 5,
      tz = z + 7;
    box(scene, tx, 1, tz, 2, 0.15, 2, "#d9ae79");
    box(scene, tx, 0.5, tz, 0.2, 1, 0.2, "#3b4b4e");
    for (const dx of [-1.4, 1.4])
      box(scene, tx + dx, 0.6, tz, 0.8, 0.8, 0.8, "#50736b");
    dining.push([tx, tz + 2]);
  }
}
for (const x of [-140, -56, 28, 128])
  for (let z = -490; z < 240; z += 42) {
    box(scene, x, 3, z, 0.16, 6, 0.16, "#3e535d");
    box(scene, x + 0.8, 6, z, 1.8, 0.15, 0.5, "#e5d9b6");
    if (x === 128) {
      box(scene, x, 1, z + 5, 3, 0.3, 1, "#9d805b");
      box(scene, x - 2, 2, z + 14, 0.5, 4, 0.5, "#776349");
      ball(scene, x - 2, 5, z + 14, 2.7, "#7f9a78");
    }
  }
function person(c, mask = false) {
  const g = new T.Group();
  box(g, 0, 1, 0, 0.48, 0.68, 0.28, c);
  ball(g, 0, 1.56, 0, 0.22, mask ? "#e9a84b" : "#c8916b");
  g.userData.legs = [];
  g.userData.arms = [];
  for (const s of [-1, 1]) {
    g.userData.legs.push(box(g, s * 0.14, 0.4, 0, 0.18, 0.75, 0.2, "#2c4151"));
    g.userData.arms.push(box(g, s * 0.34, 1.02, 0, 0.15, 0.65, 0.17, c));
    if (mask) box(g, s * 0.09, 1.59, 0.2, 0.1, 0.06, 0.03, "#a9eeeb");
  }
  return g;
}
const people = [];
for (let i = 0; i < 92; i++) {
  const g = person(
      ["#d79b5b", "#6b8990", "#b35f55", "#577364", "#cfb892"][i % 5],
    ),
    diner = i < 18,
    d = dining[i % 9],
    x = diner ? d[0] + (rnd() - 0.5) * 3 : xs[i % 4] + (i % 2 ? 17 : -17),
    z = diner ? d[1] + rnd() * 2 : -500 + rnd() * 730;
  g.position.set(x, 0.5, z);
  scene.add(g);
  people.push({ g, z, diner, phase: rnd() * 6 });
}
// A small chat group greets the player near the starting block.
for (let i = 0; i < 4; i++) {
  const g = person(["#b35f55", "#6b8990"][i % 2]);
  g.position.set(58, 0.5, 62 + i * 3);
  scene.add(g);
  people.push({ g, z: 62 + i * 3, diner: true, phase: i });
}
function vehicle(c, police = false) {
  const g = new T.Group();
  box(g, 0, 0.8, 0, 2.2, 1, 4.4, c);
  box(g, 0, 1.5, 0, 1.8, 0.65, 2.2, "#304b5e");
  for (const x of [-1.1, 1.1])
    for (const z of [-1.4, 1.4]) {
      const w = new T.Mesh(
        new T.CylinderGeometry(0.4, 0.4, 0.25, 10),
        mat("#20282b"),
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.5, z);
      g.add(w);
    }
  box(g, 0, 0.9, 2.23, 1.6, 0.16, 0.07, "#e8b59a");
  if (c === "#e5b84b") box(g, 0, 1.95, 0, 0.75, 0.25, 0.6, c);
  if (police) {
    box(g, -0.3, 1.95, 0, 0.6, 0.2, 0.5, "#ee5a50");
    box(g, 0.3, 1.95, 0, 0.6, 0.2, 0.5, "#538be9");
  }
  return g;
}
const traffic = [];
for (let i = 0; i < 32; i++) {
  const police = i > 29,
    g = vehicle(
      police
        ? "#e1e7e7"
        : i % 3 === 0
          ? "#e5b84b"
          : ["#627b8b", "#a15c4b", "#c2c0b2"][i % 3],
      police,
    ),
    bridge = i >= 24 && i < 30,
    dir = i % 2 ? 1 : -1;
  g.position.set(
    bridge ? 170 + (i - 24) * 44 : xs[i % 4] + dir * 5,
    0.45,
    bridge ? (dir > 0 ? -159 : -149) : -500 + rnd() * 700,
  );
  g.rotation.y = bridge ? Math.PI / 2 : dir > 0 ? 0 : Math.PI;
  scene.add(g);
  traffic.push({ g, police, bridge, dir, speed: 8 + rnd() * 5 });
}
const car = buildRear();
car.scale.setScalar(0.52);
car.position.set(42, 0.4, 72);
scene.add(car);
box(car, 0, 1.1, -2, 3.9, 1.25, 4.2, "#8d9397");
box(car, 0, 1.9, -2.4, 3, 0.65, 1.8, "#283f4e");
for (const x of [-2.1, 2.1]) {
  const w = new T.Mesh(
    new T.CylinderGeometry(0.78, 0.78, 0.55, 20),
    mat("#141b20"),
  );
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.85, -3.2);
  car.add(w);
}
const courier = person("#e5a13e", true);
courier.scale.setScalar(1.2);
scene.add(courier);
const web = new T.Line(
  new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
  new T.LineBasicMaterial({ color: "#e2f6ef" }),
);
scene.add(web);
let active = false,
  overview = false,
  speed = 0,
  heading = 0,
  vy = 0,
  heat = 0,
  lastHit = -2,
  talkAt = 0,
  voiceId = 0,
  muted = false,
  time = 0;
const keys = new Set(),
  state = {};
window.__nyc = state;
let audio, master, engine, filter;
function audioStart() {
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    master = audio.createGain();
    master.gain.value = 0.3;
    master.connect(audio.destination);
    const b = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = audio.createBufferSource();
    n.buffer = b;
    n.loop = true;
    filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 550;
    const gain = audio.createGain();
    gain.gain.value = 0.06;
    n.connect(filter).connect(gain).connect(master);
    n.start();
    engine = audio.createOscillator();
    engine.type = "sawtooth";
    const eg = audio.createGain();
    eg.gain.value = 0.013;
    engine.connect(eg).connect(master);
    engine.frequency.value = 48;
    engine.start();
  } catch (e) {
    say("AUDIO", "Sound unavailable. Captions remain on.", false);
  }
}
function tone(f, d = 0.2, v = 0.15) {
  if (!audio || muted) return;
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.type = "triangle";
  o.frequency.value = f;
  o.connect(g).connect(master);
  g.gain.setValueAtTime(v, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d);
  o.start();
  o.stop(audio.currentTime + d);
}
function mute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.3;
  if (muted) window.speechSynthesis?.cancel();
  $("sound").textContent = muted ? "SOUND OFF · M" : "SOUND ON · M";
}
$("sound").onclick = mute;
const dialogue = [
  ["PIZZA COUNTER", "Two slices and a view. That is the special."],
  ["LOCAL", "Hey, is that thing street legal?"],
  ["COMMUTER", "If it flies, can it skip the bridge traffic?"],
  ["COFFEE QUEUE", "I asked for oat milk, not a rocket launch."],
  ["LOCAL", "That sunset almost makes the rent worth it."],
  ["VISITOR", "Is this the way to Brooklyn?"],
  ["DELIVERY RIDER", "Bike lane! Watch the bike lane!"],
  ["DINER", "Best slice in the city. I will defend that."],
  ["LOCAL", "Only in New York. Seriously."],
  ["COMMUTER", "My train is delayed. Can I get a lift?"],
  ["LOCAL", "The guy on the rooftops? Yeah, he lives around here."],
];
function say(who, text, speak = true) {
  $("speaker").textContent = who;
  $("words").textContent = text;
  $("dialogue").style.display = "block";
  clearTimeout(say.timer);
  say.timer = setTimeout(() => ($("dialogue").style.display = "none"), 6000);
  if (speak && !muted && "speechSynthesis" in window) {
    speechSynthesis.cancel();
    const voices = speechSynthesis
      .getVoices()
      .filter((v) => v.localService && v.lang.startsWith("en"));
    if (!voices.length) {
      for (let i = 0; i < 7; i++)
        setTimeout(() => tone(180 + (i % 3) * 95, 0.08, 0.045), i * 115);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voices[voiceId++ % voices.length];
    u.rate = 1.03;
    u.volume = 0.65;
    speechSynthesis.speak(u);
  }
}
function talk() {
  if (people.some((p) => p.g.position.distanceTo(car.position) < 30))
    say(...dialogue[Math.floor(Math.random() * dialogue.length)]);
  else say("CITY", "Get closer to a sidewalk or a cafe to hear people.", false);
  talkAt = time;
}
function reset() {
  car.position.set(42, 0.4, 72);
  speed = 0;
  heading = 0;
  vy = 0;
  heat = 0;
  restartRun();
}
addEventListener("keydown", (e) => {
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  keys.add(e.code);
  if (!active || e.repeat) return;
  if (e.code === "KeyE") talk();
  if (e.code === "KeyM") mute();
  if (e.code === "KeyC") overview = !overview;
  if (e.code === "KeyR") reset();
  if (e.code === "KeyH") {
    tone(340, 0.3);
    tone(440, 0.25, 0.1);
    say("LOCAL", "Alright, alright! We heard you!", false);
  }
  if (e.code.startsWith("Shift") && car.position.y < 0.5) vy = 11;
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());
$("start").onclick = () => {
  entry.remove();
  active = true;
  audioStart();
  say(
    "HARBOR RADIO",
    "Welcome to the neighborhood. E to talk, C for the skyline.",
    false,
  );
};
const map = $("map").getContext("2d");
function drawMap() {
  map.clearRect(0, 0, 170, 170);
  map.save();
  map.beginPath();
  map.arc(85, 85, 84, 0, Math.PI * 2);
  map.clip();
  map.fillStyle = "#174354";
  map.fillRect(0, 0, 170, 170);
  map.fillStyle = "#53605f";
  map.fillRect(12, 0, 91, 170);
  map.strokeStyle = "#a6a394";
  map.lineWidth = 2;
  for (const x of xs) {
    map.beginPath();
    map.moveTo(12 + (x + 264) * 0.22, 0);
    map.lineTo(12 + (x + 264) * 0.22, 170);
    map.stroke();
  }
  for (const z of zs) {
    map.beginPath();
    map.moveTo(12, (z + 580) * 0.2);
    map.lineTo(103, (z + 580) * 0.2);
    map.stroke();
  }
  map.fillStyle = "#c6b394";
  map.fillRect(103, 84, 55, 3);
  map.translate(
    12 + (car.position.x + 264) * 0.22,
    (car.position.z + 580) * 0.2,
  );
  map.rotate(-heading);
  map.fillStyle = "#ffd18c";
  map.beginPath();
  map.moveTo(0, -5);
  map.lineTo(-3, 4);
  map.lineTo(3, 4);
  map.fill();
  map.restore();
}
function update(t, dt) {
  if (active && !HC.over) {
    const throttle =
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
        (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0),
      boost = keys.has("Space"),
      turn =
        (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) -
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
    speed += throttle * (boost ? 32 : 17) * dt;
    speed *= Math.exp(-(throttle ? 0.3 : 1.3) * dt);
    speed = T.MathUtils.clamp(speed, -12, boost ? 52 : 30);
    heading +=
      turn *
      1.5 *
      dt *
      Math.min(1, Math.abs(speed) / 6) *
      Math.sign(speed || 1);
    const old = car.position.clone();
    car.position.x -= Math.sin(heading) * speed * dt;
    car.position.z -= Math.cos(heading) * speed * dt;
    vy -= 22 * dt;
    car.position.y = Math.max(0.4, car.position.y + vy * dt);
    if (car.position.y === 0.4) vy = 0;
    const x = car.position.x,
      z = car.position.z,
      onLand = x > -260 && x < 140 && z > -575 && z < 265,
      onBridge = x >= 140 && x < 455 && Math.abs(z + 154) < 10,
      farLand = x >= 455 && x < 545 && z > -285 && z < -25,
      blocked = solid.some(
        (b) =>
          car.position.y < b.h &&
          Math.abs(x - b.x) < b.w &&
          Math.abs(z - b.z) < b.d,
      );
    if (blocked || (!onLand && !onBridge && !farLand)) {
      car.position.x = old.x;
      car.position.z = old.z;
      if (blocked && Math.abs(speed) > 9) crime("BUILDING CRASH", 2);
      speed *= -0.25;
      if (t - lastHit > 2) {
        say(
          "DRIVER",
          blocked
            ? "Easy on the bodywork. Stay on the street."
            : "Harbor edge. Find the bridge, not the water.",
          false,
        );
        lastHit = t;
      }
    }
    car.rotation.y = heading;
    car.rotation.z = T.MathUtils.lerp(
      car.rotation.z,
      -turn * speed * 0.002,
      0.12,
    );
    car.userData.update(t);
    for (const v of traffic)
      if (
        v.g.position.distanceTo(car.position) < 2.7 &&
        car.position.y < 2 &&
        t - lastHit > 1
      ) {
        speed *= -0.3;
        crime("TRAFFIC COLLISION", 2);
        lastHit = t;
        tone(95, 0.12, 0.2);
        say("TRAFFIC", "Watch it! Patrol spotted the collision.", false);
      }
    heatTick(t, dt);
    hcWorld(t, dt);
    if (t - talkAt > 12) talk();
    if (audio && engine) {
      engine.frequency.setTargetAtTime(
        45 + Math.abs(speed) * 4,
        audio.currentTime,
        0.1,
      );
      filter.frequency.setTargetAtTime(
        400 + Math.abs(speed) * 22,
        audio.currentTime,
        0.1,
      );
    }
    if (Math.floor(t / 6) !== Math.floor((t - dt) / 6))
      tone(280 + Math.random() * 180, 0.16, 0.07);
  }
  for (const p of people) {
    if (p.fly) { flyPed(p, dt); continue; }
    if (!p.diner) {
      p.g.position.z = p.z + Math.sin(t * 0.035 + p.phase) * 28;
      const walk = t * 6 + p.phase;
      p.g.userData.legs.forEach(
        (l, i) => (l.rotation.x = Math.sin(walk + i * Math.PI) * 0.4),
      );
      p.g.userData.arms.forEach(
        (a, i) => (a.rotation.x = -Math.sin(walk + i * Math.PI) * 0.3),
      );
      p.g.rotation.y = Math.cos(t * 0.035 + p.phase) > 0 ? 0 : Math.PI;
    } else p.g.rotation.y = Math.sin(t * 0.3 + p.phase) * 0.3;
  }
  for (const v of traffic) {
    if (false && v.g.position.distanceTo(car.position) < 170) {
      const d = car.position.clone().sub(v.g.position);
      d.y = 0;
      v.g.rotation.y = Math.atan2(d.x, d.z);
      v.g.position.addScaledVector(d.normalize(), (6 + heat * 4) * dt);
    } else if (v.bridge) {
      v.g.position.x += v.dir * v.speed * dt;
      if (v.g.position.x > 450) v.g.position.x = 155;
      if (v.g.position.x < 155) v.g.position.x = 450;
      v.g.rotation.y = v.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      v.g.position.z += v.dir * v.speed * dt;
      if (v.g.position.z > 250) v.g.position.z = -550;
      if (v.g.position.z < -550) v.g.position.z = 250;
    }
  }
  const cycle = t % 24,
    perched = active && cycle >= 10 && cycle < 15;
  if (perched) {
    courier.position.copy(car.position).add(new T.Vector3(0, 1.1, 0));
    courier.rotation.set(0, heading, 0);
    web.visible = false;
    if (!state.perched)
      say("WEB COURIER", "Mind if I ride for a block? My arms are killing me.");
  } else {
    const p = (cycle / 10) * Math.PI * 2;
    courier.position.set(
      42 + Math.sin(p) * 9,
      17 + Math.cos(p * 2) * 10,
      -30 + Math.cos(p) * 55,
    );
    courier.rotation.set(0, t * 0.3, Math.sin(p) * 0.6);
    web.visible = true;
    const arr = web.geometry.attributes.position;
    arr.setXYZ(
      0,
      courier.position.x,
      courier.position.y + 1.4,
      courier.position.z,
    );
    arr.setXYZ(1, 12, 65, courier.position.z - 15);
    arr.needsUpdate = true;
  }
  courier.userData.arms.forEach(
    (a, i) => (a.rotation.z = perched ? (i ? -0.4 : 0.4) : i ? -2.7 : 0.2),
  );
  state.perched = perched;
  let target = overview
    ? new T.Vector3(350, 260, 310)
    : new T.Vector3(
        car.position.x + Math.sin(heading) * 12,
        car.position.y + 6,
        car.position.z + Math.cos(heading) * 12,
      );
  if (!active) target.set(100, 33, 123);
  camera.position.lerp(target, 1 - Math.exp(-dt * 5));
  camera.lookAt(
    overview
      ? new T.Vector3(20, 10, -140)
      : active
        ? car.position
            .clone()
            .add(
              new T.Vector3(
                -Math.sin(heading) * 8,
                1.2,
                -Math.cos(heading) * 8,
              ),
            )
        : new T.Vector3(0, 6, -60),
  );
  const wp = water.geometry.attributes.position;
  for (let i = 0; i < wp.count; i++)
    wp.setZ(
      i,
      Math.sin(wp.getX(i) * 0.025 + t * 0.7) * 0.2 +
        Math.cos(wp.getY(i) * 0.03 + t) * 0.17,
    );
  wp.needsUpdate = true;
  $("speed").textContent = Math.round(Math.abs(speed) * 2.237);
  $("heat").textContent = hudHeat();
  $("notice").textContent = perched
    ? "ROOFTOP VISITOR · Hitching a ride"
    : overview
      ? "CITY VIEW · C to return"
      : "";
  drawMap();
  drawCops();
  hcFx(t, dt);
  Object.assign(state, {
    ready: true,
    time: t,
    speed,
    heat,
    ...heatState(),
    position: { x: car.position.x, y: car.position.y, z: car.position.z },
    pedestrians: people.length,
    traffic: traffic.length,
    audioState: audio?.state || "not started",
    voices:
      window.speechSynthesis
        ?.getVoices()
        .filter((v) => v.localService && v.lang.startsWith("en")).length || 0,
  });
}
// ===== HEAT CLOCK: crime -> wanted level -> survival timer is the score =====
const HC = { chase: false, over: false, clock: 0, level: 0, peak: 0, busted: 0, cool: 0, dist: 0, smashes: 0, hits: 0, crimes: 0, crimeAcc: 0, nextEsc: 25, spawnAt: 0, best: 0 };
try { HC.best = Number(localStorage.getItem("heatclock.best") || 0); } catch (e) {}
const hcStyle = document.createElement("style");
hcStyle.textContent = `#hc{position:fixed;top:14px;left:50%;transform:translateX(-50%);text-align:center;font-family:system-ui;color:#fff;pointer-events:none;text-shadow:0 2px 8px #000a}#hc .lab{font-size:11px;letter-spacing:4px;color:#ffce87}#hc .big{font-size:44px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.05}#hc .stars{font-size:20px;color:#ff5a4f;letter-spacing:3px;min-height:24px}#hc .bar{width:220px;height:7px;margin:5px auto 0;background:#0007;border-radius:4px;overflow:hidden;display:none}#hc .bar i{display:block;height:100%;width:0}#hcb i{background:linear-gradient(90deg,#ff5a4f,#5a8bff)}#hcc i{background:#7df9ff}#hc .sm{font-size:11px;color:#dfe9ee;margin-top:4px}#hcban{position:fixed;top:30%;left:50%;transform:translateX(-50%);font:800 30px system-ui;letter-spacing:3px;color:#fff;text-shadow:0 3px 14px #000;pointer-events:none;opacity:0;transition:opacity .25s;text-align:center}#hcover{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(10,4,6,.8);color:#fff;font-family:system-ui;text-align:center}#hcover h2{font-size:54px;letter-spacing:6px;margin:0;color:#ff5a4f}#hcover .t{font-size:72px;font-weight:800;font-variant-numeric:tabular-nums}#hcover .g{color:#ffce87;letter-spacing:4px;font-size:12px}#hcover table{margin:14px auto;font-size:15px;border-spacing:18px 4px}#hcover button{margin-top:10px;padding:12px 34px;font-size:16px;border:1px solid #ffce87;background:transparent;color:#ffce87;cursor:pointer;letter-spacing:3px}#hcover button:hover{background:#ffce87;color:#111}`;
document.head.append(hcStyle);
const hcUi = document.createElement("div");
hcUi.id = "hc";
hcUi.innerHTML = `<div class="lab">HEAT CLOCK</div><div class="big" id="hct">0:00.0</div><div class="stars" id="hcs"></div><div class="bar" id="hcb"><i></i></div><div class="bar" id="hcc"><i></i></div><div class="sm" id="hcm"></div>`;
document.body.append(hcUi);
const hcBan = document.createElement("div");
hcBan.id = "hcban";
document.body.append(hcBan);
const hcOver = document.createElement("div");
hcOver.id = "hcover";
document.body.append(hcOver);
function fmt(s) { const m = Math.floor(s / 60); return m + ":" + (s - m * 60).toFixed(1).padStart(4, "0"); }
function banner(text) {
  hcBan.textContent = text;
  hcBan.style.opacity = 1;
  clearTimeout(banner.t);
  banner.t = setTimeout(() => (hcBan.style.opacity = 0), 1400);
}
const gb = new T.BoxGeometry(1, 1, 1), cyl = new T.CylinderGeometry(0.5, 0.5, 1, 10), cone = new T.ConeGeometry(0.4, 1, 8);
const gmat = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const glassMat = gmat("#9fd6e8", { transparent: true, opacity: 0.4, metalness: 0.3, roughness: 0.1 });
const debrisMat = gmat("#c9c9c0");
const props = [];
function addProp(kind, x, z) {
  const g = new T.Group();
  let r = 1;
  if (kind === "cone") { const m = new T.Mesh(cone, gmat("#ff7a1a")); m.scale.set(1, 0.9, 1); m.position.y = 0.45; g.add(m); r = 0.9; }
  if (kind === "hydrant") { const m = new T.Mesh(cyl, gmat("#d2362e")); m.scale.set(0.6, 0.9, 0.6); m.position.y = 0.45; g.add(m); r = 0.9; }
  if (kind === "bin") { const m = new T.Mesh(cyl, gmat("#33403f")); m.scale.set(0.9, 1.1, 0.9); m.position.y = 0.55; g.add(m); r = 1; }
  if (kind === "glass") {
    for (const [px, pz, sx, sz] of [[0, -1.8, 0.1, 3.6], [0, 1.8, 0.1, 3.6]]) { const m = new T.Mesh(gb, glassMat); m.scale.set(sx, 2.6, sz); m.position.set(px, 1.5, pz * 0.5); g.add(m); }
    const roof = new T.Mesh(gb, gmat("#3b4b4e")); roof.scale.set(1.8, 0.12, 3.8); roof.position.y = 2.85; g.add(roof);
    r = 2.2;
  }
  g.position.set(x, 0.1, z);
  scene.add(g);
  props.push({ g, kind, r, x, z, dead: false });
}
for (const x of xs) for (const side of [-1, 1]) for (let z = -530; z < 240; z += 17) {
  if (zs.some((q) => Math.abs(z - q) < 14)) continue;
  const q = rnd();
  if (q < 0.1) addProp("cone", x + side * 11.2, z);
  else if (q < 0.16) addProp("hydrant", x + side * 12, z);
  else if (q < 0.22) addProp("bin", x + side * 12.2, z);
  else if (q < 0.27) addProp("glass", x + side * 12.6, z);
}
const shards = [];
for (let i = 0; i < 90; i++) { const m = new T.Mesh(gb, glassMat); m.visible = false; m.userData.v = new T.Vector3(); scene.add(m); shards.push(m); }
function burst(x, y, z, mat, n, power) {
  let k = 0;
  for (const m of shards) if (!m.visible && k < n) {
    k++; m.visible = true; m.material = mat; m.scale.setScalar(0.12 + Math.random() * 0.25);
    m.position.set(x, y, z);
    m.userData.v.set((Math.random() - 0.5) * power, 3 + Math.random() * power * 0.6, (Math.random() - 0.5) * power);
    m.userData.life = 1.6;
  }
}
function crime(label, w) {
  if (HC.over || time - crime.t < 0.3) return;
  crime.t = time;
  HC.crimes++;
  HC.cool = 0;
  if (!HC.chase) {
    HC.chase = true; HC.clock = 0; HC.level = 1; HC.peak = 1; HC.nextEsc = 25; HC.crimeAcc = 0;
    banner("HEAT CLOCK STARTED");
  } else {
    banner(label);
    HC.crimeAcc += w;
    if (HC.crimeAcc >= 8 && HC.level < 5) { HC.crimeAcc -= 8; HC.level++; HC.peak = Math.max(HC.peak, HC.level); banner("HEAT LEVEL " + HC.level); }
  }
  say("DISPATCH", label + ". All units respond.", false);
  tone(220, 0.25, 0.15);
}
crime.t = -9;
function smashProp(p) {
  p.dead = true; p.g.visible = false; HC.smashes++;
  const glass = p.kind === "glass";
  burst(p.x, 1.4, p.z, glass ? glassMat : debrisMat, glass ? 28 : 12, glass ? 9 : 7);
  tone(glass ? 900 : 140, glass ? 0.3 : 0.15, 0.2);
  crime(glass ? "GLASS SMASHED" : p.kind === "hydrant" ? "HYDRANT HIT" : p.kind === "bin" ? "TRASH CAN HIT" : "CONE DOWN", glass ? 2 : p.kind === "cone" ? 0.5 : 1.2);
}
// Cop pool: patrol, interceptor, SUV + chopper
const cops = [];
const COPSPEC = { patrol: { c: "#e1e7e7", sp: 25, turn: 2.2, sc: 1 }, interceptor: { c: "#1d2428", sp: 31, turn: 2.8, sc: 1 }, suv: { c: "#2b3d66", sp: 22, turn: 1.7, sc: 1.25 } };
const copMat = [gmat("#ff2a2a", { emissive: "#ff2a2a", emissiveIntensity: 2 }), gmat("#2a5aff", { emissive: "#2a5aff", emissiveIntensity: 2 })];
for (let i = 0; i < 9; i++) {
  const kind = i % 3 === 0 ? "patrol" : i % 3 === 1 ? "interceptor" : "suv", spec = COPSPEC[kind];
  const g = vehicle(spec.c, true);
  g.scale.setScalar(spec.sc);
  const a = new T.Mesh(gb, copMat[0]), b = new T.Mesh(gb, copMat[1]);
  a.scale.set(0.6, 0.25, 0.5); b.scale.copy(a.scale); a.position.set(-0.3, 2.2, 0); b.position.set(0.3, 2.2, 0);
  g.add(a, b);
  g.position.set(0, -200, 0);
  scene.add(g);
  cops.push({ g, kind, spec, active: false, ang: 0, v: 0, a, b });
}
const chopper = new T.Group();
{ const body = new T.Mesh(gb, gmat("#161b1e")); body.scale.set(2.2, 1.6, 5); chopper.add(body);
  const tail = new T.Mesh(gb, gmat("#161b1e")); tail.scale.set(0.4, 0.4, 5); tail.position.z = -4.5; chopper.add(tail);
  const rotor = new T.Mesh(gb, gmat("#aaa")); rotor.scale.set(9, 0.08, 0.5); rotor.position.y = 1.1; chopper.add(rotor); chopper.userData.rotor = rotor;
  const beam = new T.Mesh(new T.ConeGeometry(7, 26, 16, 1, true), new T.MeshBasicMaterial({ color: "#fff6cf", transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false }));
  beam.position.y = -13; chopper.add(beam); }
chopper.position.set(0, -200, 0);
scene.add(chopper);
let siren, sirenGain;
function hcSiren(on, near) {
  if (!audio) return;
  if (!siren) {
    siren = audio.createOscillator(); siren.type = "square"; sirenGain = audio.createGain(); sirenGain.gain.value = 0;
    siren.connect(sirenGain).connect(master); siren.start();
  }
  siren.frequency.setTargetAtTime(760 + Math.sin(time * 7) * 260, audio.currentTime, 0.03);
  sirenGain.gain.setTargetAtTime(on && !muted ? 0.008 + 0.012 * near : 0, audio.currentTime, 0.2);
}
function inSolid(x, z, y) { return solid.some((b) => y < b.h && Math.abs(x - b.x) < b.w && Math.abs(z - b.z) < b.d); }
function landOk(x, z) { return (x > -258 && x < 138 && z > -573 && z < 263) || (x >= 138 && x < 455 && Math.abs(z + 154) < 10); }
function spawnCop(c) {
  for (let tries = 0; tries < 12; tries++) {
    const ax = xs[Math.floor(Math.random() * 4)] + (Math.random() - 0.5) * 8, az = car.position.z + (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 60);
    const x = Math.random() < 0.5 ? ax : car.position.x + (Math.random() - 0.5) * 100, z = Math.random() < 0.5 ? az : zs[Math.floor(Math.random() * zs.length)];
    if (!landOk(x, z) || Math.hypot(x - car.position.x, z - car.position.z) < 70 || inSolid(x, z, 1)) continue;
    c.g.position.set(x, 0.45, z); c.ang = Math.atan2(car.position.x - x, car.position.z - z); c.v = 8; c.active = true; return;
  }
}
function heatTick(t, dt) {
  if (HC.over || !HC.chase) return;
  HC.clock += dt; HC.dist += Math.abs(speed) * dt;
  if (HC.clock >= HC.nextEsc && HC.level < 5) { HC.level++; HC.peak = Math.max(HC.peak, HC.level); HC.nextEsc += 25; banner("HEAT LEVEL " + HC.level); tone(300, 0.3, 0.12); }
  heat = HC.level;
  const want = [0, 2, 3, 5, 7, 9][HC.level];
  let nAct = cops.filter((c) => c.active).length;
  if (nAct < want && t > HC.spawnAt) { const c = cops.find((k) => !k.active); if (c) { spawnCop(c); HC.spawnAt = t + 1.2; } }
  let near = 0, nearest = 999;
  const cp = car.position;
  for (const c of cops) {
    if (!c.active) continue;
    const p = c.g.position;
    if (c.g.position.y < 0) continue;
    const lead = c.kind === "interceptor" ? 0.7 : 0.3;
    const tx = cp.x - Math.sin(heading) * speed * lead, tz = cp.z - Math.cos(heading) * speed * lead;
    let want2 = Math.atan2(tx - p.x, tz - p.z), da = want2 - c.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.ang += Math.max(-c.spec.turn * dt, Math.min(c.spec.turn * dt, da));
    const d = Math.hypot(cp.x - p.x, cp.z - p.z);
    const top = c.spec.sp * (1 + 0.04 * HC.level);
    c.v += (Math.min(top, d < 8 ? Math.max(speed, 10) + 3 : top) - c.v) * Math.min(1, dt * 1.2);
    const nx = p.x + Math.sin(c.ang) * c.v * dt, nz = p.z + Math.cos(c.ang) * c.v * dt;
    if (landOk(nx, nz) && !inSolid(nx, nz, 1)) { p.x = nx; p.z = nz; }
    else if (landOk(nx, p.z) && !inSolid(nx, p.z, 1)) p.x = nx;
    else if (landOk(p.x, nz) && !inSolid(p.x, nz, 1)) p.z = nz;
    else c.v *= 0.5;
    c.g.rotation.y = c.ang;
    const f = Math.floor(t * 8) % 2;
    c.a.visible = f === 0; c.b.visible = f === 1;
    if (d < nearest) nearest = d;
    if (d < 7 && cp.y < 3) near++;
    if (c.kind === "suv" && d < 3.4) { speed *= 1 - dt * 2.2; }
    if (d > 260) { c.active = false; p.y = -200; }
  }
  let chop = 0;
  if (HC.level >= 4) {
    if (chopper.position.y < 0) chopper.position.set(cp.x + 60, 30, cp.z + 60);
    const tx = cp.x + Math.sin(t * 0.4) * 10, tz = cp.z + Math.cos(t * 0.4) * 10;
    chopper.position.x += (tx - chopper.position.x) * Math.min(1, dt * 0.9);
    chopper.position.z += (tz - chopper.position.z) * Math.min(1, dt * 0.9);
    chopper.position.y = 28 + Math.sin(t) * 1.5;
    chopper.rotation.y = Math.atan2(cp.x - chopper.position.x, cp.z - chopper.position.z);
    chopper.userData.rotor.rotation.y = t * 30;
    if (Math.hypot(cp.x - chopper.position.x, cp.z - chopper.position.z) < 14) chop = 1;
  } else chopper.position.y = -200;
  if (nearest > 75 && !chop) HC.cool += dt; else HC.cool = Math.max(0, HC.cool - dt * 2);
  if (HC.cool > 9) { HC.cool = 0; if (HC.level > 1) { HC.level--; HC.nextEsc = HC.clock + 25; banner("LOST THEM - HEAT " + HC.level); } else banner("STAY OUT OF SIGHT"); }
  const rate = near * 0.2 * (Math.abs(speed) < 8 ? 1.7 : 1) + chop * 0.12;
  HC.busted = Math.max(0, Math.min(1, HC.busted + (rate ? rate * dt : -dt * 0.35)));
  hcSiren(true, Math.max(0, 1 - nearest / 150));
  if (HC.busted >= 1) gameOver();
}
function gameOver() {
  HC.over = true; speed = 0; hcSiren(false, 0);
  const isBest = HC.clock > HC.best;
  if (isBest) { HC.best = HC.clock; try { localStorage.setItem("heatclock.best", String(HC.clock)); } catch (e) {} }
  hcOver.innerHTML = `<div class="g">BUSTED</div><h2>CAUGHT</h2><div class="g" style="margin-top:14px">YOUR HEAT CLOCK</div><div class="t">${fmt(HC.clock)}</div>${isBest ? '<div class="g" style="color:#7df9ff">NEW BEST</div>' : ""}<table><tr><td>Best</td><td>${fmt(HC.best)}</td></tr><tr><td>Distance</td><td>${(HC.dist / 1000).toFixed(2)} km</td></tr><tr><td>Peak heat</td><td>${"★".repeat(HC.peak)}</td></tr><tr><td>Smashed</td><td>${HC.smashes}</td></tr><tr><td>People hit</td><td>${HC.hits}</td></tr></table><button id="hcre">RUN IT BACK  ·  ENTER</button>`;
  hcOver.style.display = "flex";
  $("hcre").onclick = () => reset();
  tone(120, 0.6, 0.25);
}
function restartRun() {
  Object.assign(HC, { chase: false, over: false, clock: 0, level: 0, peak: 0, busted: 0, cool: 0, dist: 0, smashes: 0, hits: 0, crimes: 0, crimeAcc: 0, nextEsc: 25 });
  for (const c of cops) { c.active = false; c.g.position.y = -200; }
  chopper.position.y = -200;
  for (const p of props) { p.dead = false; p.g.visible = true; }
  for (const s of shards) s.visible = false;
  for (const p of people) if (p.fly) { p.fly = null; p.g.rotation.x = 0; p.g.position.y = 0.5; }
  hcOver.style.display = "none";
  hcSiren(false, 0);
}
function hcWorld(t, dt) {
  if (!active || HC.over) return;
  const cp = car.position;
  if (cp.y < 2.5) {
    for (const p of props) if (!p.dead && Math.hypot(cp.x - p.x, cp.z - p.z) < p.r + 1.1 && Math.abs(speed) > 2) smashProp(p);
    for (const p of people) {
      if (p.fly) continue;
      const q = p.g.position;
      if (Math.abs(q.x - cp.x) < 2 && Math.abs(q.z - cp.z) < 2 && Math.hypot(q.x - cp.x, q.z - cp.z) < 1.9 && Math.abs(speed) > 2.5) {
        p.fly = { vx: -Math.sin(heading) * speed * 0.9, vy: 6 + Math.abs(speed) * 0.2, vz: -Math.cos(heading) * speed * 0.9, spin: 6 };
        HC.hits++; HC.smashes++;
        crime("PEDESTRIAN HIT", 3);
      }
    }
  }
}
function flyPed(p, dt) {
  const f = p.fly, q = p.g.position;
  q.x += f.vx * dt; q.z += f.vz * dt; q.y += f.vy * dt; f.vy -= 25 * dt;
  if (q.y <= 0.5) { q.y = 0.5; f.vx *= 0.9; f.vz *= 0.9; f.vy = 0; f.spin = 0; p.g.rotation.x = -1.45; }
  else p.g.rotation.x += f.spin * dt;
}
function hcFx(t, dt) {
  for (const m of shards) if (m.visible) {
    const v = m.userData.v; v.y -= 22 * dt;
    m.position.addScaledVector(v, dt);
    m.rotation.x += dt * 8;
    if ((m.userData.life -= dt) < 0 || m.position.y < 0) m.visible = false;
  }
  const lab = HC.over ? "CAUGHT" : HC.chase ? "" : "";
  $("hct").textContent = fmt(HC.clock);
  $("hcs").textContent = HC.chase ? "★".repeat(HC.level) + "☆".repeat(5 - HC.level) : "";
  const bb = $("hcb"), cb = $("hcc");
  bb.style.display = HC.chase ? "block" : "none"; bb.firstChild.style.width = HC.busted * 100 + "%";
  cb.style.display = HC.chase && HC.cool > 0.3 ? "block" : "none"; cb.firstChild.style.width = Math.min(100, HC.cool / 9 * 100) + "%";
  $("hcm").textContent = HC.chase ? `BEST ${fmt(HC.best)} · ${HC.smashes} smashed · ${(HC.dist / 1000).toFixed(2)} km${HC.cool > 0.3 ? " · LOSING THEM" : ""}` : `BEST ${fmt(HC.best)} · smash, crash or run someone over to start the clock`;
}
function hudHeat() { return HC.chase ? "★".repeat(HC.level) + " HEAT " + HC.level : "FREE ROAM"; }
function drawCops() {
  map.save();
  for (const c of cops) if (c.active) {
    const x = 12 + (c.g.position.x + 264) * 0.22, y = (c.g.position.z + 580) * 0.2;
    if (Math.hypot(x - 85, y - 85) > 80) continue;
    map.fillStyle = Math.floor(time * 6) % 2 ? "#ff4a4a" : "#4a7bff";
    map.fillRect(x - 2, y - 2, 4, 4);
  }
  map.restore();
}
function heatState() { return { hc: { chase: HC.chase, over: HC.over, clock: HC.clock, level: HC.level, busted: HC.busted, smashes: HC.smashes, hits: HC.hits, best: HC.best, cops: cops.filter((c) => c.active).length, props: props.length } }; }
addEventListener("keydown", (e) => { if (e.code === "Enter" && HC.over) reset(); });
window.__hc = { HC, crime, props, cops, people, car, gameOver };

// Batch static streets and dynamic pedestrian/vehicle boxes to keep draw calls bounded.
const batches = [];
for (const dynamic of [false, true]) {
  const groups = new Map();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (o.isMesh && o.geometry === cube && (o.parent !== scene) === dynamic) {
      if (!groups.has(o.material)) groups.set(o.material, []);
      groups.get(o.material).push(o);
    }
  });
  for (const [material, items] of groups) {
    const inst = new T.InstancedMesh(cube, material, items.length);
    inst.frustumCulled = false;
    items.forEach((o, i) => {
      inst.setMatrixAt(i, o.matrixWorld);
      o.visible = false;
    });
    scene.add(inst);
    if (dynamic) batches.push({ inst, items });
  }
}
function syncBatches() {
  scene.updateMatrixWorld(true);
  for (const { inst, items } of batches) {
    items.forEach((o, i) => inst.setMatrixAt(i, o.matrixWorld));
    inst.instanceMatrix.needsUpdate = true;
  }
}
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  time += dt;
  update(time, dt);
  syncBatches();
  renderer.render(scene, camera);
});
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
