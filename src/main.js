import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const locations = [
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357 },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198 }
];

const canvas = document.querySelector('#globe');
const panel = document.querySelector('#locations');
const status = document.querySelector('#status');
const tooltip = document.querySelector('#tooltip');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020617, 0.018);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.15, 5.6);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

scene.add(new THREE.HemisphereLight(0x9bdcff, 0x07111f, 1.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(-3, 2, 4);
scene.add(keyLight);

const globe = new THREE.Group();
scene.add(globe);

const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load(
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
);
earthTexture.colorSpace = THREE.SRGBColorSpace;

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1.8, 96, 96),
  new THREE.MeshStandardMaterial({
    map: earthTexture,
    roughness: 0.86,
    metalness: 0.02
  })
);
globe.add(earth);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.88, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x42bff4,
    transparent: true,
    opacity: 0.11,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
globe.add(atmosphere);

const atmosphereHalo = new THREE.Mesh(
  new THREE.SphereGeometry(1.98, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x1d75b8,
    transparent: true,
    opacity: 0.045,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
globe.add(atmosphereHalo);

const markerGroup = new THREE.Group();
globe.add(markerGroup);

const markerGeometry = new THREE.SphereGeometry(0.045, 20, 20);
const markerMaterial = new THREE.MeshStandardMaterial({
  color: 0x67e8f9,
  emissive: 0x38bdf8,
  emissiveIntensity: 2.8,
  roughness: 0.3,
  metalness: 0.1
});

function latLonToVector3(lat, lon, radius = 1.84) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

const markerMeshes = locations.map((location) => {
  const marker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
  marker.position.copy(latLonToVector3(location.lat, location.lon));
  marker.userData.location = location;
  markerGroup.add(marker);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glow.position.copy(marker.position);
  glow.userData.location = location;
  glow.userData.glow = true;
  markerGroup.add(glow);

  return marker;
});

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 3.35;
controls.maxDistance = 8;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.48;
controls.rotateSpeed = 0.52;
controls.target.set(0, 0, 0);
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  status.textContent = 'Interaction active';
});
controls.addEventListener('end', () => {
  controls.autoRotate = true;
  status.textContent = 'Auto-rotate enabled';
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let selected = null;
let focusAnimation = null;

function setPointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickMarker() {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(markerMeshes, false)[0]?.object ?? null;
}

function markerScreenPosition(marker) {
  const pos = marker.position.clone();
  markerGroup.localToWorld(pos);
  pos.project(camera);
  return {
    x: (pos.x * 0.5 + 0.5) * innerWidth,
    y: (-pos.y * 0.5 + 0.5) * innerHeight
  };
}

canvas.addEventListener('pointermove', (event) => {
  setPointer(event);
  const marker = pickMarker();
  if (marker !== hovered) {
    hovered = marker;
    canvas.style.cursor = marker ? 'pointer' : 'grab';
    if (marker) {
      tooltip.textContent = marker.userData.location.name;
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden', 'false');
    } else {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }
  }
  if (hovered) {
    const pos = markerScreenPosition(hovered);
    tooltip.style.left = pos.x + 'px';
    tooltip.style.top = pos.y + 'px';
  }
});

canvas.addEventListener('pointerleave', () => {
  hovered = null;
  tooltip.classList.remove('visible');
  tooltip.setAttribute('aria-hidden', 'true');
});

canvas.addEventListener('click', (event) => {
  setPointer(event);
  const marker = pickMarker();
  if (marker) focusLocation(marker.userData.location);
});

function focusLocation(location) {
  const marker = markerMeshes.find((mesh) => mesh.userData.location === location);
  if (!marker) return;

  selected = location;
  controls.autoRotate = false;
  status.textContent = 'Focused on ' + location.name;
  panel.querySelectorAll('.location-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.name === location.name);
  });

  const target = latLonToVector3(location.lat, location.lon, 1);
  const desiredCamera = target.clone().normalize().multiplyScalar(4.25);
  desiredCamera.y += 0.12;

  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();
  const endTarget = target.clone().multiplyScalar(0.1);

  focusAnimation = {
    start: performance.now(),
    duration: 950,
    startPosition,
    endPosition: desiredCamera,
    startTarget,
    endTarget
  };
}

panel.innerHTML = locations.map((location) => `
  <button class="location-button" type="button" data-name="${location.name}">
    <span class="location-dot" aria-hidden="true"></span>
    <span class="location-copy">
      <span class="location-name">${location.name}</span>
      <span class="location-country">${location.country}</span>
    </span>
    <span class="location-arrow" aria-hidden="true">→</span>
  </button>
`).join('');

panel.querySelectorAll('.location-button').forEach((button) => {
  button.addEventListener('click', () => {
    const location = locations.find((item) => item.name === button.dataset.name);
    focusLocation(location);
  });
});

const starsGeometry = new THREE.BufferGeometry();
const starCount = 1500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const radius = THREE.MathUtils.randFloat(10, 24);
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
  starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = radius * Math.cos(phi);
  starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(
  starsGeometry,
  new THREE.PointsMaterial({ color: 0x9fb9d1, size: 0.018, transparent: true, opacity: 0.7 })
));

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) {
  controls.autoRotate = false;
  status.textContent = 'Auto-rotate reduced for accessibility';
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  markerMeshes.forEach((marker, index) => {
    const pulse = 1 + Math.sin(elapsed * 3.2 + index * 0.8) * 0.16;
    marker.scale.setScalar(marker === hovered || marker.userData.location === selected ? 1.42 : pulse);
    marker.material.emissiveIntensity = marker === hovered || marker.userData.location === selected ? 4.5 : 2.8;
  });

  if (focusAnimation) {
    const progress = Math.min((performance.now() - focusAnimation.start) / focusAnimation.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(focusAnimation.startPosition, focusAnimation.endPosition, eased);
    controls.target.lerpVectors(focusAnimation.startTarget, focusAnimation.endTarget, eased);
    if (progress >= 1) {
      focusAnimation = null;
      controls.autoRotate = !reducedMotion;
      status.textContent = reducedMotion ? 'Auto-rotate reduced for accessibility' : 'Auto-rotate enabled';
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
});

animate();
