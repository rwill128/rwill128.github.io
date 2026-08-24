import {
  basisProbabilities,
  reducedBlochVector,
  simulateCircuit,
  stateNorm,
} from "./quantum.js";

const COLUMN_COUNT = 6;
const MAX_QUBITS = 4;
const SINGLE_QUBIT_GATES = new Set(["H", "X", "Y", "Z", "S", "T"]);
const MULTI_QUBIT_GATES = new Set(["CNOT", "CZ", "SWAP"]);

function radiansToDegrees(value) {
  return Math.round((value * 180) / Math.PI);
}

function normalizedDegrees(value) {
  return ((radiansToDegrees(value) % 360) + 360) % 360;
}

function formattedNumber(value, digits = 3) {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  return normalized.toFixed(digits).replace("-", "−");
}

function formattedComplex(amplitude) {
  const re = Math.abs(amplitude.re) < 0.0005 ? 0 : amplitude.re;
  const im = Math.abs(amplitude.im) < 0.0005 ? 0 : amplitude.im;
  if (im === 0) return formattedNumber(re);
  if (re === 0) return `${formattedNumber(im)}i`;
  return `${formattedNumber(re)} ${im < 0 ? "−" : "+"} ${Math.abs(im).toFixed(3)}i`;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function createCircuitWorkspace({ initialQubit, onEditQubit }) {
  const model = {
    qubits: [{ ...initialQubit }],
    gates: [],
    selectedTool: "H",
    pendingGate: null,
    activeQubit: 0,
    step: COLUMN_COUNT,
  };

  const grid = document.querySelector("#circuit-grid");
  const status = document.querySelector("#circuit-status");
  const stepInput = document.querySelector("#circuit-step");
  const stepOutput = document.querySelector("#step-output");
  const jointState = document.querySelector("#joint-state");
  const jointStateDimension = document.querySelector("#joint-state-dimension");
  const outcomeList = document.querySelector("#outcome-list");
  const qubitOutputList = document.querySelector("#qubit-output-list");
  const resultsHeading = document.querySelector("#results-heading");
  const addQubitButton = document.querySelector("#add-qubit");

  function setStatus(message) {
    status.textContent = message;
  }

  function gateAt(row, column) {
    return model.gates.find((gate) => gate.column === column && gate.rows.includes(row));
  }

  function removeGateAt(row, column) {
    const gate = gateAt(row, column);
    if (!gate) return false;
    model.gates = model.gates.filter((candidate) => candidate !== gate);
    return true;
  }

  function handleCellClick(row, column) {
    if (model.selectedTool === "ERASE") {
      const removed = removeGateAt(row, column);
      model.pendingGate = null;
      setStatus(removed ? `Removed operation at t${column + 1}` : "No operation in that cell");
      refresh();
      return;
    }

    if (SINGLE_QUBIT_GATES.has(model.selectedTool)) {
      removeGateAt(row, column);
      model.gates.push({ type: model.selectedTool, column, rows: [row] });
      model.pendingGate = null;
      model.step = COLUMN_COUNT;
      setStatus(`${model.selectedTool} placed on q${row} at t${column + 1}`);
      refresh();
      return;
    }

    if (!MULTI_QUBIT_GATES.has(model.selectedTool)) return;

    if (!model.pendingGate) {
      if (gateAt(row, column)) {
        setStatus("That circuit cell is already occupied");
        return;
      }
      model.pendingGate = { type: model.selectedTool, column, firstRow: row };
      const role = model.selectedTool === "SWAP" ? "endpoint" : "control";
      const nextRole = model.selectedTool === "SWAP" ? "second endpoint" : "target";
      setStatus(`${model.selectedTool} ${role} q${row} selected; choose ${nextRole} at t${column + 1}`);
      refresh();
      return;
    }

    const pending = model.pendingGate;
    if (pending.column !== column) {
      setStatus(`${pending.type} must connect qubits in the same time step`);
      return;
    }
    if (pending.firstRow === row) {
      model.pendingGate = null;
      setStatus(`${pending.type} placement cancelled`);
      refresh();
      return;
    }
    if (gateAt(row, column)) {
      setStatus("That circuit cell is already occupied");
      return;
    }

    const rows = [pending.firstRow, row];
    const gate = { type: pending.type, column, rows };
    if (pending.type === "CNOT" || pending.type === "CZ") {
      gate.control = pending.firstRow;
      gate.target = row;
    }
    model.gates.push(gate);
    model.pendingGate = null;
    model.step = COLUMN_COUNT;
    setStatus(`${gate.type} connected q${rows[0]} and q${rows[1]} at t${column + 1}`);
    refresh();
  }

  function gateSymbol(gate, row) {
    if (SINGLE_QUBIT_GATES.has(gate.type)) return gate.type;
    if (gate.type === "CNOT") return row === gate.control ? "●" : "⊕";
    if (gate.type === "CZ") return row === gate.control ? "●" : "Z";
    if (gate.type === "SWAP") return "×";
    return "";
  }

  function renderConnectors() {
    grid.querySelectorAll(".gate-connector").forEach((connector) => connector.remove());
    const gridBounds = grid.getBoundingClientRect();
    for (const gate of model.gates.filter((candidate) => MULTI_QUBIT_GATES.has(candidate.type))) {
      const endpoints = gate.rows.map((row) => grid.querySelector(`[data-row="${row}"][data-column="${gate.column}"]`));
      if (endpoints.some((endpoint) => !endpoint)) continue;
      const centers = endpoints.map((endpoint) => {
        const bounds = endpoint.getBoundingClientRect();
        return {
          x: bounds.left - gridBounds.left + bounds.width / 2,
          y: bounds.top - gridBounds.top + bounds.height / 2,
        };
      });
      const connector = makeElement("span", "gate-connector");
      connector.style.left = `${centers[0].x}px`;
      connector.style.top = `${Math.min(centers[0].y, centers[1].y)}px`;
      connector.style.height = `${Math.abs(centers[0].y - centers[1].y)}px`;
      grid.appendChild(connector);
    }
  }

  function renderGrid(vector) {
    grid.innerHTML = "";
    grid.style.setProperty("--column-count", COLUMN_COUNT);
    const reducedStates = model.qubits.map((_, row) => reducedBlochVector(
      vector,
      model.qubits.length,
      row,
    ));

    const header = makeElement("div", "circuit-grid-row circuit-grid-header");
    header.appendChild(makeElement("span", "grid-header-cell qubit-header", "Qubit"));
    header.appendChild(makeElement("span", "grid-header-cell input-header", "Input state"));
    for (let column = 0; column < COLUMN_COUNT; column += 1) {
      const cell = makeElement("span", "grid-header-cell time-header", `t${column + 1}`);
      if (column < model.step) cell.classList.add("is-applied");
      header.appendChild(cell);
    }
    header.appendChild(makeElement("span", "grid-header-cell output-header", "State at step"));
    grid.appendChild(header);

    model.qubits.forEach((qubit, row) => {
      const reduced = reducedStates[row];
      const circuitRow = makeElement("div", "circuit-grid-row qubit-row");
      circuitRow.appendChild(makeElement("span", "qubit-label", `q${row}`));

      const inputButton = makeElement("button", `input-state${row === model.activeQubit ? " is-active" : ""}`);
      inputButton.type = "button";
      inputButton.setAttribute("aria-label", `Edit input state for q${row}`);
      inputButton.innerHTML = `<strong>θ ${radiansToDegrees(qubit.theta)}°</strong><span>φ ${normalizedDegrees(qubit.phi)}°</span>`;
      inputButton.addEventListener("click", () => {
        model.activeQubit = row;
        onEditQubit(row, { ...qubit });
      });
      circuitRow.appendChild(inputButton);

      for (let column = 0; column < COLUMN_COUNT; column += 1) {
        const cell = makeElement("button", "gate-cell");
        cell.type = "button";
        cell.dataset.row = String(row);
        cell.dataset.column = String(column);
        cell.setAttribute("aria-label", `q${row}, time ${column + 1}`);
        if (column < model.step) cell.classList.add("is-applied");
        if (column === model.step && model.step < COLUMN_COUNT) cell.classList.add("is-next");

        const gate = gateAt(row, column);
        if (gate) {
          const node = makeElement(
            "span",
            `gate-node ${SINGLE_QUBIT_GATES.has(gate.type) ? "single-gate" : "linked-gate"}`,
            gateSymbol(gate, row),
          );
          node.dataset.gate = gate.type;
          cell.appendChild(node);
        }

        if (
          model.pendingGate
          && model.pendingGate.column === column
          && model.pendingGate.firstRow === row
        ) {
          cell.appendChild(makeElement("span", "gate-node pending-gate", "●"));
        }

        cell.addEventListener("click", () => handleCellClick(row, column));
        circuitRow.appendChild(cell);
      }

      const output = makeElement("div", "wire-output");
      const stateType = reduced.length > 0.9995 ? "Pure" : "Mixed";
      output.innerHTML = `<strong>${stateType}</strong><span>r = ${reduced.length.toFixed(3)}</span>`;
      circuitRow.appendChild(output);
      grid.appendChild(circuitRow);
    });

    requestAnimationFrame(renderConnectors);
  }

  function renderJointState(probabilities) {
    jointState.innerHTML = "";
    const visible = probabilities.filter((entry) => entry.probability > 0.00001);
    visible.forEach((entry) => {
      const row = makeElement("div", "joint-amplitude");
      const coefficient = makeElement("code", "", formattedComplex(entry.amplitude));
      const ket = makeElement("span", "", `|${entry.basis}⟩`);
      row.append(coefficient, ket);
      jointState.appendChild(row);
    });
  }

  function renderOutcomes(probabilities) {
    outcomeList.innerHTML = "";
    const visible = probabilities.filter((entry) => entry.probability > 0.00001);
    visible.forEach((entry) => {
      const row = makeElement("div", "circuit-outcome");
      const heading = makeElement("div", "outcome-heading");
      heading.append(
        makeElement("span", "", `|${entry.basis}⟩`),
        makeElement("strong", "", `${(entry.probability * 100).toFixed(1)}%`),
      );
      const track = makeElement("div", "outcome-track");
      const bar = makeElement("span");
      bar.style.width = `${entry.probability * 100}%`;
      track.appendChild(bar);
      row.append(heading, track);
      outcomeList.appendChild(row);
    });
  }

  function renderQubitOutputs(vector) {
    qubitOutputList.innerHTML = "";
    let entangled = false;
    model.qubits.forEach((_, row) => {
      const reduced = reducedBlochVector(vector, model.qubits.length, row);
      if (reduced.length < 0.9995) entangled = true;
      const item = makeElement("div", "qubit-output");
      const heading = makeElement("div", "qubit-output-heading");
      heading.append(
        makeElement("strong", "", `q${row}`),
        makeElement("span", reduced.length > 0.9995 ? "pure-state" : "mixed-state", reduced.length > 0.9995 ? "Pure" : "Mixed"),
      );
      const coordinates = makeElement("div", "mini-coordinates");
      coordinates.innerHTML = `
        <span>x <b>${formattedNumber(reduced.x)}</b></span>
        <span>y <b>${formattedNumber(reduced.y)}</b></span>
        <span>z <b>${formattedNumber(reduced.z)}</b></span>
        <span>r <b>${reduced.length.toFixed(3)}</b></span>
      `;
      item.append(heading, coordinates);
      qubitOutputList.appendChild(item);
    });
    resultsHeading.textContent = entangled && model.qubits.length > 1 ? "Entangled output" : "Output";
  }

  function refresh() {
    const vector = simulateCircuit(model.qubits, model.gates, model.step);
    const norm = stateNorm(vector);
    if (Math.abs(norm - 1) > 1e-9) {
      throw new Error(`Circuit state lost normalization: ${norm}`);
    }
    const probabilities = basisProbabilities(vector, model.qubits.length);
    renderGrid(vector);
    renderJointState(probabilities);
    renderOutcomes(probabilities);
    renderQubitOutputs(vector);
    jointStateDimension.textContent = `${vector.length} amplitudes`;
    stepInput.value = String(model.step);
    stepOutput.value = model.step === COLUMN_COUNT ? "Output" : model.step === 0 ? "Input" : `After t${model.step}`;
    document.querySelectorAll("[data-gate-tool]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.gateTool === model.selectedTool);
    });
    addQubitButton.disabled = model.qubits.length >= MAX_QUBITS;
  }

  document.querySelectorAll("[data-gate-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      model.selectedTool = button.dataset.gateTool;
      model.pendingGate = null;
      setStatus(model.selectedTool === "ERASE" ? "Remove gate selected" : `${model.selectedTool} selected`);
      refresh();
    });
  });

  addQubitButton.addEventListener("click", () => {
    if (model.qubits.length >= MAX_QUBITS) return;
    model.qubits.push({ theta: 0, phi: 0 });
    model.pendingGate = null;
    setStatus(`Added q${model.qubits.length - 1} in state |0⟩`);
    refresh();
  });

  stepInput.addEventListener("input", () => {
    model.step = Number(stepInput.value);
    refresh();
  });

  document.querySelector("#previous-step").addEventListener("click", () => {
    model.step = Math.max(0, model.step - 1);
    refresh();
  });

  document.querySelector("#next-step").addEventListener("click", () => {
    model.step = Math.min(COLUMN_COUNT, model.step + 1);
    refresh();
  });

  document.querySelector("#reset-circuit").addEventListener("click", () => {
    model.gates = [];
    model.pendingGate = null;
    model.step = COLUMN_COUNT;
    setStatus("Circuit operations cleared");
    refresh();
  });

  document.querySelector("#load-interference").addEventListener("click", () => {
    model.qubits = [{ theta: 0, phi: 0 }];
    model.gates = [
      { type: "H", column: 0, rows: [0] },
      { type: "Z", column: 1, rows: [0] },
      { type: "H", column: 2, rows: [0] },
    ];
    model.activeQubit = 0;
    model.pendingGate = null;
    model.step = COLUMN_COUNT;
    setStatus("Loaded H–Z–H destructive interference circuit");
    refresh();
  });

  document.querySelector("#load-bell").addEventListener("click", () => {
    model.qubits = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    model.gates = [
      { type: "H", column: 0, rows: [0] },
      { type: "CNOT", column: 1, rows: [0, 1], control: 0, target: 1 },
    ];
    model.activeQubit = 0;
    model.pendingGate = null;
    model.step = COLUMN_COUNT;
    setStatus("Loaded Bell-state circuit");
    refresh();
  });

  refresh();

  return {
    captureQubit(row, qubit) {
      if (!model.qubits[row]) return;
      model.qubits[row] = { ...qubit };
      model.activeQubit = row;
      refresh();
    },
    getActiveQubit() {
      return {
        row: model.activeQubit,
        state: { ...model.qubits[model.activeQubit] },
      };
    },
    getSnapshot() {
      return structuredClone(model);
    },
    refresh,
  };
}
