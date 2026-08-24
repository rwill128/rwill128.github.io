import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  MATRICES,
  applyControlledX,
  applyControlledZ,
  applySingleQubitGate,
  applySwap,
  basisProbabilities,
  initialStateVector,
  reducedBlochVector,
  rotationMatrix,
  stateNorm,
} from "../qubit-workbench/quantum.js";

const EPSILON = 1e-9;
const DEG = Math.PI / 180;

function complex(re = 0, im = 0) {
  return { re, im };
}

function cloneVector(vector) {
  return vector.map((value) => complex(value.re, value.im));
}

function signed(value, digits = 3) {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return normalized.toFixed(digits).replace("-", "−");
}

function formatComplex(value) {
  const re = Math.abs(value.re) < 0.0005 ? 0 : value.re;
  const im = Math.abs(value.im) < 0.0005 ? 0 : value.im;
  if (im === 0) return signed(re);
  if (re === 0) return `${signed(im)}i`;
  return `${signed(re)} ${im < 0 ? "−" : "+"} ${Math.abs(im).toFixed(3)}i`;
}

function multiply(left, right) {
  return complex(
    left.re * right.re - left.im * right.im,
    left.re * right.im + left.im * right.re,
  );
}

function subtract(left, right) {
  return complex(left.re - right.re, left.im - right.im);
}

function magnitude(value) {
  return Math.sqrt(value.re * value.re + value.im * value.im);
}

function concurrence(vector) {
  return Math.min(1, 2 * magnitude(subtract(
    multiply(vector[0], vector[3]),
    multiply(vector[1], vector[2]),
  )));
}

function sceneVector(vector, radius = 1) {
  return new THREE.Vector3(vector.x * radius, vector.z * radius, vector.y * radius);
}

class BlochRenderer {
  constructor({ stage, canvas, labelsLayer, color }) {
    this.stage = stage;
    this.canvas = canvas;
    this.labelsLayer = labelsLayer;
    this.radius = 1.12;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(3.35, 2.35, 4.05);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    this.controls.minDistance = 3.1;
    this.controls.maxDistance = 6.5;

    this.scene.add(new THREE.HemisphereLight(0xe8fff8, 0x1d2723, 1.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(3, 4, 5);
    this.scene.add(keyLight);

    const surface = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 52, 28),
      new THREE.MeshPhysicalMaterial({
        color: 0x91aaa2,
        transparent: true,
        opacity: 0.055,
        roughness: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.scene.add(surface);

    this.gridMaterial = new THREE.LineBasicMaterial({
      color: 0x8da198,
      transparent: true,
      opacity: 0.26,
    });
    this.emphasizedGridMaterial = new THREE.LineBasicMaterial({
      color: 0xc4d1ca,
      transparent: true,
      opacity: 0.56,
    });

    this.makeCircle((angle) => new THREE.Vector3(
      Math.cos(angle) * this.radius,
      0,
      Math.sin(angle) * this.radius,
    ), this.emphasizedGridMaterial);

    for (const phi of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      this.makeCircle((angle) => new THREE.Vector3(
        Math.sin(angle) * Math.cos(phi) * this.radius,
        Math.cos(angle) * this.radius,
        Math.sin(angle) * Math.sin(phi) * this.radius,
      ), phi === 0 || phi === Math.PI / 2 ? this.emphasizedGridMaterial : this.gridMaterial);
    }

    for (const latitude of [Math.PI / 4, (3 * Math.PI) / 4]) {
      const horizontalRadius = Math.sin(latitude) * this.radius;
      const height = Math.cos(latitude) * this.radius;
      this.makeCircle((angle) => new THREE.Vector3(
        Math.cos(angle) * horizontalRadius,
        height,
        Math.sin(angle) * horizontalRadius,
      ), this.gridMaterial);
    }

    const axisLength = this.radius * 1.24;
    this.addAxis(new THREE.Vector3(-axisLength, 0, 0), new THREE.Vector3(axisLength, 0, 0), 0xe05b4f);
    this.addAxis(new THREE.Vector3(0, 0, -axisLength), new THREE.Vector3(0, 0, axisLength), 0x4a8a60);
    this.addAxis(new THREE.Vector3(0, -axisLength, 0), new THREE.Vector3(0, axisLength, 0), 0x40d2d6);

    this.shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 1, 16),
      new THREE.MeshBasicMaterial({ color }),
    );
    this.tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 20, 14),
      new THREE.MeshBasicMaterial({ color }),
    );
    this.scene.add(this.shaft, this.tip);

