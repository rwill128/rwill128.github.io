import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  basisProbabilities,
  reducedBlochVector,
  simulateCircuit,
  stateNorm,
} from "../qubit-workbench/quantum.js?v=20260824-2";
import {
  gates as operationGates,
  steps as operationSteps,
} from "./operation-data.js?v=20260824-2";

const EPSILON = 1e-9;
const QUBIT_COUNT = 7;
const QUBIT_LABELS = ["c0", "c1", "c2", "w0", "w1", "w2", "w3"];
const COUNTING_COLOR = 0xff695a;
const WORK_COLOR = 0x40d2d6;

const qubits = Array.from({ length: QUBIT_COUNT }, () => ({ theta: 0, phi: 0 }));
const gates = operationGates;
const steps = operationSteps;

const stage = document.querySelector(".quantum-stage");
const canvas = document.querySelector("#tour-canvas");
const labelsLayer = document.querySelector("#qubit-labels");
const sceneKicker = document.querySelector("#scene-kicker");
const sceneTitle = document.querySelector("#scene-title");
const operationLabel = document.querySelector("#operation-label");
const stepNumber = document.querySelector("#step-number");
const guideHeading = document.querySelector("#guide-heading");
const stepBody = document.querySelector("#step-body");
const stateStageLabel = document.querySelector("#state-stage-label");
const equationList = document.querySelector("#equation-list");
const stepFacts = document.querySelector("#step-facts");
const periodTraceStatus = document.querySelector("#period-trace-status");
const periodTraceCopy = document.querySelector("#period-trace-copy");
const periodTraceVisual = document.querySelector("#period-trace-visual");
const nonzeroCount = document.querySelector("#nonzero-count");
const countingDistribution = document.querySelector("#counting-distribution");
const basisAmplitudes = document.querySelector("#basis-amplitudes");
const basisDetails = document.querySelector(".basis-details");
const previousStepButton = document.querySelector("#previous-step");
const nextStepButton = document.querySelector("#next-step");
const stepTrack = document.querySelector("#step-track");
const stepProgressLabel = document.querySelector("#step-progress-label");

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
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = true;
controls.minDistance = 7;
controls.maxDistance = 30;
controls.target.set(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xe8fff8, 0x1d2723, 1.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
keyLight.position.set(4, 6, 8);
scene.add(keyLight);

const gridMaterial = new THREE.LineBasicMaterial({
  color: 0x8da198,
  transparent: true,
  opacity: 0.25,
});
const emphasizedGridMaterial = new THREE.LineBasicMaterial({
  color: 0xc4d1ca,
  transparent: true,
  opacity: 0.5,
});

function complexMagnitude(value) {
  return Math.sqrt(value.re * value.re + value.im * value.im);
}

function formatNumber(value, digits = 3) {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return normalized.toFixed(digits).replace("-", "−");
}

function formatComplex(value) {
  const re = Math.abs(value.re) < 0.0005 ? 0 : value.re;
  const im = Math.abs(value.im) < 0.0005 ? 0 : value.im;
  if (im === 0) return formatNumber(re);
  if (re === 0) return `${formatNumber(im)}i`;
  return `${formatNumber(re)} ${im < 0 ? "−" : "+"} ${Math.abs(im).toFixed(3)}i`;
}

function sceneVector(vector) {
  return new THREE.Vector3(vector.x, vector.z, vector.y);
}

function vectorsEqual(left, right) {
  return left.every((value, index) => (
    Math.abs(value.re - right[index].re) < EPSILON
    && Math.abs(value.im - right[index].im) < EPSILON
  ));
}

function makeLine(parent, points, material) {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material,
  );
  parent.add(line);
  return line;
}

function replaceLineGeometry(line, points, dashed = false) {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  if (dashed) line.computeLineDistances();
}

