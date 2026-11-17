import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#game-canvas");
const hud = document.querySelector("#hud");
const startScreen = document.querySelector("#start-screen");
const endScreen = document.querySelector("#end-screen");
const endPanel = document.querySelector(".end-panel");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const muteButton = document.querySelector("#mute-button");
const muteIcon = document.querySelector("#mute-icon");
const muteLabel = document.querySelector("#mute-label");
const sleepMeter = document.querySelector("#sleep-meter");
const sleepValue = document.querySelector("#sleep-value");
const sleepStatus = document.querySelector("#sleep-status");
const batteryMeter = document.querySelector("#battery-meter");
const batteryValue = document.querySelector("#battery-value");
const batteryStatus = document.querySelector("#battery-status");
const batteryCard = document.querySelector(".battery-card");
const dangerIndicator = document.querySelector("#danger-indicator");
const dangerLabel = document.querySelector("#danger-label");
const flashBloom = document.querySelector("#flash-bloom");
const touchFlashlight = document.querySelector("#touch-flashlight");
const touchMusic = document.querySelector("#touch-music");
const toast = document.querySelector("#toast");

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (current, target, smoothing, dt) => lerp(current, target, 1 - Math.exp(-smoothing * dt));

const state = {
  phase: "intro",
  sleep: 0,
  battery: 100,
  flashlight: false,
  music: false,
  muted: false,
  elapsed: 0,
  totalPlayed: 0,
  caughtBy: "",
  yaw: 0,
  pitch: -0.07,
  shake: 0,
  lastToast: "",
};

const keys = new Set();
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070913);
scene.fog = new THREE.FogExp2(0x070913, 0.045);

const camera = new THREE.PerspectiveCamera(64, 1, 0.05, 80);
camera.rotation.order = "YXZ";
camera.position.set(0, 1.36, 3.72);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;

const ambientLight = new THREE.HemisphereLight(0x6679c7, 0x080710, 0.32);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x86a8ff, 1.25);
moonLight.position.set(-4, 8, -4);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
moonLight.shadow.camera.left = -9;
moonLight.shadow.camera.right = 9;
moonLight.shadow.camera.top = 9;
moonLight.shadow.camera.bottom = -9;
moonLight.shadow.bias = -0.0006;
scene.add(moonLight);

const moonGlow = new THREE.PointLight(0x4667ca, 1.2, 9, 2);
moonGlow.position.set(-3.25, 4.45, -5.9);
scene.add(moonGlow);

const bedsideLight = new THREE.PointLight(0xffb878, 0.08, 5, 2);
bedsideLight.position.set(4.25, 2.38, 3.1);
bedsideLight.castShadow = true;
scene.add(bedsideLight);

const flashlight = new THREE.SpotLight(0xdceeff, 0, 14, Math.PI / 8, 0.48, 1.4);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(512, 512);
flashlight.shadow.bias = -0.001;
scene.add(flashlight);
const flashlightTarget = new THREE.Object3D();
scene.add(flashlightTarget);
flashlight.target = flashlightTarget;
const flashlightPoint = new THREE.PointLight(0xbddcff, 0, 2, 2);
scene.add(flashlightPoint);

const mats = {
  floor: new THREE.MeshStandardMaterial({ color: 0x101323, roughness: 0.92, metalness: 0.02 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x15172a, roughness: 0.9 }),
  wallTrim: new THREE.MeshStandardMaterial({ color: 0x262a43, roughness: 0.76 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x3a2832, roughness: 0.72 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x1d1724, roughness: 0.86 }),
  mattress: new THREE.MeshStandardMaterial({ color: 0x363952, roughness: 0.94 }),
  blanket: new THREE.MeshStandardMaterial({ color: 0x424869, roughness: 0.96 }),
  blanketLight: new THREE.MeshStandardMaterial({ color: 0x5c668c, roughness: 0.96 }),
  pillow: new THREE.MeshStandardMaterial({ color: 0x717694, roughness: 0.98 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x6d789c, roughness: 0.32, metalness: 0.55 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x182c67, emissive: 0x1a3078, emissiveIntensity: 0.85, roughness: 0.2, metalness: 0.1 }),
  paper: new THREE.MeshStandardMaterial({ color: 0x777ca1, roughness: 0.95 }),
  rug: new THREE.MeshStandardMaterial({ color: 0x201b32, roughness: 1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x030309, roughness: 1 }),
  monster: new THREE.MeshStandardMaterial({ color: 0x06060e, roughness: 1, emissive: 0x05030b, emissiveIntensity: 0.55 }),
  redEye: new THREE.MeshStandardMaterial({ color: 0x21030b, emissive: 0xf02f45, emissiveIntensity: 3.2, roughness: 0.28 }),
  amber: new THREE.MeshStandardMaterial({ color: 0x75451f, emissive: 0xc9772f, emissiveIntensity: 1.7, roughness: 0.4 }),
};

function box(size, position, material, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.name) mesh.name = options.name;
  (options.parent || scene).add(mesh);
  return mesh;
}

