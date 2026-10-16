// Procedural rear end of the Roadster, modeled on the reference shot:
// bronze swept wing, thin red light bar tucked under it, silver rear panel with a small
// "ROSTR" plate, a dark vented panel with four gold exhaust tips over four fan nozzles,
// thin jets on each side and thick smoke. Built from code, so no third-party assets or licenses.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

function plateTexture(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#d4d5d8"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#a9abb0"; g.lineWidth = 6; g.strokeRect(6, 6, 500, 244);
  g.fillStyle = "#7d7f86"; g.font = "bold 118px serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 256, 136);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function smokeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  r.addColorStop(0, "rgba(255,255,255,0.8)");
  r.addColorStop(0.5, "rgba(235,235,240,0.35)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function slab(points, depth, bevel = 0.03) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function buildRear({ plate = "ROSTR" } = {}) {
  const car = new THREE.Group();
  const bodyDark = new THREE.MeshStandardMaterial({ color: 0x1c1d21, metalness: 0.6, roughness: 0.45 });
  const panelDark = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, metalness: 0.4, roughness: 0.7 });
  const silver = new THREE.MeshStandardMaterial({ color: 0x8d9097, metalness: 0.7, roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.22 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xd2ab90, emissive: 0x4a3626, metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide });
  const tire = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9 });

  // Side bodywork and tires
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(slab([[0, 0.5], [0.9, 0.5], [0.8, 2.5], [0.1, 2.7], [-0.1, 1.5]].map(([x, y]) => [x * sx, y]), 1.1), bodyDark);
    side.position.set(sx * 1.55, 0, -0.1); car.add(side);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 40), tire);
    w.rotation.z = Math.PI / 2; w.position.set(sx * 2.4, 0.95, -0.3); car.add(w);
  }

  // Silver rear panel, narrower at the top, with a slight backward lean
  const panel = new THREE.Mesh(slab([[-1.75, 0.0], [1.75, 0.0], [1.6, 0.85], [-1.6, 0.85]], 0.5, 0.05), silver);
  panel.position.set(0, 1.85, 0.0); panel.rotation.x = -0.18; car.add(panel);

  // Dark vented panel under it
  const vent = new THREE.Mesh(slab([[-1.7, 0], [1.7, 0], [1.55, 1.15], [-1.55, 1.15]], 0.6, 0.04), panelDark);
  vent.position.set(0, 0.75, 0.05); car.add(vent);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.7), bodyDark);
  lip.position.set(0, 0.72, 0.1); car.add(lip);

  // Wing: swept planform, bronze, slight pitch, raised tips, two thin struts
  const wingShape = new THREE.Shape();
  wingShape.moveTo(-2.3, 0.6); wingShape.lineTo(2.3, 0.6);
  wingShape.lineTo(1.95, -0.55); wingShape.lineTo(-1.95, -0.55); wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
  wingGeo.rotateX(-Math.PI / 2);
  const wing = new THREE.Mesh(wingGeo, bronze);
  wing.position.set(0, 3.15, -0.3); wing.rotation.x = -0.6; car.add(wing);
  for (const sx of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 1.0), bronze);
    tip.position.set(sx * 2.2, 3.22, -0.1); tip.rotation.z = sx * 0.12; car.add(tip);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.18), panelDark);
    strut.position.set(sx * 0.95, 2.95, -0.1); strut.rotation.z = sx * 0.1; car.add(strut);
  }

  // Red light bar just under the wing, bright core plus soft halo
  const bar = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xff3020 }));
  bar.position.set(0, 2.72, 0.32); car.add(bar);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.25),
    new THREE.MeshBasicMaterial({ color: 0xff1a10, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 2.72, 0.34); car.add(halo);

  // Plate
  const plateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.36),
    new THREE.MeshStandardMaterial({ map: plateTexture(plate), roughness: 0.5 }));
  plateMesh.position.set(0, 2.18, 0.37); plateMesh.rotation.x = -0.18; car.add(plateMesh);

  // Four gold exhaust tips on the vent panel, four fan nozzles below
  for (let i = 0; i < 4; i++) {
    const x = -1.05 + i * 0.7;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 24), gold);
    tip.rotation.x = Math.PI / 2; tip.position.set(x, 1.62, 0.42); car.add(tip);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.04, 12, 32), bodyDark);
    ring.position.set(x, 1.12, 0.38); car.add(ring);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.25, 32), new THREE.MeshStandardMaterial({ color: 0x2a2b30, metalness: 0.7, roughness: 0.5 }));
    fan.position.set(x, 1.12, 0.36); car.add(fan);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16), silver);
    hub.rotation.x = Math.PI / 2; hub.position.set(x, 1.12, 0.4); car.add(hub);
  }

  // Thin side jets: pipe, narrow bright plume
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const plumes = [];
  for (const x of [-1.95, -1.5, 1.5, 1.95]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 12), silver);
    pipe.position.set(x, 0.75, 0.5); car.add(pipe);
    const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.075, 1.1, 14, 1, true), plumeMat);
    plume.position.set(x, 0.0, 0.5); car.add(plume); plumes.push(plume);
  }

  // Dense smoke: lots of big soft puffs low and wide
  const smokeMap = smokeTexture();
  const proto = new THREE.SpriteMaterial({ map: smokeMap, transparent: true, opacity: 0.11, depthWrite: false, color: 0xf2f2f6 });
  const puffs = [];
  for (let i = 0; i < 150; i++) {
    const s = new THREE.Sprite(proto.clone());
    const spread = (Math.random() - 0.5) * 2;
    s.position.set(spread * 6.2, 0.0 + Math.pow(Math.random(), 1.4) * 0.85, 0.1 + Math.random() * 2.2);
    const k = 1.6 + Math.random() * 2.6;
    s.scale.set(k * 1.3, k, 1);
    s.userData = { base: s.position.clone(), phase: Math.random() * 6.28 };
    puffs.push(s); car.add(s);
  }

  car.userData.update = (t) => {
    for (const s of puffs) {
      s.position.y = s.userData.base.y + Math.sin(t * 1.1 + s.userData.phase) * 0.07;
      s.position.x = s.userData.base.x + Math.sin(t * 0.5 + s.userData.phase) * 0.12;
    }
    for (const p of plumes) p.scale.y = 1 + Math.sin(t * 40 + p.position.x) * 0.08;
  };
  return car;
}