    this.previousLine = this.makeLine(
      [new THREE.Vector3(), new THREE.Vector3()],
      new THREE.LineDashedMaterial({
        color: 0xd59a2d,
        transparent: true,
        opacity: 0.68,
        dashSize: 0.06,
        gapSize: 0.04,
      }),
    );
    this.previousLine.visible = false;
    this.previousTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xd59a2d }),
    );
    this.previousTip.visible = false;
    this.scene.add(this.previousTip);

    this.centerPoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 18, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    );
    this.centerPoint.visible = false;
    this.scene.add(this.centerPoint);

    const labelDefinitions = [
      { text: "|0⟩", point: new THREE.Vector3(0, axisLength + 0.08, 0) },
      { text: "|1⟩", point: new THREE.Vector3(0, -axisLength - 0.08, 0) },
      { text: "|+⟩", point: new THREE.Vector3(axisLength + 0.08, 0, 0) },
      { text: "|−⟩", point: new THREE.Vector3(-axisLength - 0.08, 0, 0) },
      { text: "|+i⟩", point: new THREE.Vector3(0, 0, axisLength + 0.08) },
      { text: "|−i⟩", point: new THREE.Vector3(0, 0, -axisLength - 0.08) },
      { text: "Z", point: new THREE.Vector3(0.08, axisLength * 0.75, 0), axis: true },
      { text: "X", point: new THREE.Vector3(axisLength * 0.75, 0.08, 0), axis: true },
      { text: "Y", point: new THREE.Vector3(0, 0.08, axisLength * 0.75), axis: true },
    ];
    this.labels = labelDefinitions.map((definition) => {
      const element = document.createElement("span");
      element.className = `sphere-label${definition.axis ? " axis-label" : ""}`;
      element.textContent = definition.text;
      labelsLayer.appendChild(element);
      return { ...definition, element };
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(stage);
  }

  makeLine(points, material = this.gridMaterial) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    return line;
  }

  makeCircle(factory, material) {
    const points = [];
    for (let index = 0; index <= 96; index += 1) {
      points.push(factory((index / 96) * Math.PI * 2));
    }
    return this.makeLine(points, material);
  }

  addAxis(from, to, color) {
    this.makeLine([from, to], new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
    }));
  }

  setLine(line, points, dashed = false) {
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    if (dashed) line.computeLineDistances();
  }

  setArrow(vector, shaft, tip) {
    const length = Math.min(1, Math.max(0, vector.length));
    if (length < EPSILON) {
      shaft.visible = false;
      tip.visible = false;
      return;
    }
    const direction = sceneVector(vector).normalize();
    const arrowLength = this.radius * length;
    shaft.visible = true;
    tip.visible = true;
    shaft.position.copy(direction).multiplyScalar(arrowLength / 2);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    shaft.scale.set(1, arrowLength, 1);
    tip.position.copy(direction).multiplyScalar(arrowLength);
  }

  update(vector, previousVector = null) {
    this.setArrow(vector, this.shaft, this.tip);
    this.centerPoint.visible = vector.length < EPSILON;
    if (previousVector && previousVector.length > EPSILON) {
      const previousTip = sceneVector(previousVector).normalize()
        .multiplyScalar(this.radius * Math.min(1, previousVector.length));
      this.previousLine.visible = true;
      this.previousTip.visible = true;
      this.previousTip.position.copy(previousTip);
      this.setLine(this.previousLine, [new THREE.Vector3(), previousTip], true);
    } else {
      this.previousLine.visible = false;
      this.previousTip.visible = false;
    }
  }

  resize() {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const expectedWidth = Math.floor(width * pixelRatio);
    const expectedHeight = Math.floor(height * pixelRatio);
    if (this.canvas.width === expectedWidth && this.canvas.height === expectedHeight) return;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  projectLabels() {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    this.labels.forEach(({ point, element }) => {
      const projected = point.clone().project(this.camera);
      element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      element.style.opacity = projected.z > 1 ? "0" : "1";
    });
  }

  render() {
    this.resize();
    this.controls.update();
    this.projectLabels();
    this.renderer.render(this.scene, this.camera);
  }
}

