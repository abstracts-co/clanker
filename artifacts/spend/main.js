// Agent spend as 3D bars: one row per tool, one column per day. Data lives next to this file in data.json.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const data = await fetch(new URL('./data.json', import.meta.url)).then((r) => r.json());
const total = data.series.flatMap((s) => s.values).reduce((a, b) => a + b, 0);
document.getElementById('total').textContent = `$${total.toFixed(2)} across ${data.series.length} agents`;
document.getElementById('note').textContent = data.note;
document.getElementById('legend').innerHTML = data.series.map((s) => `<li><span style="background:${s.color}"></span>${s.name}</li>`).join('');

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
camera.position.set(11, 9, 14);

scene.add(new THREE.HemisphereLight(0xfff4e6, 0x1a1816, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(6, 12, 8);
scene.add(sun);

// Floor grid sized to the data.
const cols = data.days.length;
const rows = data.series.length;
const gap = 1.25;
const width = cols * gap;
const depth = rows * gap;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(width + 1.5, depth + 1.5), new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const max = Math.max(...data.series.flatMap((s) => s.values));
const bars = [];
data.series.forEach((s, row) => {
  const material = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.45, metalness: 0.05 });
  s.values.forEach((value, col) => {
    const height = Math.max(0.05, (value / max) * 5);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.8), material);
    bar.position.set(col * gap - width / 2 + gap / 2, 0, row * gap - depth / 2 + gap / 2);
    bar.userData = { height, delay: col * 0.06 + row * 0.12 };
    bar.scale.y = 0.001;
    scene.add(bar);
    bars.push(bar);
  });
});

// Day labels along the front edge.
const label = (text) => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#b9b2a8';
  g.font = '600 34px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(text, 64, 44);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  sprite.scale.set(1.2, 0.6, 1);
  return sprite;
};
data.days.forEach((day, col) => {
  const s = label(day);
  s.position.set(col * gap - width / 2 + gap / 2, 0.3, depth / 2 + 0.9);
  scene.add(s);
});

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 1.2, 0);
controls.maxPolarAngle = Math.PI / 2.1;
controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotateSpeed = 0.6;

const resize = () => {
  const { clientWidth: w, clientHeight: h } = canvas;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};
addEventListener('resize', resize);
resize();

// Bars grow in once, with an ease-out, then the scene slowly turns.
const start = performance.now();
const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
renderer.setAnimationLoop((now) => {
  const t = (now - start) / 900;
  for (const bar of bars) {
    const h = bar.userData.height * ease(t - bar.userData.delay);
    bar.scale.y = Math.max(0.001, h);
    bar.position.y = h / 2;
  }
  controls.update();
  renderer.render(scene, camera);
});
