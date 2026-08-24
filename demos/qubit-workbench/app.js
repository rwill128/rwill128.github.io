import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createCircuitWorkspace } from "./circuit.js";

const DEG = Math.PI / 180;
const state = {
  theta: 50 * DEG,
  phi: 135 * DEG,
  interaction: "state",
};

const stage = document.querySelector("#scene-stage");
const canvas = document.querySelector("#bloch-canvas");
const labelsLayer = document.querySelector("#scene-labels");
const thetaInput = document.querySelector("#theta");
const phiInput = document.querySelector("#phi");
const thetaOutput = document.querySelector("#theta-output");
const phiOutput = document.querySelector("#phi-output");
const alphaValue = document.querySelector("#alpha-value");
const betaValue = document.querySelector("#beta-value");
const probabilityZero = document.querySelector("#probability-zero");
const probabilityOne = document.querySelector("#probability-one");
const probabilityZeroBar = document.querySelector("#probability-zero-bar");
const probabilityOneBar = document.querySelector("#probability-one-bar");
const xValue = document.querySelector("#x-value");
const yValue = document.querySelector("#y-value");
const zValue = document.querySelector("#z-value");
const modeStatus = document.querySelector("#mode-status");
const thetaBadge = document.querySelector("#theta-badge");
const phiBadge = document.querySelector("#phi-badge");

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(3.45, 2.5, 4.0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 3.4;
controls.maxDistance = 7;
controls.target.set(0, 0, 0);
controls.enabled = false;

scene.add(new THREE.HemisphereLight(0xe8fff8, 0x1d2723, 1.4));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(3, 4, 5);
scene.add(keyLight);

const sphereRadius = 1.38;
const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 64, 32);
const sphereSurface = new THREE.Mesh(
  sphereGeometry,
  new THREE.MeshPhysicalMaterial({
    color: 0x91aaa2,
    transparent: true,
    opacity: 0.055,
    roughness: 0.45,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
);
scene.add(sphereSurface);

const gridMaterial = new THREE.LineBasicMaterial({
  color: 0x8da198,
  transparent: true,
  opacity: 0.28,
});
const emphasizedGridMaterial = new THREE.LineBasicMaterial({
  color: 0xc4d1ca,
  transparent: true,
  opacity: 0.6,
});

function makeLine(points, material = gridMaterial) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  return line;
}

function makeCircle(pointsFactory, material) {
  const points = [];
  for (let i = 0; i <= 128; i += 1) {
    points.push(pointsFactory((i / 128) * Math.PI * 2));
  }
  return makeLine(points, material);
}

makeCircle(
  (angle) => new THREE.Vector3(
    Math.cos(angle) * sphereRadius,
    0,
    Math.sin(angle) * sphereRadius,
  ),
  emphasizedGridMaterial,
);

for (const phi of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
  makeCircle(
    (angle) => new THREE.Vector3(
      Math.sin(angle) * Math.cos(phi) * sphereRadius,
      Math.cos(angle) * sphereRadius,
      Math.sin(angle) * Math.sin(phi) * sphereRadius,
    ),
    phi === 0 || phi === Math.PI / 2 ? emphasizedGridMaterial : gridMaterial,
  );
}

for (const latitude of [Math.PI / 4, (3 * Math.PI) / 4]) {
  const horizontalRadius = Math.sin(latitude) * sphereRadius;
  const height = Math.cos(latitude) * sphereRadius;
  makeCircle(
    (angle) => new THREE.Vector3(
      Math.cos(angle) * horizontalRadius,
      height,
      Math.sin(angle) * horizontalRadius,
    ),
    gridMaterial,
  );
}

function addAxis(from, to, color) {
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.52,
  });
  return makeLine([from, to], material);
}

const axisLength = sphereRadius * 1.25;
addAxis(
  new THREE.Vector3(-axisLength, 0, 0),
  new THREE.Vector3(axisLength, 0, 0),
  0xe05b4f,
);
addAxis(
  new THREE.Vector3(0, 0, -axisLength),
  new THREE.Vector3(0, 0, axisLength),
  0x4a8a60,
);
addAxis(
  new THREE.Vector3(0, -axisLength, 0),
  new THREE.Vector3(0, axisLength, 0),
  0x40d2d6,
);

