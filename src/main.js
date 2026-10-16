// Roadster Flight - prototype bootstrap
// Stack: Three.js rendering now, Rapier physics + Cesium/OSM city tiles next.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { buildRear } from "./rear.js";

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
  camera.position.set(0, 2.6, 9);

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

  // Rear-view car (wing, light bar, ROSTR plate, exhausts, thruster plumes)
  const car = buildRear();
  scene.add(car);
  camera.position.set(0, 2.6, 9);
  camera.lookAt(0, 1.8, 0);
  scene.fog = new THREE.FogExp2(0x05070d, 0.03);

  // TODO: WASD driving, Space thruster boost, Shift hop jets, F flip,
  // cop pursuit AI, wanted/damage system, city tile streaming.

  renderer.setAnimationLoop(() => {
    car.userData.update(performance.now() / 1000);
    renderer.render(scene, camera);
  });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}
