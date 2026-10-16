// Roadster Flight - prototype bootstrap
// Stack: Three.js rendering now, Rapier physics + Cesium/OSM city tiles next.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const menu = document.getElementById("menu");
menu.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-city]");
  if (!btn) return;
  menu.style.display = "none";
  startGame(btn.dataset.city);
});

function startGame(city) {
  const hud = document.getElementById("hud");
  hud.textContent = `ROADSTER FLIGHT - ${city} (placeholder scene)`;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  const camera = new THREE.PerspectiveCamera(
    60, innerWidth / innerHeight, 0.1, 2000
  );
  camera.position.set(0, 6, 14);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x0a0a14, 1.1));

  // Placeholder ground + "car" until real city tiles and the car model land.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x101420 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const car = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.6, 4),
    new THREE.MeshStandardMaterial({ color: 0xc0c8d8 })
  );
  car.position.y = 0.4;
  scene.add(car);

  // TODO: WASD driving, Space thruster boost, Shift hop jets, F flip,
  // cop pursuit AI, wanted/damage system, city tile streaming.

  renderer.setAnimationLoop(() => {
    car.rotation.y += 0.01;
    renderer.render(scene, camera);
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}
