import {
  MATRICES,
  applySingleQubitGate,
  initialStateVector,
  stateNorm,
} from "../qubit-workbench/quantum.js?v=20260824-2";
import { ORACLES, STEPS } from "./algorithm-data.js?v=20260825-1";

const QUBIT_COUNT = 4;
const INPUT_QUBITS = [0, 1, 2];
const TARGET_QUBIT = 3;
const EPSILON = 1e-9;
const SQRT_TWO = Math.sqrt(2);

function complex(re = 0, im = 0) {
  return { re, im };
}

function cloneVector(vector) {
  return vector.map((value) => complex(value.re, value.im));
}

function magnitude(value) {
  return Math.sqrt(value.re * value.re + value.im * value.im);
}

function magnitudeSquared(value) {
  return value.re * value.re + value.im * value.im;
}

function formatNumber(value, digits = 3) {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return normalized.toFixed(digits).replace("-", "−");
}

function applyInputHadamards(vector) {
  return INPUT_QUBITS.reduce(
    (current, qubit) => applySingleQubitGate(current, QUBIT_COUNT, qubit, MATRICES.H),
    vector,
  );
}

function applyOracle(vector, oracle) {
  const output = vector.map(() => complex());
  vector.forEach((amplitude, basis) => {
    const input = basis >> 1;
    const target = basis & 1;
    const nextTarget = target ^ oracle.values[input];
    output[(input << 1) | nextTarget] = complex(amplitude.re, amplitude.im);
  });
  return output;
}

function buildTimeline(oracle) {
  const timeline = [];
  let vector = initialStateVector([
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ]);
  timeline.push(cloneVector(vector));

  vector = applySingleQubitGate(vector, QUBIT_COUNT, TARGET_QUBIT, MATRICES.X);
  timeline.push(cloneVector(vector));

  vector = applySingleQubitGate(vector, QUBIT_COUNT, TARGET_QUBIT, MATRICES.H);
  timeline.push(cloneVector(vector));

  vector = applyInputHadamards(vector);
  timeline.push(cloneVector(vector));

  vector = applyOracle(vector, oracle);
  timeline.push(cloneVector(vector));

  vector = applyInputHadamards(vector);
  timeline.push(cloneVector(vector));

  timeline.forEach((state, index) => {
    const norm = stateNorm(state);
    if (Math.abs(norm - 1) > EPSILON) {
      throw new Error(`State ${index} lost normalization: ${norm}`);
    }
  });
  return timeline;
}

function inputProbability(vector, input) {
  return magnitudeSquared(vector[input << 1]) + magnitudeSquared(vector[(input << 1) | 1]);
}

function effectiveInputAmplitude(vector, stateIndex, input) {
  if (stateIndex === 0) return vector[input << 1];
  if (stateIndex === 1) return vector[(input << 1) | 1];
  const targetZeroAmplitude = vector[input << 1];
  return complex(targetZeroAmplitude.re * SQRT_TWO, targetZeroAmplitude.im * SQRT_TWO);
}

function measurementSupport(vector) {
  return Array.from({ length: 8 }, (_, input) => ({
    input,
    probability: inputProbability(vector, input),
  })).filter((entry) => entry.probability > 0.000001);
}

const model = {
  oracleId: "constant-zero",
  stepIndex: 0,
  timeline: [],
};

const stageKicker = document.querySelector("#stage-kicker");
const stageTitle = document.querySelector("#stage-title");
const queryCount = document.querySelector("#query-count");
const inputStateGrid = document.querySelector("#input-state-grid");
const inputRegisterStatus = document.querySelector("#input-register-status");
const inputRegisterMeaning = document.querySelector("#input-register-meaning");
const targetStateName = document.querySelector("#target-state-name");
const targetZeroSign = document.querySelector("#target-zero-sign");
const targetOneSign = document.querySelector("#target-one-sign");
const targetMeaning = document.querySelector("#target-meaning");
const promiseStatus = document.querySelector("#promise-status");
const truthTable = document.querySelector("#truth-table");
const distributionList = document.querySelector("#distribution-list");
const classification = document.querySelector("#classification strong");
const decisionNote = document.querySelector("#decision-note");
const stepNumber = document.querySelector("#step-number");
const guideHeading = document.querySelector("#guide-heading");
const stepBody = document.querySelector("#step-body");
const mathStage = document.querySelector("#math-stage");
const equationList = document.querySelector("#equation-list");
const stepFacts = document.querySelector("#step-facts");
const previousStepButton = document.querySelector("#previous-step");
const nextStepButton = document.querySelector("#next-step");
const stepTrack = document.querySelector("#step-track");
const stepProgressLabel = document.querySelector("#step-progress-label");