class QubitGlyph {
  constructor(label, index, color) {
    this.label = label;
    this.index = index;
    this.radius = 0.78;
    this.group = new THREE.Group();
    this.displayVector = { x: 0, y: 0, z: 1, length: 1 };
    this.targetVector = { ...this.displayVector };
    this.targetScale = 1;
    scene.add(this.group);

    this.surfaceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x91aaa2,
      transparent: true,
      opacity: 0.055,
      roughness: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.group.add(new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 44, 24),
      this.surfaceMaterial,
    ));

    this.gridLines = [];
    this.addCircle((angle) => new THREE.Vector3(
      Math.cos(angle) * this.radius,
      0,
      Math.sin(angle) * this.radius,
    ), emphasizedGridMaterial);
    for (const phi of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
      this.addCircle((angle) => new THREE.Vector3(
        Math.sin(angle) * Math.cos(phi) * this.radius,
        Math.cos(angle) * this.radius,
        Math.sin(angle) * Math.sin(phi) * this.radius,
      ), phi === 0 || phi === Math.PI / 2 ? emphasizedGridMaterial : gridMaterial);
    }
    for (const latitude of [Math.PI / 4, (3 * Math.PI) / 4]) {
      const horizontalRadius = Math.sin(latitude) * this.radius;
      const height = Math.cos(latitude) * this.radius;
      this.addCircle((angle) => new THREE.Vector3(
        Math.cos(angle) * horizontalRadius,
        height,
        Math.sin(angle) * horizontalRadius,
      ), gridMaterial);
    }

    const axisLength = this.radius * 1.16;
    this.addAxis(new THREE.Vector3(-axisLength, 0, 0), new THREE.Vector3(axisLength, 0, 0), 0xe05b4f);
    this.addAxis(new THREE.Vector3(0, 0, -axisLength), new THREE.Vector3(0, 0, axisLength), 0x4a8a60);
    this.addAxis(new THREE.Vector3(0, -axisLength, 0), new THREE.Vector3(0, axisLength, 0), 0x40d2d6);

    this.shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 1, 14),
      new THREE.MeshBasicMaterial({ color }),
    );
    this.tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 18, 12),
      new THREE.MeshBasicMaterial({ color }),
    );
    this.group.add(this.shaft, this.tip);

    this.centerPoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 18, 12),
      new THREE.MeshBasicMaterial({ color }),
    );
    this.centerPoint.visible = false;
    this.group.add(this.centerPoint);

    this.previousLine = makeLine(
      this.group,
      [new THREE.Vector3(), new THREE.Vector3()],
      new THREE.LineDashedMaterial({
        color: 0xd59a2d,
        transparent: true,
        opacity: 0.72,
        dashSize: 0.055,
        gapSize: 0.035,
      }),
    );
    this.previousLine.visible = false;
    this.previousTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xd59a2d }),
    );
    this.previousTip.visible = false;
    this.group.add(this.previousTip);

    this.focusRing = new THREE.Mesh(
      new THREE.TorusGeometry(this.radius * 1.2, 0.012, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0xd59a2d,
        transparent: true,
        opacity: 0,
      }),
    );
    this.focusRing.rotation.x = Math.PI / 2;
    this.group.add(this.focusRing);

    this.labelElement = document.createElement("span");
    this.labelElement.className = "qubit-label";
    this.labelElement.innerHTML = `<strong>${label}</strong><small>Pure · r 1.000</small>`;
    labelsLayer.appendChild(this.labelElement);
  }

  addCircle(factory, material) {
    const points = [];
    for (let point = 0; point <= 72; point += 1) {
      points.push(factory((point / 72) * Math.PI * 2));
    }
    this.gridLines.push(makeLine(this.group, points, material));
  }

  addAxis(from, to, color) {
    makeLine(this.group, [from, to], new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.45,
    }));
  }

  update(vector, previousVector, focused) {
    this.targetVector = { ...vector };
    this.targetScale = focused ? 1.09 : 1;
    this.focusRing.material.opacity = focused ? 0.82 : 0;
    this.surfaceMaterial.opacity = focused ? 0.11 : 0.055;
    this.labelElement.classList.toggle("is-focused", focused);

    if (previousVector && previousVector.length > EPSILON) {
      const previousTip = sceneVector(previousVector).normalize()
        .multiplyScalar(this.radius * Math.min(1, previousVector.length));
      this.previousLine.visible = true;
      this.previousTip.visible = true;
      this.previousTip.position.copy(previousTip);
      replaceLineGeometry(this.previousLine, [new THREE.Vector3(), previousTip], true);
    } else {
      this.previousLine.visible = false;
      this.previousTip.visible = false;
    }

    const stateType = vector.length > 0.9995
      ? "Pure"
      : vector.length < 0.0005 ? "Maximally mixed" : "Mixed";
    this.labelElement.querySelector("small").textContent = `${stateType} · r ${vector.length.toFixed(3)}`;
  }

  render() {
    for (const key of ["x", "y", "z", "length"]) {
      this.displayVector[key] += (this.targetVector[key] - this.displayVector[key]) * 0.14;
    }
    const scale = this.group.scale.x + (this.targetScale - this.group.scale.x) * 0.12;
    this.group.scale.setScalar(scale);

    const length = Math.min(1, Math.max(0, this.displayVector.length));
    if (length < 0.002) {
      this.shaft.visible = false;
      this.tip.visible = false;
      this.centerPoint.visible = true;
      return;
    }
    const direction = sceneVector(this.displayVector).normalize();
    const arrowLength = this.radius * length;
    this.shaft.visible = true;
    this.tip.visible = true;
    this.centerPoint.visible = false;
    this.shaft.position.copy(direction).multiplyScalar(arrowLength / 2);
    this.shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.shaft.scale.set(1, arrowLength, 1);
    this.tip.position.copy(direction).multiplyScalar(arrowLength);
  }

  projectLabel() {
    const worldPosition = this.group.position.clone();
    worldPosition.y += this.radius * this.group.scale.y + 0.38;
    const projected = worldPosition.project(camera);
    this.labelElement.style.left = `${(projected.x * 0.5 + 0.5) * stage.clientWidth}px`;
    this.labelElement.style.top = `${(-projected.y * 0.5 + 0.5) * stage.clientHeight}px`;
    const visible = projected.z > -1 && projected.z < 1;
    this.labelElement.style.opacity = visible ? "1" : "0";
  }
}