const stateArrow = new THREE.ArrowHelper(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, 0),
  sphereRadius,
  0xff695a,
  0.22,
  0.11,
);
stateArrow.line.material.transparent = true;
stateArrow.line.visible = false;
stateArrow.cone.material.transparent = true;
stateArrow.cone.material.opacity = 0.98;
scene.add(stateArrow);

const shaftLength = sphereRadius - 0.16;
const stateShaft = new THREE.Mesh(
  new THREE.CylinderGeometry(0.018, 0.018, 1, 18),
  new THREE.MeshBasicMaterial({ color: 0xff695a }),
);
scene.add(stateShaft);

const stateTip = new THREE.Mesh(
  new THREE.SphereGeometry(0.055, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0xffb1a6 }),
);
scene.add(stateTip);

const projectionMaterial = new THREE.LineDashedMaterial({
  color: 0xd8d3bb,
  transparent: true,
  opacity: 0.5,
  dashSize: 0.06,
  gapSize: 0.045,
});
const verticalProjection = makeLine(
  [new THREE.Vector3(), new THREE.Vector3()],
  projectionMaterial,
);

const thetaMaterial = new THREE.LineBasicMaterial({ color: 0x40d2d6 });
const phiMaterial = new THREE.LineBasicMaterial({ color: 0xd59a2d });
const thetaArc = makeLine([], thetaMaterial);
const phiArc = makeLine([], phiMaterial);

function updateLineGeometry(line, points, dashed = false) {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  if (dashed) line.computeLineDistances();
}

const labelDefinitions = [
  { text: "|0⟩", point: new THREE.Vector3(0, axisLength + 0.1, 0) },
  { text: "|1⟩", point: new THREE.Vector3(0, -axisLength - 0.1, 0) },
  { text: "|+⟩", point: new THREE.Vector3(axisLength + 0.1, 0, 0) },
  { text: "|−⟩", point: new THREE.Vector3(-axisLength - 0.1, 0, 0) },
  { text: "|+i⟩", point: new THREE.Vector3(0, 0, axisLength + 0.1) },
  { text: "|−i⟩", point: new THREE.Vector3(0, 0, -axisLength - 0.1) },
  { text: "Z", point: new THREE.Vector3(0.11, axisLength * 0.77, 0), axis: true },
  { text: "X", point: new THREE.Vector3(axisLength * 0.77, 0.1, 0), axis: true },
  { text: "Y", point: new THREE.Vector3(0, 0.1, axisLength * 0.77), axis: true },
];

const projectedLabels = labelDefinitions.map((definition) => {
  const element = document.createElement("span");
  element.className = `sphere-label${definition.axis ? " axis-label" : ""}`;
  element.textContent = definition.text;
  labelsLayer.appendChild(element);
  return { ...definition, element };
});

function blochVector() {
  return {
    x: Math.sin(state.theta) * Math.cos(state.phi),
    y: Math.sin(state.theta) * Math.sin(state.phi),
    z: Math.cos(state.theta),
  };
}

function sceneVector(vector, radius = 1) {
  return new THREE.Vector3(vector.x * radius, vector.z * radius, vector.y * radius);
}

function signed(value, digits = 3) {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return normalized.toFixed(digits);
}

function formatComplex(real, imaginary) {
  const normalizedReal = Math.abs(real) < 0.0005 ? 0 : real;
  const normalizedImaginary = Math.abs(imaginary) < 0.0005 ? 0 : imaginary;
  const sign = normalizedImaginary < 0 ? "−" : "+";
  return `${normalizedReal.toFixed(3)} ${sign} ${Math.abs(normalizedImaginary).toFixed(3)}i`;
}

function updatePresetSelection() {
  const thetaDegrees = Math.round(state.theta / DEG);
  const phiDegrees = Math.round(state.phi / DEG) % 360;
  document.querySelectorAll("[data-theta]").forEach((button) => {
    const buttonTheta = Number(button.dataset.theta);
    const buttonPhi = Number(button.dataset.phi);
    const phiMatches = buttonTheta === 0 || buttonTheta === 180 || buttonPhi === phiDegrees;
    button.classList.toggle("is-active", buttonTheta === thetaDegrees && phiMatches);
  });
}

