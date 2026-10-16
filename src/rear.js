// Procedural rear end of the Roadster, modeled on the reference shot:
// big floating wing, thin red light bar, "ROSTR" plate, four gold exhaust
// tips over four thruster nozzles, and two side thrusters with smoke plumes.
// All geometry is generated in code, so there are no third-party assets or licenses.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

function plateTexture(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#d9dadd"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#8a8c92"; g.lineWidth = 8; g.strokeRect(8, 8, 496, 240);
  g.fillStyle = "#6b6d74"; g.font = "bold 120px serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 256, 134);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function smokeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  r.addColorStop(0, "rgba(255,255,255,0.9)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function buildRear({ plate = "ROSTR" } = {}) {
  const car = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x2a2c31, metalness: 0.7, roughness: 0.35 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 0.9, roughness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.5, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb8923a, metalness: 1, roughness: 0.25 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x8a6a58, metalness: 0.8, roughness: 0.3 });

  // Lower tail and diffuser
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.0, 1.4), body);
  tail.position.set(0, 1.0, 0); car.add(tail);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.7, 1.2), silver);
  upper.position.set(0, 1.8, -0.1); upper.rotation.x = -0.12; car.add(upper);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 0.5), dark);
  diffuser.position.set(0, 0.55, 0.45); car.add(diffuser);

  // Wheels
  for (const x of [-2.15, 2.15]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.7, 32), dark);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.75, -0.2); car.add(w);
  }

  // Wing on two struts
  const wing = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 1.3), wingMat);
  wing.position.set(0, 3.0, -0.3); wing.rotation.x = 0.1; car.add(wing);
  for (const x of [-0.9, 0.9]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.2), dark);
    s.position.set(x, 2.55, -0.2); car.add(s);
  }

  // Red light bar (emissive)
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.08, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xff2418 })
  );
  bar.position.set(0, 2.2, 0.55); car.add(bar);
  const glow = new THREE.PointLight(0xff2418, 4, 6);
  glow.position.set(0, 2.2, 1.2); car.add(glow);

  // License plate
  const plateMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.45),
    new THREE.MeshStandardMaterial({ map: plateTexture(plate), roughness: 0.5 })
  );
  plateMesh.position.set(0, 1.45, 0.72); car.add(plateMesh);

  // Four gold exhaust tips above four round thruster nozzles
  for (let i = 0; i < 4; i++) {
    const x = -0.9 + i * 0.6;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 20), gold);
    tip.rotation.x = Math.PI / 2; tip.position.set(x, 0.98, 0.75); car.add(tip);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.3, 24), dark);
    nozzle.rotation.x = Math.PI / 2; nozzle.position.set(x, 0.55, 0.62); car.add(nozzle);
  }

  // Two thrusters on each side, with plumes
  const smokeMap = smokeTexture();
  const puffs = [];
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xdfe9ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  for (const x of [-1.75, -1.35, 1.35, 1.75]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 12), silver);
    pipe.position.set(x, 0.55, 0.5); car.add(pipe);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.6, 16, 1, true), plumeMat);
    plume.position.set(x, -0.3, 0.5); plume.rotation.x = Math.PI; car.add(plume);
  }

  // Smoke on the ground
  const mat = new THREE.SpriteMaterial({ map: smokeMap, transparent: true, opacity: 0.09, depthWrite: false });
  for (let i = 0; i < 45; i++) {
    const s = new THREE.Sprite(mat.clone());
    s.position.set((Math.random() - 0.5) * 9, 0.15 + Math.random() * 0.55, 0.9 + Math.random() * 1.6);
    const k = 1.4 + Math.random() * 1.8;
    s.scale.set(k, k, 1);
    s.userData = { base: s.position.clone(), phase: Math.random() * 6.28 };
    puffs.push(s); car.add(s);
  }

  car.userData.update = (t) => {
    for (const s of puffs) {
      s.position.y = s.userData.base.y + Math.sin(t * 1.2 + s.userData.phase) * 0.08;
      s.position.x = s.userData.base.x + Math.sin(t * 0.6 + s.userData.phase) * 0.1;
    }
    glow.intensity = 3.5 + Math.sin(t * 6) * 0.4;
  };
  return car;
}