function cylinder(radiusTop, radiusBottom, height, position, material, options = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments || 16), material);
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  (options.parent || scene).add(mesh);
  return mesh;
}

function sphere(radius, position, material, options = {}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, options.widthSegments || 18, options.heightSegments || 12), material);
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  (options.parent || scene).add(mesh);
  return mesh;
}

function createRoom() {
  box([12, 0.28, 14], [0, -0.18, 0], mats.floor, { name: "Floor" });
  box([12, 6.5, 0.3], [0, 3.1, -7], mats.wall, { name: "BackWall" });
  box([0.3, 6.5, 14], [-6, 3.1, 0], mats.wall, { name: "LeftWall" });
  box([0.3, 6.5, 14], [6, 3.1, 0], mats.wall, { name: "RightWall" });
  box([12, 0.22, 14], [0, 6.52, 0], mats.wall, { name: "Ceiling", castShadow: false });

  for (const x of [-5.7, 5.7]) box([0.18, 0.35, 14], [x, 0.22, 0], mats.wallTrim);
  box([12, 0.32, 0.18], [0, 0.22, -6.72], mats.wallTrim);
  box([12, 0.32, 0.18], [0, 0.22, 6.72], mats.wallTrim);

  box([4.2, 0.04, 4.9], [0, 0.03, 0.15], mats.rug, { castShadow: false });
  box([3.6, 0.035, 2.5], [0, 0.045, -3.5], new THREE.MeshStandardMaterial({ color: 0x25213f, roughness: 1 }), { castShadow: false });

  // Window and moonlight.
  box([3.5, 2.7, 0.13], [-2.75, 3.85, -6.82], mats.woodDark, { castShadow: false });
  box([3.02, 2.22, 0.08], [-2.75, 3.85, -6.88], mats.glass, { castShadow: false, receiveShadow: false });
  box([0.12, 2.32, 0.12], [-2.75, 3.85, -6.95], mats.wood, { castShadow: false });
  box([3.26, 0.12, 0.12], [-2.75, 3.85, -6.95], mats.wood, { castShadow: false });
  box([3.26, 0.12, 0.12], [-2.75, 2.73, -6.95], mats.wood, { castShadow: false });
  box([0.1, 2.32, 0.1], [-4.26, 3.85, -6.95], mats.wood, { castShadow: false });
  box([0.1, 2.32, 0.1], [-1.24, 3.85, -6.95], mats.wood, { castShadow: false });
  sphere(0.4, [-3.45, 4.52, -6.94], new THREE.MeshStandardMaterial({ color: 0xe9ecff, emissive: 0x8f9bff, emissiveIntensity: 1.8, roughness: 1 }), { castShadow: false, receiveShadow: false, widthSegments: 24, heightSegments: 16 });
  const curtain = new THREE.MeshStandardMaterial({ color: 0x272c55, roughness: 0.95, side: THREE.DoubleSide });
  box([0.45, 2.85, 0.11], [-4.52, 3.78, -6.9], curtain, { castShadow: false });
  box([0.45, 2.85, 0.11], [-0.98, 3.78, -6.9], curtain, { castShadow: false });

  // Door and closet.
  box([2.2, 4.7, 0.16], [3.55, 2.35, -6.82], mats.woodDark, { castShadow: false });
  box([1.86, 4.35, 0.08], [3.55, 2.35, -6.92], new THREE.MeshStandardMaterial({ color: 0x281e33, roughness: 0.85 }), { castShadow: false });
  box([0.08, 0.08, 0.08], [4.28, 2.4, -7.02], mats.amber, { castShadow: false });
  box([2.5, 4.8, 0.16], [-4.55, 2.4, -4.72], mats.woodDark, { castShadow: false });
  box([2.25, 4.45, 0.08], [-4.55, 2.4, -4.82], new THREE.MeshStandardMaterial({ color: 0x171522, roughness: 0.9 }), { castShadow: false });
  box([0.07, 4.28, 0.1], [-4.55, 2.4, -4.9], mats.wood, { castShadow: false });
  box([0.07, 4.28, 0.1], [-3.46, 2.4, -4.9], mats.wood, { castShadow: false });
  box([0.07, 4.28, 0.1], [-5.64, 2.4, -4.9], mats.wood, { castShadow: false });

  // A few childlike room details.
  box([1.18, 0.08, 0.9], [2.45, 3.0, -6.78], mats.paper, { castShadow: false });
  box([0.72, 0.06, 0.46], [2.45, 3.03, -6.84], new THREE.MeshStandardMaterial({ color: 0x404a7c, roughness: 1 }), { castShadow: false });
  const starMat = new THREE.MeshStandardMaterial({ color: 0x938dcc, emissive: 0x584c9a, emissiveIntensity: 1.2, roughness: 0.8 });
  for (const [x, y, z, s] of [[-1.2, 5.2, -6.84, 0.05], [0.3, 5.7, -6.84, 0.04], [1.1, 4.9, -6.84, 0.035], [4.6, 4.7, -6.84, 0.05]]) sphere(s, [x, y, z], starMat, { castShadow: false, receiveShadow: false, widthSegments: 8, heightSegments: 6 });
  sphere(0.27, [1.1, 0.65, -1.3], mats.amber, { widthSegments: 16, heightSegments: 10 });
  cylinder(0.18, 0.2, 0.25, [1.1, 0.35, -1.3], mats.woodDark, { segments: 12 });

  createBed();
  createBedsideTable();
  createDustMotes();
}