function currentOracle() {
  return ORACLES[model.oracleId];
}

function currentStep() {
  return STEPS[model.stepIndex];
}

function currentVector() {
  return model.timeline[currentStep().stateIndex];
}

function inputMeaning(step, oracle, vector) {
  if (step.stateIndex <= 2) {
    return "Only input 000 is represented. The input register has not yet been expanded across the eight possible function inputs.";
  }
  if (step.stateIndex === 3) {
    return "All eight input labels are present with equal weight and matching positive signs. Measuring now would reveal one random label, not all eight labels.";
  }
  if (step.stateIndex === 4) {
    return oracle.classification === "constant"
      ? `All eight signs match. That equality represents “constant,” while the shared output value ${oracle.values[0]} is not retained as a readable answer.`
      : "Four signs are positive and four are negative. That equal split represents “balanced”; the positions of the signs preserve more pattern information than the final decision needs.";
  }
  const support = measurementSupport(vector);
  if (oracle.classification === "constant") {
    return "The eight matching signs have combined into the definite result 000. Here 000 represents the category constant; it is not the hidden function's output value.";
  }
  if (support.length === 1) {
    const label = support[0].input.toString(2).padStart(3, "0");
    return `The balanced sign pattern has combined into the definite nonzero result ${label}. Any nonzero result represents the category balanced.`;
  }
  return `The balanced sign pattern can produce ${support.map((entry) => entry.input.toString(2).padStart(3, "0")).join(", ")}. The exact result varies, but 000 cannot occur, which is sufficient to identify the function as balanced.`;
}

function renderInputRegister(vector, step, oracle) {
  inputStateGrid.innerHTML = "";
  const amplitudes = Array.from({ length: 8 }, (_, input) => effectiveInputAmplitude(vector, step.stateIndex, input));
  const maximum = Math.max(...amplitudes.map(magnitude), EPSILON);

  amplitudes.forEach((amplitude, input) => {
    const probability = inputProbability(vector, input);
    const amount = magnitude(amplitude);
    const element = document.createElement("div");
    const signClass = amplitude.re < -0.0005 ? "is-negative" : amount > 0.0005 ? "is-positive" : "is-zero";
    element.className = `input-component ${signClass}`;
    element.innerHTML = `
      <div class="component-heading"><strong>${input.toString(2).padStart(3, "0")}</strong><span>${amount < 0.0005 ? "0" : amplitude.re < 0 ? "−" : "+"}</span></div>
      <div class="component-signal"><i style="transform:scaleX(${amount / maximum})"></i></div>
      <div class="component-detail"><span>amp ${formatNumber(amplitude.re)}</span><span>${(probability * 100).toFixed(1)}%</span></div>
    `;
    inputStateGrid.appendChild(element);
  });

  const status = {
    0: "Only 000",
    1: "Only 000",
    2: "Only 000",
    3: "8 equal components",
    4: "Function stored in signs",
    5: "Measurement distribution",
  };
  inputRegisterStatus.textContent = status[step.stateIndex];
  inputRegisterMeaning.textContent = inputMeaning(step, oracle, vector);
}

function renderTarget(step) {
  if (step.stateIndex === 0) {
    targetStateName.textContent = "|0⟩";
    targetZeroSign.textContent = "+1";
    targetOneSign.textContent = "0";
    targetMeaning.textContent = "Blank workspace initialized to zero. This is not a function result.";
    return;
  }
  if (step.stateIndex === 1) {
    targetStateName.textContent = "|1⟩";
    targetZeroSign.textContent = "0";
    targetOneSign.textContent = "+1";
    targetMeaning.textContent = "A deliberate preparation value. The function has still not been queried.";
    return;
  }
  targetStateName.textContent = "|−⟩";
  targetZeroSign.textContent = "+1/√2";
  targetOneSign.textContent = "−1/√2";
  targetMeaning.textContent = step.stateIndex < 4
    ? "Equal 0 and 1 magnitudes with opposite signs. A conditional flip can now mark an input component with a minus sign."
    : "The target remains physically unchanged after the oracle. Its conditional flips have been converted into signs on the input register.";
}

function renderTruthTable(oracle) {
  promiseStatus.textContent = oracle.classification;
  truthTable.innerHTML = "";
  oracle.values.forEach((value, input) => {
    const row = document.createElement("div");
    row.className = `truth-row${value === 1 ? " is-one" : ""}`;
    row.innerHTML = `<span>${input.toString(2).padStart(3, "0")}</span><i></i><strong>${value}</strong>`;
    truthTable.appendChild(row);
  });
}