const glyphs = QUBIT_LABELS.map((label, index) => new QubitGlyph(
  label,
  index,
  index < 3 ? COUNTING_COLOR : WORK_COLOR,
));

const registerLines = [
  makeLine(scene, [new THREE.Vector3(), new THREE.Vector3()], new THREE.LineBasicMaterial({
    color: COUNTING_COLOR,
    transparent: true,
    opacity: 0.22,
  })),
  makeLine(scene, [new THREE.Vector3(), new THREE.Vector3()], new THREE.LineBasicMaterial({
    color: WORK_COLOR,
    transparent: true,
    opacity: 0.22,
  })),
];

function layoutQubits() {
  const narrow = stage.clientWidth < 720;
  const positions = narrow
    ? [
      [-2.15, 2.35, 0], [0, 2.35, 0], [2.15, 2.35, 0],
      [-3.05, -0.85, 0], [-1.02, -0.85, 0], [1.02, -0.85, 0], [3.05, -0.85, 0],
    ]
    : [
      [-3.2, 0.45, 0], [0, 0.45, 0], [3.2, 0.45, 0],
      [-4.65, -2.25, 0], [-1.55, -2.25, 0], [1.55, -2.25, 0], [4.65, -2.25, 0],
    ];
  glyphs.forEach((glyph, index) => glyph.group.position.set(...positions[index]));
  replaceLineGeometry(registerLines[0], [
    new THREE.Vector3(positions[0][0] - 1.05, positions[0][1], -0.08),
    new THREE.Vector3(positions[2][0] + 1.05, positions[2][1], -0.08),
  ]);
  replaceLineGeometry(registerLines[1], [
    new THREE.Vector3(positions[3][0] - 1.05, positions[3][1], -0.08),
    new THREE.Vector3(positions[6][0] + 1.05, positions[6][1], -0.08),
  ]);
}