const model = {
  vector: [complex(1), complex(), complex(), complex()],
  target: 0,
  preparation: [
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ],
  previousReduced: null,
  history: [],
  cursor: 0,
};

const renderers = [
  new BlochRenderer({
    stage: document.querySelector("#q0-stage"),
    canvas: document.querySelector("#q0-canvas"),
    labelsLayer: document.querySelector("#q0-labels"),
    color: 0xff695a,
  }),
  new BlochRenderer({
    stage: document.querySelector("#q1-stage"),
    canvas: document.querySelector("#q1-canvas"),
    labelsLayer: document.querySelector("#q1-labels"),
    color: 0x40d2d6,
  }),
];

const amplitudeList = document.querySelector("#amplitude-list");
const outcomeList = document.querySelector("#outcome-list");
const entanglementStatus = document.querySelector("#entanglement-status");
const concurrenceOutput = document.querySelector("#concurrence");
const q0Purity = document.querySelector("#q0-purity");
const q1Purity = document.querySelector("#q1-purity");
const historyList = document.querySelector("#history-list");
const historyCount = document.querySelector("#history-count");
const historyPosition = document.querySelector("#history-position");
const currentOperation = document.querySelector("#current-operation");
const undoButton = document.querySelector("#undo");
const redoButton = document.querySelector("#redo");
const inputTheta = document.querySelector("#input-theta");
const inputPhi = document.querySelector("#input-phi");
const inputThetaOutput = document.querySelector("#input-theta-output");
const inputPhiOutput = document.querySelector("#input-phi-output");
const rotationAngle = document.querySelector("#rotation-angle");
const rotationAngleOutput = document.querySelector("#rotation-angle-output");

function currentReducedStates() {
  return [0, 1].map((qubit) => reducedBlochVector(model.vector, 2, qubit));
}

function renderQubitReadout(index, vector) {
  const values = [vector.x, vector.y, vector.z, vector.length];
  const readout = document.querySelector(`#q${index}-readout`);
  [...readout.querySelectorAll("dd")].forEach((element, valueIndex) => {
    element.textContent = signed(values[valueIndex]);
  });
  document.querySelector(`#q${index}-state-type`).textContent = vector.length > 0.9995
    ? "Pure"
    : vector.length < 0.0005 ? "Maximally mixed" : "Mixed";
}

function renderJointState() {
  amplitudeList.innerHTML = "";
  model.vector.forEach((amplitude, basis) => {
    const row = document.createElement("div");
    row.className = `amplitude-row${magnitude(amplitude) < 0.0005 ? " is-zero" : ""}`;
    const coefficient = document.createElement("code");
    coefficient.textContent = formatComplex(amplitude);
    const ket = document.createElement("span");
    ket.textContent = `|${basis.toString(2).padStart(2, "0")}⟩`;
    row.append(coefficient, ket);
    amplitudeList.appendChild(row);
  });

  outcomeList.innerHTML = "";
  basisProbabilities(model.vector, 2).forEach((entry) => {
    const row = document.createElement("div");
    row.className = "outcome-row";
    const heading = document.createElement("div");
    heading.className = "outcome-heading";
    heading.innerHTML = `<span>|${entry.basis}⟩</span><strong>${(entry.probability * 100).toFixed(1)}%</strong>`;
    const track = document.createElement("div");
    track.className = "outcome-track";
    const bar = document.createElement("span");
    bar.style.width = `${entry.probability * 100}%`;
    track.appendChild(bar);
    row.append(heading, track);
    outcomeList.appendChild(row);
  });
}