function createBed() {
  box([5.35, 0.55, 5.9], [0, 0.52, 3.48], mats.woodDark);
  box([5.16, 0.48, 5.68], [0, 0.91, 3.48], mats.mattress);
  box([5.0, 0.24, 4.25], [0, 1.23, 2.58], mats.blanket);
  box([4.86, 0.18, 2.02], [0, 1.34, 4.0], mats.blanketLight);
  box([4.95, 2.18, 0.3], [0, 1.78, 6.23], mats.wood);
  box([4.45, 1.82, 0.16], [0, 1.8, 6.08], new THREE.MeshStandardMaterial({ color: 0x49334d, roughness: 0.86 }));
  box([5.5, 0.35, 0.35], [0, 0.78, 0.46], mats.wood, { castShadow: false });
  for (const x of [-2.35, 2.35]) {
    box([0.35, 1.15, 0.35], [x, 0.45, 0.5], mats.wood);
    box([0.35, 1.15, 0.35], [x, 0.45, 6.35], mats.wood);
  }
  // Pillows are rounded by using scaled spheres.
  const pillowA = sphere(0.75, [-1.32, 1.48, 5.0], mats.pillow, { widthSegments: 20, heightSegments: 12 });
  pillowA.scale.set(1.45, 0.32, 0.72);
  const pillowB = sphere(0.75, [1.32, 1.48, 5.0], mats.pillow, { widthSegments: 20, heightSegments: 12 });
  pillowB.scale.set(1.45, 0.32, 0.72);
  const teddy = new THREE.Group();
  teddy.position.set(-2.15, 1.52, 3.75);
  sphere(0.33, [0, 0, 0], new THREE.MeshStandardMaterial({ color: 0x8a5b4a, roughness: 1 }), { parent: teddy });
  sphere(0.17, [-0.23, 0.22, 0], new THREE.MeshStandardMaterial({ color: 0x8a5b4a, roughness: 1 }), { parent: teddy });
  sphere(0.17, [0.23, 0.22, 0], new THREE.MeshStandardMaterial({ color: 0x8a5b4a, roughness: 1 }), { parent: teddy });
  sphere(0.035, [-0.1, 0.04, -0.31], mats.black, { parent: teddy, castShadow: false });
  sphere(0.035, [0.1, 0.04, -0.31], mats.black, { parent: teddy, castShadow: false });
  scene.add(teddy);
}

function createBedsideTable() {
  box([1.35, 1.65, 1.2], [4.25, 0.87, 3.24], mats.wood);
  box([1.48, 0.11, 1.32], [4.25, 1.75, 3.24], mats.woodDark);
  for (const x of [3.82, 4.68]) box([0.09, 1.85, 0.09], [x, 0.15, 2.8], mats.woodDark);
  for (const x of [3.82, 4.68]) box([0.09, 1.85, 0.09], [x, 0.15, 3.68], mats.woodDark);

  const lamp = new THREE.Group();
  lamp.position.set(4.25, 1.86, 3.24);
  cylinder(0.19, 0.25, 0.06, [0, 0, 0], mats.metal, { parent: lamp, segments: 16 });
  cylinder(0.04, 0.04, 0.55, [0, 0.28, 0], mats.metal, { parent: lamp, segments: 10 });
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.38, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a4760, emissive: 0x1e1220, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.72 }));
  shade.position.y = 0.64;
  shade.rotation.z = Math.PI;
  lamp.add(shade);
  sphere(0.09, [0, 0.45, 0], mats.amber, { parent: lamp, castShadow: false, receiveShadow: false });
  scene.add(lamp);

  const musicBox = new THREE.Group();
  musicBox.name = "MusicBox";
  musicBox.position.set(4.25, 1.98, 3.24);
  box([0.68, 0.28, 0.53], [0, 0, 0], new THREE.MeshStandardMaterial({ color: 0x7d4c66, roughness: 0.52, metalness: 0.1 }), { parent: musicBox });
  const lid = box([0.68, 0.07, 0.53], [0, 0.22, 0], new THREE.MeshStandardMaterial({ color: 0x9a607a, roughness: 0.48 }), { parent: musicBox });
  lid.rotation.x = -0.12;
  const musicKey = cylinder(0.1, 0.1, 0.03, [0, 0.19, 0], mats.amber, { parent: musicBox, segments: 16, castShadow: false, receiveShadow: false });
  musicKey.rotation.x = Math.PI / 2;
  musicBox.userData = { lid, musicKey };
  scene.add(musicBox);
  scene.userData.musicBox = musicBox;
}