function updateState() {
  const vector = blochVector();
  const direction = sceneVector(vector).normalize();
  const tipPosition = direction.clone().multiplyScalar(sphereRadius);
  const equatorialProjection = new THREE.Vector3(tipPosition.x, 0, tipPosition.z);

  stateArrow.setDirection(direction);
  stateShaft.position.copy(direction).multiplyScalar(shaftLength / 2);
  stateShaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  stateShaft.scale.set(1, shaftLength, 1);
  stateTip.position.copy(tipPosition);
  updateLineGeometry(verticalProjection, [tipPosition, equatorialProjection], true);

  const thetaPoints = [];
  const thetaRadius = 0.48;
  for (let i = 0; i <= 40; i += 1) {
    const angle = state.theta * (i / 40);
    thetaPoints.push(new THREE.Vector3(
      Math.sin(angle) * Math.cos(state.phi) * thetaRadius,
      Math.cos(angle) * thetaRadius,
      Math.sin(angle) * Math.sin(state.phi) * thetaRadius,
    ));
  }
  updateLineGeometry(thetaArc, thetaPoints);

  const phiPoints = [];
  const phiRadius = 0.72;
  for (let i = 0; i <= 48; i += 1) {
    const angle = state.phi * (i / 48);
    phiPoints.push(new THREE.Vector3(
      Math.cos(angle) * phiRadius,
      0,
      Math.sin(angle) * phiRadius,
    ));
  }
  updateLineGeometry(phiArc, phiPoints);

  const alpha = Math.cos(state.theta / 2);
  const betaMagnitude = Math.sin(state.theta / 2);
  const betaReal = betaMagnitude * Math.cos(state.phi);
  const betaImaginary = betaMagnitude * Math.sin(state.phi);
  const pZero = alpha ** 2;
  const pOne = betaMagnitude ** 2;

  const thetaDegrees = Math.round(state.theta / DEG);
  const phiDegrees = Math.round(state.phi / DEG) % 360;
  thetaInput.value = String(thetaDegrees);
  phiInput.value = String(phiDegrees);
  thetaOutput.value = `${thetaDegrees}°`;
  phiOutput.value = `${phiDegrees}°`;
  alphaValue.textContent = alpha.toFixed(3);
  betaValue.textContent = formatComplex(betaReal, betaImaginary);
  probabilityZero.textContent = `${(pZero * 100).toFixed(1)}%`;
  probabilityOne.textContent = `${(pOne * 100).toFixed(1)}%`;
  probabilityZeroBar.style.width = `${pZero * 100}%`;
  probabilityOneBar.style.width = `${pOne * 100}%`;
  xValue.textContent = signed(vector.x);
  yValue.textContent = signed(vector.y);
  zValue.textContent = signed(vector.z);
  updatePresetSelection();

  thetaBadge.dataset.point = JSON.stringify(
    thetaPoints[Math.max(1, Math.floor(thetaPoints.length * 0.55))].toArray(),
  );
  phiBadge.dataset.point = JSON.stringify(
    phiPoints[Math.max(1, Math.floor(phiPoints.length * 0.68))].toArray(),
  );
}

function setState(thetaDegrees, phiDegrees) {
  state.theta = THREE.MathUtils.clamp(thetaDegrees, 0, 180) * DEG;
  state.phi = (((phiDegrees % 360) + 360) % 360) * DEG;
  updateState();
}

thetaInput.addEventListener("input", () => {
  setState(Number(thetaInput.value), Number(phiInput.value));
});

phiInput.addEventListener("input", () => {
  setState(Number(thetaInput.value), Number(phiInput.value));
});

document.querySelectorAll("[data-theta]").forEach((button) => {
  button.addEventListener("click", () => {
    setState(Number(button.dataset.theta), Number(button.dataset.phi));
  });
});