function resetCamera() {
  const narrow = stage.clientWidth < 720;
  camera.position.set(0, narrow ? 0.75 : 0.35, narrow ? 23.5 : 13.8);
  controls.target.set(0, narrow ? 0.7 : 0, 0);
  controls.update();
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
    layoutQubits();
  }
}

function countingMarginal(vector) {
  const marginal = new Map(Array.from({ length: 8 }, (_, value) => (
    [value.toString(2).padStart(3, "0"), 0]
  )));
  basisProbabilities(vector, QUBIT_COUNT).forEach((entry) => {
    const bits = entry.basis.slice(0, 3);
    marginal.set(bits, marginal.get(bits) + entry.probability);
  });
  return [...marginal.entries()];
}

function tracePipeline(nodes) {
  return `
    <div class="trace-pipeline">
      ${nodes.map(([value, label], index) => `
        ${index === 0 ? "" : '<span class="trace-arrow" aria-hidden="true">→</span>'}
        <div class="trace-node"><strong>${value}</strong><small>${label}</small></div>
      `).join("")}
    </div>
  `;
}

function renderPeriodTrace(index) {
  const operationTrace = steps[index].trace;
  periodTraceStatus.textContent = operationTrace.status;
  periodTraceCopy.innerHTML = operationTrace.copy;

  if (operationTrace.kind === "sequence") {
    periodTraceVisual.innerHTML = `
      <div class="trace-sequence">
        ${operationTrace.rows.map(([label, values, rowName]) => `
          <div class="trace-row">
            <span class="trace-row-label">${label}</span>
            ${values.map((value, valueIndex) => (
              `<span class="trace-cell is-seen" data-trace-row="${rowName}" data-trace-index="${valueIndex}">${value}</span>`
            )).join("")}
          </div>
        `).join("")}
        <div class="trace-result">${operationTrace.result}</div>
      </div>
    `;
    if (operationTrace.pairColors) {
      periodTraceVisual.querySelectorAll(".trace-cell").forEach((cell) => {
        cell.classList.add(`pair-${Number.parseInt(cell.dataset.traceIndex, 10) % 4}`);
      });
    }
    return;
  }

  periodTraceVisual.innerHTML = `${tracePipeline(operationTrace.nodes)}<div class="trace-result">${operationTrace.result}</div>`;
  return;

}

function renderDistribution(vector) {
  countingDistribution.innerHTML = "";
  countingMarginal(vector).forEach(([bits, probability]) => {
    const item = document.createElement("div");
    item.className = "counting-outcome";
    item.innerHTML = `
      <code>|${bits}⟩</code>
      <strong>${(probability * 100).toFixed(1)}%</strong>
      <span style="transform:scaleX(${probability})"></span>
    `;
    countingDistribution.appendChild(item);
  });
}

function renderBasisAmplitudes(vector) {
  const entries = basisProbabilities(vector, QUBIT_COUNT)
    .filter((entry) => entry.probability > EPSILON);
  nonzeroCount.textContent = `${entries.length} nonzero amplitude${entries.length === 1 ? "" : "s"}`;
  basisAmplitudes.innerHTML = "";
  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "basis-row";
    const countingBits = entry.basis.slice(0, 3);
    const workBits = entry.basis.slice(3);
    row.innerHTML = `
      <code>|${countingBits}⟩|${workBits}⟩</code>
      <code>${formatComplex(entry.amplitude)}</code>
      <strong>${(entry.probability * 100).toFixed(1)}%</strong>
    `;
    basisAmplitudes.appendChild(row);
  });
}