function renderHistory() {
  historyList.innerHTML = "";
  model.history.forEach((entry, index) => {
    const item = document.createElement("li");
    item.dataset.step = String(index);
    item.textContent = entry.label;
    item.classList.toggle("is-current", index === model.cursor);
    historyList.appendChild(item);
  });
  const operationCount = model.history.length - 1;
  historyCount.textContent = `${operationCount} gate${operationCount === 1 ? "" : "s"}`;
  historyPosition.textContent = model.cursor === 0
    ? "Initial state"
    : `Step ${model.cursor} of ${operationCount}`;
  currentOperation.textContent = model.history[model.cursor].label;
  undoButton.disabled = model.cursor === 0;
  redoButton.disabled = model.cursor === model.history.length - 1;
}

function refresh() {
  const norm = stateNorm(model.vector);
  if (Math.abs(norm - 1) > EPSILON) {
    throw new Error(`Two-qubit state lost normalization: ${norm}`);
  }
  const reduced = currentReducedStates();
  reduced.forEach((vector, index) => {
    renderers[index].update(vector, model.previousReduced?.[index] ?? null);
    renderQubitReadout(index, vector);
  });
  renderJointState();
  renderHistory();

  const amount = concurrence(model.vector);
  const label = amount > 0.9995
    ? "Maximally entangled"
    : amount > 0.0005 ? "Entangled" : "Product state";
  entanglementStatus.querySelector("span").textContent = label;
  entanglementStatus.querySelector("strong").textContent = `C = ${amount.toFixed(3)}`;
  concurrenceOutput.textContent = amount.toFixed(3);
  q0Purity.textContent = reduced[0].purity.toFixed(3);
  q1Purity.textContent = reduced[1].purity.toFixed(3);
}

function resetState({ refreshNow = true, resetPreparation = true } = {}) {
  if (resetPreparation) {
    model.preparation = [
      { theta: 0, phi: 0 },
      { theta: 0, phi: 0 },
    ];
    syncPreparationControls();
  }
  model.vector = [complex(1), complex(), complex(), complex()];
  model.previousReduced = null;
  model.history = [{ vector: cloneVector(model.vector), label: "|00⟩" }];
  model.cursor = 0;
  if (refreshNow) refresh();
}

function syncPreparationControls() {
  const selected = model.preparation[model.target];
  inputTheta.value = String(selected.theta);
  inputPhi.value = String(selected.phi);
  inputThetaOutput.value = `${selected.theta}°`;
  inputPhiOutput.value = `${selected.phi}°`;
}

function updatePreparedCoordinate(coordinate, value) {
  model.preparation[model.target][coordinate] = value;
  syncPreparationControls();
}

function prepareProductInput() {
  model.previousReduced = currentReducedStates();
  model.vector = initialStateVector(model.preparation.map((qubit) => ({
    theta: qubit.theta * DEG,
    phi: qubit.phi * DEG,
  })));
  model.history = [{ vector: cloneVector(model.vector), label: "Prepared product input" }];
  model.cursor = 0;
  refresh();
}

function applyOperation(label, transform, { refreshNow = true } = {}) {
  const previousReduced = currentReducedStates();
  const next = transform(cloneVector(model.vector));
  const norm = stateNorm(next);
  if (Math.abs(norm - 1) > EPSILON) {
    throw new Error(`${label} produced a non-unit state: ${norm}`);
  }
  model.history = model.history.slice(0, model.cursor + 1);
  model.vector = next;
  model.previousReduced = previousReduced;
  model.history.push({ vector: cloneVector(next), label });
  model.cursor += 1;
  if (refreshNow) refresh();
}