const motes = [];
function createDustMotes() {
  const moteMaterial = new THREE.MeshBasicMaterial({ color: 0x8799dc, transparent: true, opacity: 0.24 });
  for (let i = 0; i < 44; i += 1) {
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.012 + Math.random() * 0.014, 5, 5), moteMaterial.clone());
    mote.position.set(-5.2 + Math.random() * 10.4, 0.7 + Math.random() * 4.7, -5.8 + Math.random() * 10.6);
    mote.userData = { drift: Math.random() * Math.PI * 2, speed: 0.12 + Math.random() * 0.24, baseY: mote.position.y };
    scene.add(mote);
    motes.push(mote);
  }
}

function createHallMonster() {
  const group = new THREE.Group();
  group.name = "HALLWAY_MONSTER";
  const body = box([0.72, 1.6, 0.48], [0, 1.02, 0], mats.monster, { parent: group });
  body.scale.set(1, 1, 0.75);
  const head = sphere(0.47, [0, 2.0, -0.02], mats.monster, { parent: group });
  head.scale.set(0.86, 1.15, 0.72);
  const eyeL = sphere(0.075, [-0.17, 2.08, -0.4], mats.redEye, { parent: group, castShadow: false, receiveShadow: false });
  const eyeR = sphere(0.075, [0.17, 2.08, -0.4], mats.redEye, { parent: group, castShadow: false, receiveShadow: false });
  const armL = cylinder(0.09, 0.14, 1.55, [-0.56, 1.05, 0], mats.monster, { parent: group, segments: 10 });
  const armR = cylinder(0.09, 0.14, 1.55, [0.56, 1.05, 0], mats.monster, { parent: group, segments: 10 });
  armL.rotation.z = -0.25;
  armR.rotation.z = 0.25;
  const fingersL = cylinder(0.04, 0.07, 0.55, [-0.62, 0.2, -0.06], mats.monster, { parent: group, segments: 8 });
  const fingersR = cylinder(0.04, 0.07, 0.55, [0.62, 0.2, -0.06], mats.monster, { parent: group, segments: 8 });
  fingersL.rotation.z = -0.18;
  fingersR.rotation.z = 0.18;
  group.position.set(3.55, 0.05, -5.82);
  scene.add(group);
  return { id: "the hallway", name: "EL DEL PASILLO", group, parts: { body, head, eyeL, eyeR, armL, armR, fingersL, fingersR }, threat: 11, base: group.position.clone(), mode: "door", lastScare: 0 };
}

function createClosetMonster() {
  const group = new THREE.Group();
  group.name = "CLOSET_MONSTER";
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.76, 2.65, 9, 1, true), mats.monster);
  cloak.position.y = 1.3;
  group.add(cloak);
  const head = sphere(0.4, [0, 2.48, 0], mats.monster, { parent: group });
  head.scale.set(0.75, 1.2, 0.7);
  const eyeL = sphere(0.062, [-0.14, 2.52, -0.34], mats.redEye, { parent: group, castShadow: false, receiveShadow: false });
  const eyeR = sphere(0.062, [0.14, 2.52, -0.34], mats.redEye, { parent: group, castShadow: false, receiveShadow: false });
  const armL = cylinder(0.07, 0.1, 1.45, [-0.66, 1.35, -0.05], mats.monster, { parent: group, segments: 9 });
  const armR = cylinder(0.07, 0.1, 1.45, [0.66, 1.35, -0.05], mats.monster, { parent: group, segments: 9 });
  armL.rotation.z = -0.34;
  armR.rotation.z = 0.34;
  group.position.set(-4.5, 0.02, -4.58);
  group.scale.setScalar(0.72);
  scene.add(group);
  return { id: "the closet", name: "LA DEL ARMARIO", group, parts: { cloak, head, eyeL, eyeR, armL, armR }, threat: 7, base: group.position.clone(), mode: "closet", lastScare: 0 };
}

function createUnderbedMonster() {
  const group = new THREE.Group();
  group.name = "UNDERBED_MONSTER";
  const head = sphere(0.36, [0, 0.42, 0], mats.monster, { parent: group });
  head.scale.set(1.2, 0.72, 0.85);
  const eyeL = sphere(0.06, [-0.14, 0.46, -0.31], mats.redEye, { parent: group, castShadow: false, receiveShadow: false });
  const eyeR = sphere(0.06, [0.14, 0.46, -0.31], mats.redEye, { parent: group, castShadow: false, receiveShadow: false });
  const handL = cylinder(0.08, 0.13, 1.45, [-0.47, 0.18, -0.18], mats.monster, { parent: group, segments: 9 });
  const handR = cylinder(0.08, 0.13, 1.45, [0.47, 0.18, -0.18], mats.monster, { parent: group, segments: 9 });
  handL.rotation.z = -Math.PI / 2.8;
  handR.rotation.z = Math.PI / 2.8;
  const nailL = sphere(0.11, [-1.0, 0.55, -0.18], mats.redEye, { parent: group, castShadow: false, receiveShadow: false });
  const nailR = sphere(0.11, [1.0, 0.55, -0.18], mats.redEye, { parent: group, castShadow: false, receiveShadow: false });
  group.position.set(0, 0.02, 1.0);
  group.scale.setScalar(0.65);
  scene.add(group);
  return { id: "under the bed", name: "LO QUE HAY DEBAJO", group, parts: { head, eyeL, eyeR, handL, handR, nailL, nailR }, threat: 3, base: group.position.clone(), mode: "underbed", lastScare: 0 };
}