function renderExplanation(step, index) {
  sceneKicker.textContent = step.kicker;
  sceneTitle.textContent = step.title;
  operationLabel.textContent = step.operation;
  stepNumber.textContent = `Step ${index + 1} of ${steps.length} · ${step.kicker}`;
  guideHeading.textContent = step.title;
  stepBody.innerHTML = step.body.map((paragraph) => `<p>${paragraph}</p>`).join("");
  stateStageLabel.textContent = step.stateLabel;
  equationList.innerHTML = step.equations
    .map((equation) => `<div class="equation">${equation}</div>`)
    .join("");
  stepFacts.innerHTML = step.facts
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function renderProgress(index) {
  [...stepTrack.children].forEach((marker, markerIndex) => {
    marker.classList.toggle("is-current", markerIndex === index);
    marker.classList.toggle("is-complete", markerIndex < index);
    marker.setAttribute("aria-current", markerIndex === index ? "step" : "false");
  });
  stepProgressLabel.value = `${index + 1} / ${steps.length}`;
  previousStepButton.disabled = index === 0;
  nextStepButton.disabled = index === steps.length - 1;
}

let currentStepIndex = 0;
let currentVector = simulateCircuit(qubits, gates, steps[0].circuitStep);

function showStep(index, { updateHash = true } = {}) {
  const nextIndex = THREE.MathUtils.clamp(index, 0, steps.length - 1);
  const step = steps[nextIndex];
  const nextVector = simulateCircuit(qubits, gates, step.circuitStep);
  if (Math.abs(stateNorm(nextVector) - 1) > EPSILON) {
    throw new Error(`Step ${nextIndex + 1} produced a non-unit state`);
  }
  const previousReduced = glyphs.map((_, qubit) => (
    reducedBlochVector(currentVector, QUBIT_COUNT, qubit)
  ));
  const nextReduced = glyphs.map((_, qubit) => (
    reducedBlochVector(nextVector, QUBIT_COUNT, qubit)
  ));
  const stateChanged = !vectorsEqual(currentVector, nextVector);

  glyphs.forEach((glyph, qubit) => {
    glyph.update(
      nextReduced[qubit],
      stateChanged ? previousReduced[qubit] : null,
      step.focus.includes(qubit),
    );
  });

  currentStepIndex = nextIndex;
  currentVector = nextVector;
  renderExplanation(step, nextIndex);
  renderPeriodTrace(nextIndex);
  renderDistribution(nextVector);
  renderBasisAmplitudes(nextVector);
  renderProgress(nextIndex);
  basisDetails.open = step.phase === "Quantum circuit"
    && [10, 11, 17, 18].includes(step.phaseStep);
  document.querySelectorAll(".step-explanation, .math-explanation, .state-evidence")
    .forEach((panel) => { panel.scrollTop = 0; });
  if (updateHash) history.replaceState(null, "", `#step-${nextIndex + 1}`);
}

stepTrack.style.setProperty("--step-count", steps.length);
steps.forEach((step, index) => {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "step-marker";
  marker.textContent = String(index + 1);
  marker.classList.toggle("is-phase-start", step.phaseStep === 1);
  marker.dataset.phase = step.phase;
  marker.title = `${step.kicker}: ${step.title}`;
  marker.setAttribute("aria-label", `Step ${index + 1}: ${step.title}`);
  marker.addEventListener("click", () => showStep(index));
  stepTrack.appendChild(marker);
});

previousStepButton.addEventListener("click", () => showStep(currentStepIndex - 1));
nextStepButton.addEventListener("click", () => showStep(currentStepIndex + 1));
document.querySelector("#camera-reset").addEventListener("click", resetCamera);
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showStep(currentStepIndex - 1);
  if (event.key === "ArrowRight") showStep(currentStepIndex + 1);
});

const resizeObserver = new ResizeObserver(() => {
  resizeRenderer();
  resetCamera();
});
resizeObserver.observe(stage);

function animate() {
  resizeRenderer();
  controls.update();
  glyphs.forEach((glyph) => {
    glyph.render();
    glyph.projectLabel();
  });
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const hashStep = Number.parseInt(window.location.hash.replace("#step-", ""), 10) - 1;
layoutQubits();
resetCamera();
showStep(Number.isInteger(hashStep) ? hashStep : 0, { updateHash: false });
animate();