function renderDistribution(vector, step, oracle) {
  distributionList.innerHTML = "";
  Array.from({ length: 8 }, (_, input) => ({ input, probability: inputProbability(vector, input) }))
    .forEach(({ input, probability }) => {
      const row = document.createElement("div");
      row.className = "distribution-row";
      row.innerHTML = `
        <span>${input.toString(2).padStart(3, "0")}</span>
        <div class="distribution-track"><i style="width:${probability * 100}%"></i></div>
        <strong>${(probability * 100).toFixed(1)}%</strong>
      `;
      distributionList.appendChild(row);
    });

  if (step.quantumStage < 6) {
    classification.textContent = "Not measured";
    decisionNote.textContent = "The chart shows what an early measurement would produce, but the algorithm has not measured the register.";
    return;
  }
  classification.textContent = oracle.classification;
  decisionNote.textContent = oracle.classification === "constant"
    ? "The measured register must be 000, so the function is constant."
    : "The measured register must contain at least one 1, so the function is balanced.";
}

function renderCircuit(step) {
  document.querySelectorAll(".wire-node[data-stage]").forEach((node) => {
    const nodeStage = Number(node.dataset.stage);
    node.classList.toggle("is-complete", step.quantumStage > nodeStage);
    node.classList.toggle("is-active", step.quantumStage === nodeStage);
  });
}

function renderExplanation(step, oracle) {
  stageKicker.textContent = step.phase;
  stageTitle.textContent = step.title;
  queryCount.textContent = String(step.queryCount);
  stepNumber.textContent = `Step ${model.stepIndex + 1} of ${STEPS.length} · ${step.phase}`;
  guideHeading.textContent = step.title;
  stepBody.innerHTML = step.body(oracle).map((paragraph) => `<p>${paragraph}</p>`).join("");
  mathStage.textContent = step.mathStage;
  equationList.innerHTML = step.equations(oracle).map((equation) => `<div class="equation">${equation}</div>`).join("");
  stepFacts.innerHTML = step.facts(oracle)
    .map(([term, definition]) => `<div><dt>${term}</dt><dd>${definition}</dd></div>`)
    .join("");
}

function renderProgress() {
  stepTrack.querySelectorAll(".step-marker").forEach((marker, index) => {
    marker.classList.toggle("is-complete", index < model.stepIndex);
    marker.classList.toggle("is-current", index === model.stepIndex);
    marker.setAttribute("aria-current", index === model.stepIndex ? "step" : "false");
  });
  stepProgressLabel.textContent = `${model.stepIndex + 1} / ${STEPS.length}`;
  previousStepButton.disabled = model.stepIndex === 0;
  nextStepButton.disabled = model.stepIndex === STEPS.length - 1;
}

function render() {
  const oracle = currentOracle();
  const step = currentStep();
  const vector = currentVector();
  renderInputRegister(vector, step, oracle);
  renderTarget(step);
  renderTruthTable(oracle);
  renderDistribution(vector, step, oracle);
  renderCircuit(step);
  renderExplanation(step, oracle);
  renderProgress();
}

function showStep(index, { updateHash = true } = {}) {
  model.stepIndex = Math.max(0, Math.min(STEPS.length - 1, index));
  render();
  if (updateHash) history.replaceState(null, "", `#step-${model.stepIndex + 1}`);
}

function selectOracle(oracleId) {
  model.oracleId = oracleId;
  model.timeline = buildTimeline(currentOracle());
  document.querySelectorAll(".oracle-option").forEach((button) => {
    const selected = button.dataset.oracle === oracleId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", selected ? "true" : "false");
  });
  render();
}

STEPS.forEach((step, index) => {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "step-marker";
  marker.classList.toggle("is-phase-start", step.phaseStep === 1);
  marker.textContent = String(index + 1);
  marker.title = `${step.phase}: ${step.title}`;
  marker.setAttribute("aria-label", `Step ${index + 1}: ${step.title}`);
  marker.addEventListener("click", () => showStep(index));
  stepTrack.appendChild(marker);
});

document.querySelectorAll(".oracle-option").forEach((button) => {
  button.addEventListener("click", () => selectOracle(button.dataset.oracle));
});
previousStepButton.addEventListener("click", () => showStep(model.stepIndex - 1));
nextStepButton.addEventListener("click", () => showStep(model.stepIndex + 1));
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showStep(model.stepIndex - 1);
  if (event.key === "ArrowRight") showStep(model.stepIndex + 1);
});

model.timeline = buildTimeline(currentOracle());
const requestedStep = Number.parseInt(window.location.hash.replace("#step-", ""), 10);
showStep(Number.isFinite(requestedStep) ? requestedStep - 1 : 0, { updateHash: false });