const monsters = [createHallMonster(), createClosetMonster(), createUnderbedMonster()];

function monsterWorldPosition(monster) {
  return monster.group.getWorldPosition(new THREE.Vector3());
}

function isInFlashlight(monster) {
  if (!state.flashlight) return false;
  const monsterPos = monsterWorldPosition(monster).add(new THREE.Vector3(0, monster.mode === "underbed" ? 0.28 : 1.5, -0.1));
  const toMonster = monsterPos.sub(camera.position);
  const distance = toMonster.length();
  if (distance > 13) return false;
  toMonster.normalize();
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return direction.dot(toMonster) > 0.86;
}

function lookAtPoint(point) {
  const toPoint = point.clone().sub(camera.position).normalize();
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  return direction.dot(toPoint);
}

function updateMonster(monster, dt, elapsed) {
  const seen = isInFlashlight(monster);
  const focus = lookAtPoint(monsterWorldPosition(monster).add(new THREE.Vector3(0, monster.mode === "underbed" ? 0.2 : 1.3, 0)));
  let pressure = 0;
  let retreat = 0;

  if (monster.mode === "door") {
    pressure = state.music ? 2.15 : 1.38;
    retreat = seen ? 12 : 0;
    monster.threat += (retreat - pressure) * dt;
    const progress = clamp(monster.threat / 100, 0, 1);
    monster.group.position.x = lerp(3.55, 0.62, progress);
    monster.group.position.z = lerp(-5.82, 0.42, progress);
    monster.group.rotation.y = Math.sin(elapsed * 1.7) * 0.08;
    monster.parts.armL.rotation.z = -0.25 - Math.sin(elapsed * 2.4) * 0.08;
    monster.parts.armR.rotation.z = 0.25 + Math.sin(elapsed * 2.4) * 0.08;
    monster.group.position.y = 0.05 + Math.sin(elapsed * 2.8) * 0.025;
  } else if (monster.mode === "closet") {
    const notWatched = focus < 0.42;
    pressure = (notWatched ? 2.25 : 0.18) + (state.music ? 0.55 : 0);
    retreat = seen ? 14 : 0;
    monster.threat += (retreat - pressure) * dt;
    const progress = clamp(monster.threat / 100, 0, 1);
    monster.group.position.x = lerp(-4.5, -1.85, progress);
    monster.group.position.z = lerp(-4.58, 0.4, progress);
    monster.group.rotation.y = Math.sin(elapsed * 1.55 + 1.1) * 0.18;
    monster.group.rotation.z = Math.sin(elapsed * 2.1) * 0.035;
    monster.group.position.y = 0.02 + Math.sin(elapsed * 2.4 + 1) * 0.035;
    monster.parts.cloak.scale.y = 1 + Math.sin(elapsed * 2.8) * 0.04;
  } else {
    pressure = state.music ? 1.22 : 0.34;
    retreat = seen ? 13 : 0;
    monster.threat += (retreat - pressure) * dt;
    const progress = clamp(monster.threat / 100, 0, 1);
    monster.group.position.x = Math.sin(elapsed * 0.9) * (0.26 + progress * 0.5);
    monster.group.position.z = lerp(1.0, 2.6, progress);
    monster.group.rotation.y = Math.sin(elapsed * 2.2) * 0.12;
    monster.parts.handL.rotation.z = -Math.PI / 2.8 - Math.sin(elapsed * 2.9) * (0.08 + progress * 0.1);
    monster.parts.handR.rotation.z = Math.PI / 2.8 + Math.sin(elapsed * 2.9) * (0.08 + progress * 0.1);
    monster.group.position.y = 0.02 + Math.sin(elapsed * 3.5) * 0.025;
  }

  monster.threat = clamp(monster.threat, 0, 100);
  monster.group.visible = monster.threat > 2 || monster.mode === "underbed";
  const visibility = clamp((monster.threat - 2) / 25, 0.14, 1);
  monster.group.scale.setScalar((monster.mode === "closet" ? 0.72 : monster.mode === "underbed" ? 0.65 : 1) * (0.82 + visibility * 0.18));
  const glow = 0.9 + monster.threat / 28;
  monster.parts.eyeL.material.emissiveIntensity = glow;
  monster.parts.eyeR.material.emissiveIntensity = glow;
  if (monster.parts.nailL) {
    monster.parts.nailL.material.emissiveIntensity = glow;
    monster.parts.nailR.material.emissiveIntensity = glow;
  }

  if (seen && state.elapsed - monster.lastScare > 1.5) {
    monster.lastScare = state.elapsed;
    state.shake = Math.max(state.shake, 0.06);
    playScareTone(monster.mode);
    showToast(monster.mode === "underbed" ? "Las manos retroceden." : `${monster.name} no soporta la luz.`);
  }
  return seen;
}

