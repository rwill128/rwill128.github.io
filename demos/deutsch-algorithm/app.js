import {
  MATRICES,
  applyControlledX,
  applySingleQubitGate,
  basisProbabilities,
  initialStateVector,
  reducedBlochVector,
  stateNorm,
} from "../qubit-workbench/quantum.js?v=20260824-2";
import { BlochRenderer } from "./bloch-renderer.js?v=20260824-1";
import { ORACLES, STEPS } from "./algorithm-data.js?v=20260825-4";

const EPSILON = 1e-9;

function complex(re = 0, im = 0) {
  return { re, im };
}

function cloneVector(vector) {
  return vector.map((value) => complex(value.re, value.im));
}

function magnitude(value) {
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

function formatSignedAmplitude(value) {
  const re = Math.abs(value.re) < 0.0005 ? 0 : value.re;
  const im = Math.abs(value.im) < 0.0005 ? 0 : value.im;
  if (im === 0) return `${re < 0 ? "−" : "+"}${Math.abs(re).toFixed(3)}`;
  if (re === 0) return `${im < 0 ? "−" : "+"}${Math.abs(im).toFixed(3)}i`;
  return `(${formatComplex({ re, im })})`;
}

function vectorsEqual(left, right) {
  return left.every((value, index) => (
    Math.abs(value.re - right[index].re) < EPSILON
    && Math.abs(value.im - right[index].im) < EPSILON
  ));
}

function stateName(vector) {
  if (Math.abs(vector.z - 1) < 0.001) return "|0⟩";
  if (Math.abs(vector.z + 1) < 0.001) return "|1⟩";
  if (Math.abs(vector.x - 1) < 0.001) return "|+⟩";
  if (Math.abs(vector.x + 1) < 0.001) return "|−⟩";
  if (Math.abs(vector.y - 1) < 0.001) return "|+i⟩";
  if (Math.abs(vector.y + 1) < 0.001) return "|−i⟩";
  return "Pure state";
}

function resultBit(oracle) {
  return oracle.values[0] ^ oracle.values[1];
}

function applyOracle(vector, oracle) {
  if (oracle.id === "constant-zero") return cloneVector(vector);
  if (oracle.id === "identity") return applyControlledX(vector, 2, 0, 1);
  if (oracle.id === "constant-one") {
    return applySingleQubitGate(vector, 2, 1, MATRICES.X);
  }
  if (oracle.id === "not") {
    const flippedTarget = applySingleQubitGate(vector, 2, 1, MATRICES.X);
    return applyControlledX(flippedTarget, 2, 0, 1);
  }
  throw new Error(`Unsupported oracle: ${oracle.id}`);
}

function buildStateTimeline(oracle) {
  const timeline = [];
  let vector = initialStateVector([
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ]);
  timeline.push(cloneVector(vector));

  vector = applySingleQubitGate(vector, 2, 1, MATRICES.X);
  timeline.push(cloneVector(vector));

  vector = applySingleQubitGate(vector, 2, 1, MATRICES.H);
  timeline.push(cloneVector(vector));

  vector = applySingleQubitGate(vector, 2, 0, MATRICES.H);
  timeline.push(cloneVector(vector));

  vector = applyOracle(vector, oracle);
  timeline.push(cloneVector(vector));

  vector = applySingleQubitGate(vector, 2, 0, MATRICES.H);
  timeline.push(cloneVector(vector));

  timeline.forEach((state, index) => {
    const norm = stateNorm(state);
    if (Math.abs(norm - 1) > EPSILON) {
      throw new Error(`State ${index} lost normalization: ${norm}`);
    }
  });
  return timeline;
}

const model = {
  oracleId: "constant-zero",
  stepIndex: 0,
  timeline: [],
};

const renderers = [
  new BlochRenderer({
    stage: document.querySelector("#input-stage"),
    canvas: document.querySelector("#input-canvas"),
    labelsLayer: document.querySelector("#input-labels"),
    color: 0xff695a,
  }),
  new BlochRenderer({
    stage: document.querySelector("#target-stage"),
    canvas: document.querySelector("#target-canvas"),
    labelsLayer: document.querySelector("#target-labels"),
    color: 0x40d2d6,
  }),
];

const stageKicker = document.querySelector("#stage-kicker");
const stageTitle = document.querySelector("#stage-title");
const queryCount = document.querySelector("#query-count");
const inputStateName = document.querySelector("#input-state-name");
const targetStateName = document.querySelector("#target-state-name");
const targetPhaseStatus = document.querySelector("#target-phase-status");
const inputStateMeaning = document.querySelector("#input-state-meaning");
const targetStateMeaning = document.querySelector("#target-state-meaning");
const amplitudeList = document.querySelector("#amplitude-list");
const stateNormElement = document.querySelector("#state-norm");
const branchStatus = document.querySelector("#branch-status");
const branchTable = document.querySelector("#branch-table");
const probabilityZero = document.querySelector("#probability-zero");
const probabilityOne = document.querySelector("#probability-one");
const probabilityZeroBar = document.querySelector("#probability-zero-bar");
const probabilityOneBar = document.querySelector("#probability-one-bar");
const classification = document.querySelector("#classification strong");
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

function reducedStatesFor(vector) {
  return [0, 1].map((qubit) => reducedBlochVector(vector, 2, qubit));
}

function previousReducedStates() {
  if (model.stepIndex === 0) return null;
  const previousStateIndex = STEPS[model.stepIndex - 1].stateIndex;
  const nextStateIndex = currentStep().stateIndex;
  if (previousStateIndex === nextStateIndex) return null;
  const previousVector = model.timeline[previousStateIndex];
  if (vectorsEqual(previousVector, currentVector())) return null;
  return reducedStatesFor(previousVector);
}

function renderBlochReadout(index, vector) {
  const values = [vector.x, vector.y, vector.z];
  document.querySelectorAll(`#${index === 0 ? "input" : "target"}-readout dd`)
    .forEach((element, valueIndex) => {
      element.textContent = formatNumber(values[valueIndex]);
    });
}

function computationalBasisComponents(vector) {
  const rawProbabilityZero = Math.max(0, Math.min(1, (1 + vector.z) / 2));
  const probabilityZero = rawProbabilityZero < 1e-8
    ? 0
    : rawProbabilityZero > 1 - 1e-8 ? 1 : rawProbabilityZero;
  const alpha = complex(Math.sqrt(probabilityZero));
  if (alpha.re < EPSILON) return [alpha, complex(1)];
  return [alpha, complex(vector.x / (2 * alpha.re), vector.y / (2 * alpha.re))];
}

function renderBasisDecomposition(index, vector) {
  const prefix = index === 0 ? "input" : "target";
  const components = computationalBasisComponents(vector);
  const equation = document.querySelector(`#${prefix}-basis-equation`);
  equation.textContent = `${stateName(vector)} = (${formatSignedAmplitude(components[0])} × |0⟩) + (${formatSignedAmplitude(components[1])} × |1⟩)`;

  document.querySelectorAll(`#${prefix}-basis-components .basis-component`)
    .forEach((element, basis) => {
      const amplitude = components[basis];
      const amount = magnitude(amplitude);
      const negative = amplitude.re < -0.0005 || (Math.abs(amplitude.re) < 0.0005 && amplitude.im < -0.0005);
      element.classList.toggle("is-negative", negative);
      element.querySelector(".signed-amplitude i").style.width = `${amount * 50}%`;
      const values = element.querySelectorAll("dd");
      values[0].textContent = formatSignedAmplitude(amplitude);
      values[1].textContent = `${(amount * amount * 100).toFixed(1)}%`;
    });
}

function stateMeanings(step, oracle) {
  const result = resultBit(oracle);
  const meanings = {
    0: {
      input: "The input is definitely 0. The circuit has not yet prepared the alternative input 1, and the oracle has not been queried.",
      target: "This is an ordinary zero used as blank workspace. It is not an answer from the hidden function.",
    },
    1: {
      input: "The input is still definitely 0 and has not participated in the computation yet.",
      target: "The target is definitely 1. This is a deliberate preparation step, not the value of f(0) or f(1).",
    },
    2: {
      input: "The input remains definitely 0 while the target is prepared for the oracle.",
      target: "A measurement would return 0 or 1 equally often. More importantly, the two possibilities carry opposite signs, so an oracle-requested flip can become a sign change instead of a lasting bit change.",
    },
    3: {
      input: "The state contains an x=0 component and an x=1 component with equal weight and the same sign. The single oracle operation will act on both components, but neither function value can be read out separately.",
      target: "The target is the phase-sensitive workspace. It is arranged so a requested flip leaves its measurable state unchanged while marking the corresponding input component with a minus sign.",
    },
    4: {
      input: result === 0
        ? `The two input components still have matching signs because f(0)=${oracle.values[0]} and f(1)=${oracle.values[1]} agree. This matching-sign pattern represents “constant”; it does not reveal which shared value the function returned.`
        : `The x=0 and x=1 components now have opposite signs because f(0)=${oracle.values[0]} and f(1)=${oracle.values[1]} differ. This opposite-sign pattern represents “balanced”; it does not preserve both outputs as readable bits.`,
      target: "The target looks exactly as it did before the query. Its job was to turn conditional flips into signs on the input components; it does not retain the function's output.",
    },
    5: {
      input: result === 0
        ? "The matching-sign pattern has been converted into the definite bit 0. Here 0 means the two function outputs were equal, so the function is constant."
        : "The opposite-sign pattern has been converted into the definite bit 1. Here 1 means the two function outputs differed, so the function is balanced.",
      target: "The target has finished its role and remains in the same phase-sensitive state. The algorithm ignores it and measures only the input qubit.",
    },
  };
  return meanings[step.stateIndex];
}

function renderQubits(vector) {
  const reduced = reducedStatesFor(vector);
  const previous = previousReducedStates();
  reduced.forEach((state, index) => {
    renderers[index].update(state, previous?.[index] ?? null);
    renderBlochReadout(index, state);
    renderBasisDecomposition(index, state);
  });
  inputStateName.textContent = stateName(reduced[0]);
  targetStateName.textContent = stateName(reduced[1]);

  const step = currentStep();
  const targetIsMinus = stateName(reduced[1]) === "|−⟩";
  targetPhaseStatus.hidden = !targetIsMinus;
  if (targetIsMinus) {
    targetPhaseStatus.textContent = step.stateIndex < 4
      ? "After X: same Bloch point · phase ×−1"
      : "Oracle result: Bloch point unchanged · signs moved to x components";
  }

  const meanings = stateMeanings(step, currentOracle());
  inputStateMeaning.textContent = meanings.input;
  targetStateMeaning.textContent = meanings.target;
}

function renderAmplitudes(vector) {
  amplitudeList.innerHTML = "";
  vector.forEach((amplitude, basis) => {
    const amount = magnitude(amplitude);
    const row = document.createElement("div");
    row.className = "amplitude-row";
    if (amount < 0.0005) row.classList.add("is-zero");
    if (amplitude.re < -0.0005 || amplitude.im < -0.0005) row.classList.add("is-negative");

    const coefficient = document.createElement("code");
    coefficient.textContent = formatComplex(amplitude);
    const bar = document.createElement("i");
    bar.style.transform = `scaleX(${Math.min(1, amount)})`;
    const ket = document.createElement("span");
    ket.textContent = `|${basis.toString(2).padStart(2, "0")}⟩`;
    row.append(coefficient, bar, ket);
    amplitudeList.appendChild(row);
  });
  stateNormElement.textContent = `Norm ${stateNorm(vector).toFixed(3)}`;
}

function renderBranches(oracle, mode) {
  const queried = ["query", "phase", "interference", "result"].includes(mode);
  const labels = {
    hidden: "Hidden function",
    truth: "Before query",
    query: "Oracle evaluated",
    phase: "Signs kicked back",
    interference: "Inputs to H",
    result: "Classification complete",
  };
  branchStatus.textContent = labels[mode];
  branchTable.innerHTML = "";

  for (const x of [0, 1]) {
    const fValue = mode === "hidden" ? "?" : String(oracle.values[x]);
    const phase = queried ? (oracle.values[x] === 0 ? "+1" : "−1") : "—";
    const explanation = mode === "hidden"
      ? "not exposed to the algorithm"
      : !queried
        ? `truth-table value ${oracle.values[x]}`
        : mode === "result"
          ? `contributed to result ${oracle.values[0] ^ oracle.values[1]}`
          : `multiplies the |${x}⟩ input component`;
    const row = document.createElement("div");
    row.className = `branch-row${mode === "hidden" ? " is-muted" : ""}`;
    row.innerHTML = `
      <strong>x=${x}</strong>
      <span>f=${fValue}</span>
      <span class="branch-sign">${phase}</span>
      <span>${explanation}</span>
    `;
    branchTable.appendChild(row);
  }
}

function renderMeasurement(vector, step) {
  const inputProbabilities = [0, 0];
  basisProbabilities(vector, 2).forEach((entry) => {
    inputProbabilities[Number(entry.basis[0])] += entry.probability;
  });
  const zeroPercent = inputProbabilities[0] * 100;
  const onePercent = inputProbabilities[1] * 100;
  probabilityZero.textContent = `${zeroPercent.toFixed(1)}%`;
  probabilityOne.textContent = `${onePercent.toFixed(1)}%`;
  probabilityZeroBar.style.width = `${zeroPercent}%`;
  probabilityOneBar.style.width = `${onePercent}%`;

  if (step.quantumStage < 6) {
    classification.textContent = "Not measured";
    return;
  }
  const oracle = currentOracle();
  classification.textContent = `${oracle.values[0] ^ oracle.values[1]} · ${oracle.classification}`;
}

function renderCircuit(step) {
  document.querySelectorAll(".wire-node[data-stage]").forEach((node) => {
    const nodeStage = Number(node.dataset.stage);
    node.classList.toggle("is-complete", step.quantumStage > nodeStage);
    node.classList.toggle("is-active", step.quantumStage === nodeStage);
  });
}

function renderExplanation(step, oracle) {
  stageKicker.textContent = step.kicker;
  stageTitle.textContent = step.title;
  queryCount.textContent = String(step.queryCount);
  stepNumber.textContent = `Step ${model.stepIndex + 1} of ${STEPS.length} · ${step.phase}`;
  guideHeading.textContent = step.title;
  stepBody.innerHTML = step.body(oracle).map((paragraph) => `<p>${paragraph}</p>`).join("");
  mathStage.textContent = step.mathStage;
  equationList.innerHTML = step.equations(oracle)
    .map((equation) => `<div class="equation">${equation}</div>`)
    .join("");
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
  renderQubits(vector);
  renderAmplitudes(vector);
  renderBranches(oracle, step.branchMode);
  renderMeasurement(vector, step);
  renderCircuit(step);
  renderExplanation(step, oracle);
  renderProgress();
}

function showStep(index, { updateHash = true } = {}) {
  model.stepIndex = Math.max(0, Math.min(STEPS.length - 1, index));
  render();
  document.querySelectorAll(".step-explanation, .math-explanation, .evidence-panel")
    .forEach((panel) => { panel.scrollTop = 0; });
  if (updateHash) history.replaceState(null, "", `#step-${model.stepIndex + 1}`);
}

function selectOracle(oracleId) {
  model.oracleId = oracleId;
  model.timeline = buildStateTimeline(currentOracle());
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
  marker.title = `${step.kicker}: ${step.title}`;
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

function animate() {
  renderers.forEach((renderer) => renderer.render());
  requestAnimationFrame(animate);
}

model.timeline = buildStateTimeline(currentOracle());
const requestedStep = Number.parseInt(window.location.hash.replace("#step-", ""), 10);
showStep(Number.isFinite(requestedStep) ? requestedStep - 1 : 0, { updateHash: false });
animate();
