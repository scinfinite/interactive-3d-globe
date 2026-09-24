import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Featured locations (lat, lon in degrees)
// ---------------------------------------------------------------------------
const LOCATIONS = [
  { id: 'nyc', name: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060, color: '#5b9cff' },
  { id: 'london', name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278, color: '#7dd3fc' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, color: '#f472b6' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, color: '#34d399' },
  { id: 'rio', name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lon: -43.1729, color: '#fbbf24' },
  { id: 'cape-town', name: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241, color: '#a78bfa' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708, color: '#fb7185' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, color: '#38bdf8' },
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, color: '#c084fc' },
  { id: 'sf', name: 'San Francisco', country: 'USA', lat: 37.7749, lon: -122.4194, color: '#4ade80' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------
const canvas = document.getElementById('globe-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x050510, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0.4, 3.2);

// Soft ambient + gentle key light
const ambientLight = new THREE.AmbientLight(0x6688cc, 0.55);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.15);
keyLight.position.set(5, 3, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x88aaff, 0.35);
fillLight.position.set(-4, 1, -2);
scene.add(fillLight);

// ---------------------------------------------------------------------------
// Globe
// ---------------------------------------------------------------------------
const GLOBE_RADIUS = 1;

const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load(
  'https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
);
const bumpTexture = textureLoader.load(
  'https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-topology.png'
);

const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
const globeMaterial = new THREE.MeshPhongMaterial({
  map: earthTexture,
  bumpMap: bumpTexture,
  bumpScale: 0.012,
  specular: new THREE.Color(0x222222),
  shininess: 12,
});
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globe);

// Subtle atmosphere (Fresnel-like glow using a slightly larger transparent sphere)
const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.018, 64, 64);
const atmosphereMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
      gl_FragColor = vec4(0.35, 0.55, 1.0, 1.0) * intensity * 0.85;
    }
  `,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// Soft outer haze
const hazeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.08, 48, 48);
const hazeMaterial = new THREE.MeshBasicMaterial({
  color: 0x3a6eff,
  transparent: true,
  opacity: 0.06,
  side: THREE.BackSide,
  depthWrite: false,
});
const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
scene.add(haze);

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------
const markersGroup = new THREE.Group();
scene.add(markersGroup);

const markerMeshes = [];
const MARKER_RADIUS = 0.018;

LOCATIONS.forEach((loc) => {
  const pos = latLonToVector3(loc.lat, loc.lon, GLOBE_RADIUS + 0.008);

  // Core glowing sphere
  const geo = new THREE.SphereGeometry(MARKER_RADIUS, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(loc.color),
    transparent: true,
    opacity: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.userData = { location: loc, isMarker: true };

  // Outer glow shell
  const glowGeo = new THREE.SphereGeometry(MARKER_RADIUS * 2.4, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(loc.color),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  mesh.add(glow);

  // Soft point light for extra bloom feel
  const light = new THREE.PointLight(loc.color, 0.45, 0.6, 2);
  light.position.set(0, 0, 0);
  mesh.add(light);

  markersGroup.add(mesh);
  markerMeshes.push(mesh);
});

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 1.55;
controls.maxDistance = 5.5;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.85;

// Pause auto-rotate while user interacts
let interactionTimeout = null;
const pauseAutoRotate = () => {
  controls.autoRotate = false;
  if (interactionTimeout) clearTimeout(interactionTimeout);
  interactionTimeout = setTimeout(() => {
    controls.autoRotate = true;
  }, 2800);
};

canvas.addEventListener('pointerdown', pauseAutoRotate);
canvas.addEventListener('wheel', pauseAutoRotate, { passive: true });
canvas.addEventListener('touchstart', pauseAutoRotate, { passive: true });

// ---------------------------------------------------------------------------
// UI – location list
// ---------------------------------------------------------------------------
const listEl = document.getElementById('location-list');
const tooltipEl = document.getElementById('tooltip');

LOCATIONS.forEach((loc) => {
  const li = document.createElement('li');
  li.className = 'location-item';
  li.dataset.id = loc.id;
  li.innerHTML = `
    <span class="marker-dot" style="--marker-color: ${loc.color}"></span>
    <div class="info">
      <div class="name">${loc.name}</div>
      <div class="country">${loc.country}</div>
    </div>
  `;
  li.addEventListener('click', () => focusOnLocation(loc));
  listEl.appendChild(li);
});

function setActiveListItem(id) {
  document.querySelectorAll('.location-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

// ---------------------------------------------------------------------------
// Click-to-focus (raycast markers + smooth camera transition)
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerClick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(markerMeshes, false);

  if (hits.length > 0) {
    const loc = hits[0].object.userData.location;
    if (loc) focusOnLocation(loc);
  }
}

canvas.addEventListener('click', onPointerClick);

// Smooth camera focus
let isAnimatingCamera = false;
const focusTarget = new THREE.Vector3();
const focusCameraPos = new THREE.Vector3();

function focusOnLocation(loc) {
  setActiveListItem(loc.id);
  pauseAutoRotate();

  const surface = latLonToVector3(loc.lat, loc.lon, GLOBE_RADIUS);
  focusTarget.copy(surface);

  // Camera position: offset outward from the point
  const direction = surface.clone().normalize();
  focusCameraPos.copy(direction.multiplyScalar(2.35));

  isAnimatingCamera = true;
  animateCameraTo(focusCameraPos, focusTarget, 1.15);
}

function animateCameraTo(targetPos, lookAt, durationSec) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();
  const duration = durationSec * 1000;

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    // Smooth ease-in-out
    const eased = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    camera.position.lerpVectors(startPos, targetPos, eased);
    controls.target.lerpVectors(startTarget, lookAt, eased);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      isAnimatingCamera = false;
    }
  }
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Tooltip on hover
// ---------------------------------------------------------------------------
function onPointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(markerMeshes, false);

  if (hits.length > 0) {
    const loc = hits[0].object.userData.location;
    tooltipEl.hidden = false;
    tooltipEl.textContent = `${loc.name}, ${loc.country}`;
    tooltipEl.style.left = `${event.clientX}px`;
    tooltipEl.style.top = `${event.clientY}px`;
    canvas.style.cursor = 'pointer';
  } else {
    tooltipEl.hidden = true;
    canvas.style.cursor = 'grab';
  }
}

canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerleave', () => {
  tooltipEl.hidden = true;
});

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // Gentle pulse on markers
  markerMeshes.forEach((m, i) => {
    const pulse = 1 + Math.sin(elapsed * 2.2 + i * 0.7) * 0.12;
    m.scale.setScalar(pulse);
  });

  // Slow independent rotation of atmosphere for subtle life
  atmosphere.rotation.y += 0.00025;

  controls.update();
  renderer.render(scene, camera);
}

animate();

// Initial focus on a nice view
controls.target.set(0, 0, 0);