function updateCamera(dt) {
  const lookSpeed = 1.45;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) state.yaw += lookSpeed * dt;
  if (keys.has("KeyD") || keys.has("ArrowRight")) state.yaw -= lookSpeed * dt;
  if (keys.has("KeyW") || keys.has("ArrowUp")) state.pitch = clamp(state.pitch + lookSpeed * 0.56 * dt, -0.58, 0.42);
  if (keys.has("KeyS") || keys.has("ArrowDown")) state.pitch = clamp(state.pitch - lookSpeed * 0.56 * dt, -0.58, 0.42);
  state.shake = damp(state.shake, 0, 4.2, dt);
  const shakeX = (Math.random() - 0.5) * state.shake;
  const shakeY = (Math.random() - 0.5) * state.shake;
  camera.rotation.set(state.pitch + shakeY, state.yaw + shakeX, 0);
}

function updateLights(dt, totalThreat, elapsed) {
  const batteryPower = state.flashlight ? clamp(state.battery / 100, 0.12, 1) : 0;
  let flicker = 1;
  if (state.flashlight && state.battery < 18) flicker = Math.random() > 0.84 ? 0.16 : 0.92;
  flashlight.position.copy(camera.position);
  flashlightTarget.position.copy(camera.position);
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  flashlightTarget.position.addScaledVector(direction, 8);
  flashlight.intensity = state.flashlight ? 18 * batteryPower * flicker : 0;
  flashlightPoint.position.copy(camera.position);
  flashlightPoint.intensity = state.flashlight ? 1.7 * batteryPower * flicker : 0;
  flashBloom.style.opacity = state.flashlight ? String(0.03 + batteryPower * 0.1 * flicker) : "0";

  const menace = totalThreat / (monsters.length * 100);
  const flickerRate = menace > 0.72 && Math.random() < dt * (1 + menace * 3) ? 0.35 : 1;
  bedsideLight.intensity = 0.08 * flickerRate;
  moonGlow.intensity = 1.08 + Math.sin(elapsed * 0.55) * 0.06 - menace * 0.24;
  ambientLight.intensity = 0.32 - menace * 0.13;
  renderer.toneMappingExposure = 0.88 - menace * 0.12;
  const vignette = 0.88 + menace * 0.12;
  document.querySelector("#screen-vignette").style.opacity = String(vignette);
}

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.ambientGain = null;
    this.noteTimer = 0;
    this.heartbeatTimer = 0;
    this.noteIndex = 0;
  }

  start() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = state.muted ? 0 : 0.52;
      this.master.connect(this.ctx.destination);
      this.ambient = this.ctx.createOscillator();
      this.ambient.type = "sine";
      this.ambient.frequency.value = 45;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.026;
      this.ambient.connect(this.ambientGain).connect(this.master);
      this.ambient.start();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(muted) {
    state.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.52, this.ctx.currentTime, 0.04);
  }

  tone(frequency, duration = 0.12, type = "sine", volume = 0.09, detune = 0) {
    if (!this.ctx || state.muted) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  musicNote() {
    const notes = [392, 494, 587, 659, 587, 494, 440, 494];
    this.tone(notes[this.noteIndex % notes.length], 0.52, "triangle", 0.075);
    this.noteIndex += 1;
  }

  update(dt, threat, musicPlaying) {
    if (!this.ctx || state.muted) return;
    this.noteTimer -= dt;
    this.heartbeatTimer -= dt;
    if (musicPlaying && this.noteTimer <= 0) {
      this.musicNote();
      this.noteTimer = 0.76;
    }
    const danger = clamp(threat / 200, 0, 1);
    if (danger > 0.18 && this.heartbeatTimer <= 0) {
      this.tone(58, 0.1, "sine", 0.035 + danger * 0.055);
      this.heartbeatTimer = lerp(1.15, 0.37, danger);
    }
  }
}

const audio = new AudioManager();

function playScareTone(mode) {
  if (!audio.ctx || state.muted) return;
  if (mode === "underbed") {
    audio.tone(124, 0.16, "sawtooth", 0.045);
  } else {
    audio.tone(220, 0.08, "triangle", 0.05, -150);
    audio.tone(110, 0.18, "sine", 0.035);
  }
}

function playEndTone(victory) {
  if (victory) {
    audio.tone(392, 0.3, "sine", 0.1);
    window.setTimeout(() => audio.tone(523, 0.55, "sine", 0.09), 180);
    window.setTimeout(() => audio.tone(659, 0.9, "sine", 0.07), 420);
  } else {
    audio.tone(96, 0.65, "sawtooth", 0.08);
    window.setTimeout(() => audio.tone(58, 1.1, "sine", 0.08), 210);
  }
}