function moveHistory(offset) {
  const nextCursor = model.cursor + offset;
  if (nextCursor < 0 || nextCursor >= model.history.length) return;
  model.previousReduced = currentReducedStates();
  model.cursor = nextCursor;
  model.vector = cloneVector(model.history[nextCursor].vector);
  refresh();
}

function loadSequence(operations) {
  resetState({ refreshNow: false });
  operations.forEach((operation, index) => {
    applyOperation(operation.label, operation.transform, {
      refreshNow: index === operations.length - 1,
    });
  });
}

document.querySelectorAll("input[name='target']").forEach((input) => {
  input.addEventListener("change", () => {
    model.target = Number(input.value);
    syncPreparationControls();
  });
});

inputTheta.addEventListener("input", () => {
  updatePreparedCoordinate("theta", Number(inputTheta.value));
});

inputPhi.addEventListener("input", () => {
  updatePreparedCoordinate("phi", Number(inputPhi.value));
});

document.querySelector("#prepare-input").addEventListener("click", prepareProductInput);

document.querySelectorAll("[data-single-gate]").forEach((button) => {
  button.addEventListener("click", () => {
    const gate = button.dataset.singleGate;
    const target = model.target;
    const label = `${gate === "SDG" ? "S†" : gate === "TDG" ? "T†" : gate} q${target}`;
    applyOperation(label, (vector) => applySingleQubitGate(vector, 2, target, MATRICES[gate]));
  });
});

rotationAngle.addEventListener("input", () => {
  rotationAngleOutput.value = `${rotationAngle.value}°`;
});

document.querySelectorAll("[data-rotation]").forEach((button) => {
  button.addEventListener("click", () => {
    const axis = button.dataset.rotation;
    const target = model.target;
    const angleDegrees = Number(rotationAngle.value);
    const label = `R${axis.toLowerCase()}(${angleDegrees}°) q${target}`;
    applyOperation(label, (vector) => applySingleQubitGate(
      vector,
      2,
      target,
      rotationMatrix(axis, angleDegrees * DEG),
    ));
  });
});

const pairOperations = {
  CNOT01: {
    label: "CNOT q0→q1",
    transform: (vector) => applyControlledX(vector, 2, 0, 1),
  },
  CNOT10: {
    label: "CNOT q1→q0",
    transform: (vector) => applyControlledX(vector, 2, 1, 0),
  },
  CZ: {
    label: "CZ q0↔q1",
    transform: (vector) => applyControlledZ(vector, 2, 0, 1),
  },
  SWAP: {
    label: "SWAP q0↔q1",
    transform: (vector) => applySwap(vector, 2, 0, 1),
  },
};

document.querySelectorAll("[data-pair-gate]").forEach((button) => {
  button.addEventListener("click", () => {
    const operation = pairOperations[button.dataset.pairGate];
    applyOperation(operation.label, operation.transform);
  });
});

document.querySelector("#preset-bell").addEventListener("click", () => {
  loadSequence([
    { label: "H q0", transform: (vector) => applySingleQubitGate(vector, 2, 0, MATRICES.H) },
    { label: "CNOT q0→q1", transform: pairOperations.CNOT01.transform },
  ]);
});

document.querySelector("#preset-plus").addEventListener("click", () => {
  loadSequence([
    { label: "H q0", transform: (vector) => applySingleQubitGate(vector, 2, 0, MATRICES.H) },
    { label: "H q1", transform: (vector) => applySingleQubitGate(vector, 2, 1, MATRICES.H) },
  ]);
});

document.querySelector("#preset-01").addEventListener("click", () => {
  loadSequence([
    { label: "X q1", transform: (vector) => applySingleQubitGate(vector, 2, 1, MATRICES.X) },
  ]);
});

undoButton.addEventListener("click", () => moveHistory(-1));
redoButton.addEventListener("click", () => moveHistory(1));
document.querySelector("#reset").addEventListener("click", () => resetState());

function animate() {
  renderers.forEach((renderer) => renderer.render());
  requestAnimationFrame(animate);
}

resetState();
animate();