document.querySelector("#random-state").addEventListener("click", () => {
  const z = Math.random() * 2 - 1;
  const theta = Math.acos(z) / DEG;
  const phi = Math.random() * 360;
  setState(theta, phi);
});

document.querySelectorAll("input[name='interaction']").forEach((input) => {
  input.addEventListener("change", () => {
    state.interaction = input.value;
    controls.enabled = state.interaction === "view";
    canvas.classList.toggle("is-view-mode", controls.enabled);
    modeStatus.textContent = state.interaction === "view" ? "VIEW" : "STATE";
  });
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let draggingState = false;

function updateStateFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersection = raycaster.intersectObject(sphereSurface, false)[0];
  if (!intersection) return false;

  const point = intersection.point.normalize();
  const theta = Math.acos(THREE.MathUtils.clamp(point.y, -1, 1));
  const phi = Math.atan2(point.z, point.x);
  setState(theta / DEG, phi / DEG);
  return true;
}

canvas.addEventListener("pointerdown", (event) => {
  if (state.interaction !== "state") return;
  draggingState = updateStateFromPointer(event);
  if (draggingState) canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (draggingState) updateStateFromPointer(event);
});

function stopDragging(event) {
  if (!draggingState) return;
  draggingState = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

canvas.addEventListener("pointerup", stopDragging);
canvas.addEventListener("pointercancel", stopDragging);

function projectToStage(point, element) {
  const projected = point.clone().project(camera);
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
  element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
  element.style.opacity = projected.z > 1 ? "0" : "1";
}

function updateOverlayPositions() {
  projectedLabels.forEach(({ point, element }) => projectToStage(point, element));

  const thetaPoint = JSON.parse(thetaBadge.dataset.point || "[0,0,0]");
  const phiPoint = JSON.parse(phiBadge.dataset.point || "[0,0,0]");
  projectToStage(new THREE.Vector3(...thetaPoint), thetaBadge);
  projectToStage(new THREE.Vector3(...phiPoint), phiBadge);
}

function resizeRenderer() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  const expectedWidth = Math.floor(width * pixelRatio);
  const expectedHeight = Math.floor(height * pixelRatio);
  if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
}

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(stage);

function animate() {
  resizeRenderer();
  controls.update();
  updateOverlayPositions();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateState();
animate();

const stateWorkspace = document.querySelector("#state-workspace");
const circuitWorkspace = document.querySelector("#circuit-workspace");
const showStateButton = document.querySelector("#show-state-workspace");
const showCircuitButton = document.querySelector("#show-circuit-workspace");
const stateContext = document.querySelector("#state-context");

function currentQubitState() {
  return { theta: state.theta, phi: state.phi };
}

function showWorkspace(workspace) {
  const showingCircuit = workspace === "circuit";
  stateWorkspace.hidden = showingCircuit;
  circuitWorkspace.hidden = !showingCircuit;
  showStateButton.classList.toggle("is-active", !showingCircuit);
  showCircuitButton.classList.toggle("is-active", showingCircuit);
  showStateButton.setAttribute("aria-pressed", String(!showingCircuit));
  showCircuitButton.setAttribute("aria-pressed", String(showingCircuit));
  document.body.classList.toggle("circuit-active", showingCircuit);
  if (!showingCircuit) resizeRenderer();
}

const circuitController = createCircuitWorkspace({
  initialQubit: currentQubitState(),
  onEditQubit(row, qubit) {
    setState(qubit.theta / DEG, qubit.phi / DEG);
    stateContext.textContent = `Pure state · q${row} input`;
    showWorkspace("state");
  },
});

showCircuitButton.addEventListener("click", () => {
  if (!circuitWorkspace.hidden) return;
  const active = circuitController.getActiveQubit();
  circuitController.captureQubit(active.row, currentQubitState());
  showWorkspace("circuit");
});

showStateButton.addEventListener("click", () => {
  if (!stateWorkspace.hidden) return;
  const active = circuitController.getActiveQubit();
  setState(active.state.theta / DEG, active.state.phi / DEG);
  stateContext.textContent = `Pure state · q${active.row} input`;
  showWorkspace("state");
});