function showToast(message) {
  if (state.lastToast === message) return;
  state.lastToast = message;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove("visible");
    state.lastToast = "";
  }, 2200);
}

function setControlsFromPointer() {
  state.flashlight = state.phase === "playing" && keys.has("Flashlight") && state.battery > 0;
  state.music = state.phase === "playing" && keys.has("Music");
  touchFlashlight.classList.toggle("active", state.flashlight);
  touchMusic.classList.toggle("active", state.music);
}

function resetGame() {
  state.phase = "intro";
  state.sleep = 0;
  state.battery = 100;
  state.flashlight = false;
  state.music = false;
  state.elapsed = 0;
  state.totalPlayed = 0;
  state.caughtBy = "";
  state.yaw = 0;
  state.pitch = -0.07;
  state.shake = 0;
  keys.clear();
  for (const monster of monsters) {
    monster.threat = monster.mode === "door" ? 11 : monster.mode === "closet" ? 7 : 3;
    monster.lastScare = 0;
    monster.group.position.copy(monster.base);
  }
  camera.position.set(0, 1.36, 3.72);
  startScreen.classList.add("visible");
  endScreen.classList.remove("visible");
  endPanel.classList.remove("defeat");
  hud.classList.add("hidden");
  updateUI(0);
}

function beginGame() {
  state.phase = "playing";
  state.elapsed = 0;
  startScreen.classList.remove("visible");
  endScreen.classList.remove("visible");
  hud.classList.remove("hidden");
  audio.start();
  if (canvas.requestPointerLock) canvas.requestPointerLock();
  showToast("La puerta está cerrada. La caja espera junto a ti.");
}

function endGame(victory, monsterName = "") {
  if (state.phase !== "playing") return;
  state.phase = victory ? "victory" : "defeat";
  state.flashlight = false;
  state.music = false;
  keys.delete("Flashlight");
  keys.delete("Music");
  if (document.pointerLockElement === canvas && document.exitPointerLock) document.exitPointerLock();
  const endSymbol = document.querySelector("#end-symbol");
  const endKicker = document.querySelector("#end-kicker");
  const endTitle = document.querySelector("#end-title");
  const endCopy = document.querySelector("#end-copy");
  const endStats = document.querySelector("#end-stats");
  if (victory) {
    endPanel.classList.remove("defeat");
    endSymbol.textContent = "☾";
    endKicker.textContent = "LA HABITACIÓN SE CALMÓ";
    endTitle.textContent = "Dormiste.";
    endCopy.textContent = "La caja terminó su canción. Cuando abriste los ojos, el dormitorio estaba vacío.";
  } else {
    endPanel.classList.add("defeat");
    endSymbol.textContent = "×";
    endKicker.textContent = "LA NOCHE TE ENCONTRÓ";
    endTitle.textContent = "No llegaste al amanecer.";
    endCopy.textContent = `${monsterName || "Algo"} llegó hasta la cama mientras mirabas hacia otro lado.`;
  }
  endStats.innerHTML = `
    <div class="end-stat"><strong>${state.sleep.toFixed(1)} s</strong><span>SUEÑO</span></div>
    <div class="end-stat"><strong>${Math.floor(state.totalPlayed)} s</strong><span>RESISTENCIA</span></div>
    <div class="end-stat"><strong>${Math.round(state.battery)}%</strong><span>BATERÍA</span></div>`;
  hud.classList.add("hidden");
  endScreen.classList.add("visible");
  playEndTone(victory);
}

function updateUI(totalThreat) {
  const sleepRatio = clamp(state.sleep / 25, 0, 1);
  const batteryRatio = clamp(state.battery / 100, 0, 1);
  sleepMeter.style.width = `${sleepRatio * 100}%`;
  sleepValue.textContent = `${state.sleep.toFixed(1)} / 25 s`;
  sleepStatus.textContent = state.music ? "La canción te lleva lejos" : state.sleep > 0 ? "El sueño permanece" : "La caja está en silencio";
  batteryMeter.style.width = `${batteryRatio * 100}%`;
  batteryValue.textContent = `${Math.round(state.battery)}%`;
  batteryStatus.textContent = state.battery < 9 ? "Casi agotada" : state.flashlight ? "Consumiendo" : "Recargando lentamente";
  batteryCard.classList.toggle("low", state.battery < 22);
  const normalized = totalThreat / (monsters.length * 100);
  let level = "calm";
  if (normalized > 0.7) level = "critical";
  else if (normalized > 0.42) level = "danger";
  else if (normalized > 0.2) level = "watch";
  dangerIndicator.dataset.level = level;
  dangerLabel.textContent = level === "critical" ? "ESTÁN EN LA CAMA" : level === "danger" ? "SE ACERCAN" : level === "watch" ? "ALGO SE MUEVE" : "NO ESTÁS SOLO";
}

function update(dt) {
  if (state.phase !== "playing") return;
  state.elapsed += dt;
  state.totalPlayed += dt;
  setControlsFromPointer();
  if (state.flashlight) state.battery = clamp(state.battery - dt * 8.9, 0, 100);
  else state.battery = clamp(state.battery + dt * 2.35, 0, 100);
  if (state.battery <= 0) {
    state.flashlight = false;
    keys.delete("Flashlight");
    showToast("La linterna se apagó.");
  }
  if (state.music) {
    state.sleep = clamp(state.sleep + dt, 0, 25);
    scene.userData.musicBox.userData.lid.rotation.x = damp(scene.userData.musicBox.userData.lid.rotation.x, -0.58, 4, dt);
    scene.userData.musicBox.userData.musicKey.rotation.z += dt * 8;
  } else {
    scene.userData.musicBox.userData.lid.rotation.x = damp(scene.userData.musicBox.userData.lid.rotation.x, -0.12, 4, dt);
  }
  updateCamera(dt);
  let totalThreat = 0;
  for (const monster of monsters) {
    updateMonster(monster, dt, state.elapsed);
    totalThreat += monster.threat;
  }
  const seenMonster = monsters.some((monster) => isInFlashlight(monster));
  if (seenMonster && state.flashlight) flashlightPoint.intensity *= 1.12;
  updateLights(dt, totalThreat, state.elapsed);
  audio.update(dt, totalThreat, state.music);
  updateUI(totalThreat);
  if (state.sleep >= 25) {
    endGame(true);
    return;
  }
  const caught = monsters.find((monster) => monster.threat >= 100);
  if (caught) {
    state.caughtBy = caught.name;
    state.shake = 0.2;
    endGame(false, caught.name);
  }
}

function animateScene(elapsed) {
  for (const mote of motes) {
    mote.position.y = mote.userData.baseY + Math.sin(elapsed * mote.userData.speed + mote.userData.drift) * 0.16;
    mote.position.x += Math.sin(elapsed * 0.12 + mote.userData.drift) * 0.0008;
    mote.material.opacity = 0.12 + (Math.sin(elapsed * 0.8 + mote.userData.drift) + 1) * 0.07;
  }
}

function render() {
  renderer.render(scene, camera);
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  animateScene(now / 1000);
  update(dt);
  render();
  requestAnimationFrame(frame);
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function onKeyDown(event) {
  if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.code)) event.preventDefault();
  audio.start();
  keys.add(event.code);
  if (event.code === "Space") keys.add("Flashlight");
  if (event.code === "KeyM") keys.add("Music");
  if (event.code === "KeyF" && state.phase === "playing") {
    if (keys.has("Flashlight")) keys.delete("Flashlight");
    else keys.add("Flashlight");
  }
  if (event.code === "Escape") {
    keys.delete("Flashlight");
    keys.delete("Music");
  }
}

function onKeyUp(event) {
  keys.delete(event.code);
  if (event.code === "Space") keys.delete("Flashlight");
  if (event.code === "KeyM") keys.delete("Music");
}

function onPointerDown(event) {
  if (state.phase !== "playing") return;
  dragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
  audio.start();
}

function onPointerMove(event) {
  if (!dragging || state.phase !== "playing") return;
  const dx = event.clientX - lastPointerX;
  const dy = event.clientY - lastPointerY;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  if (document.pointerLockElement === canvas) {
    state.yaw -= event.movementX * 0.0023;
    state.pitch = clamp(state.pitch - event.movementY * 0.0023, -0.58, 0.42);
  } else {
    state.yaw -= dx * 0.004;
    state.pitch = clamp(state.pitch - dy * 0.003, -0.58, 0.42);
  }
}

function bindHoldButton(button, keyName) {
  const start = (event) => {
    event.preventDefault();
    keys.add(keyName);
    audio.start();
    button.classList.add("active");
  };
  const stop = (event) => {
    event.preventDefault();
    keys.delete(keyName);
    button.classList.remove("active");
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("pointerleave", stop);
}

startButton.addEventListener("click", beginGame);
restartButton.addEventListener("click", () => { resetGame(); beginGame(); });
muteButton.addEventListener("click", () => {
  audio.start();
  audio.setMuted(!state.muted);
  muteButton.setAttribute("aria-pressed", String(state.muted));
  muteIcon.textContent = state.muted ? "⊘" : "◉";
  muteLabel.textContent = state.muted ? "SILENCIADO" : "SONIDO";
});
window.addEventListener("keydown", onKeyDown, { passive: false });
window.addEventListener("keyup", onKeyUp);
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", () => { dragging = false; });
canvas.addEventListener("pointercancel", () => { dragging = false; });
canvas.addEventListener("click", () => { if (state.phase === "playing" && canvas.requestPointerLock) canvas.requestPointerLock(); });
bindHoldButton(touchFlashlight, "Flashlight");
bindHoldButton(touchMusic, "Music");
window.addEventListener("resize", onResize);

createRoom();
onResize();
resetGame();
requestAnimationFrame(frame);
