export const ORACLES = {
  "constant-zero": {
    id: "constant-zero",
    name: "Constant zero",
    shortName: "f₀",
    values: [0, 0],
    classification: "constant",
    decomposition: "Identity: no elementary gate is required",
  },
  identity: {
    id: "identity",
    name: "Identity",
    shortName: "f₁",
    values: [0, 1],
    classification: "balanced",
    decomposition: "CNOT with x controlling y",
  },
  not: {
    id: "not",
    name: "NOT",
    shortName: "f₂",
    values: [1, 0],
    classification: "balanced",
    decomposition: "X on y followed by CNOT from x to y",
  },
  "constant-one": {
    id: "constant-one",
    name: "Constant one",
    shortName: "f₃",
    values: [1, 1],
    classification: "constant",
    decomposition: "X on y",
  },
};

function sign(value) {
  return value === 0 ? "+1" : "−1";
}

function resultBit(oracle) {
  return oracle.values[0] ^ oracle.values[1];
}

function preparation(number, data) {
  return {
    phase: "Problem setup",
    phaseStep: number,
    phaseTotal: 3,
    kicker: `Problem setup ${number} of 3`,
    stateIndex: 0,
    quantumStage: -1,
    queryCount: 0,
    branchMode: number === 1 ? "hidden" : "truth",
    ...data,
  };
}

function quantum(number, stateIndex, quantumStage, data) {
  return {
    phase: "Quantum circuit",
    phaseStep: number,
    phaseTotal: 7,
    kicker: `Quantum stage ${number} of 7`,
    stateIndex,
    quantumStage,
    queryCount: number >= 5 ? 1 : 0,
    branchMode: number >= 5 ? "query" : "truth",
    ...data,
  };
}

function interpretation(number, stateIndex, data) {
  return {
    phase: "Interpretation",
    phaseStep: number,
    phaseTotal: 3,
    kicker: `Interpretation ${number} of 3`,
    stateIndex,
    quantumStage: number === 3 ? 6 : 4,
    queryCount: 1,
    branchMode: number === 1 ? "phase" : number === 2 ? "interference" : "result",
    ...data,
  };
}

export const STEPS = [
  preparation(1, {
    title: "Define the black-box question",
    mathStage: "Before the circuit",
    body: (oracle) => [
      "Deutsch's algorithm receives access to an unknown function <strong>f</strong> that accepts one classical bit and returns one classical bit. We are not allowed to inspect the implementation. We can only submit an input through an <strong>oracle query</strong> and receive the corresponding output.",
      "The requested answer is deliberately narrower than learning the complete function. We only need to determine whether f(0) and f(1) are equal. Equal outputs mean the function is <strong>constant</strong>; different outputs mean it is <strong>balanced</strong>.",
      `The currently selected hidden function is <strong>${oracle.name}</strong>. The interface shows its truth table so the walkthrough can explain itself, but the algorithmic circuit treats it as the opaque operation U<sub>f</sub>.`,
    ],
    equations: () => [
      "f : {0,1} → {0,1}",
      "constant ⇔ f(0) = f(1)",
      "balanced ⇔ f(0) ≠ f(1)",
    ],
    facts: (oracle) => [
      ["Selected oracle", oracle.name],
      ["Possible inputs", "0 and 1"],
      ["Required output", "Constant or balanced"],
      ["Queries used", "0"],
    ],
  }),

  preparation(2, {
    title: "Enumerate all four possible functions",
    mathStage: "The complete promise set",
    body: (oracle) => [
      "A one-bit Boolean function has exactly four possible truth tables: 00, 01, 10, and 11, where the first digit is f(0) and the second is f(1). The tables 00 and 11 are constant. The tables 01 and 10 are balanced.",
      "For a one-bit domain, every possible function belongs to one of those categories. Deutsch-Jozsa generalizes the problem to larger inputs, where the algorithm requires a promise that the function is either constant or balanced because other proportions become possible.",
      `This run uses ${oracle.shortName}: f(0) = ${oracle.values[0]} and f(1) = ${oracle.values[1]}. Its true category is <strong>${oracle.classification}</strong>, which the circuit must recover without separately reading both table entries.`,
    ],
    equations: () => [
      "00 and 11 → constant",
      "01 and 10 → balanced",
      "classification bit = f(0) ⊕ f(1)",
    ],
    facts: (oracle) => [
      ["Truth table", `${oracle.values[0]}${oracle.values[1]}`],
      ["Actual category", oracle.classification],
      ["Possible functions", "4"],
      ["Promise violations", "None for one input bit"],
    ],
  }),

  preparation(3, {
    title: "Establish the deterministic classical lower bound",
    mathStage: "One query remains ambiguous",
    body: () => [
      "Suppose a deterministic classical program queries only f(0). If the answer is 0, the hidden table could still be 00, which is constant, or 01, which is balanced. If the answer is 1, it could still be 10 or 11. The same ambiguity remains if the program queries f(1) first.",
      "Therefore a classical algorithm that must always be correct needs two oracle queries: one for f(0) and one for f(1). This is a query-complexity statement, not a claim that the quantum circuit runs twice as fast in wall-clock time.",
      "The quantum algorithm will also avoid learning the complete truth table. It uses one query to extract only the relational property f(0) ⊕ f(1), which is exactly the bit the problem requests.",
    ],
    equations: () => [
      "f(0)=0 ⇒ hidden table ∈ {00,01}",
      "f(0)=1 ⇒ hidden table ∈ {10,11}",
      "Deterministic classical queries required = 2",
    ],
    facts: () => [
      ["After one classical query", "Category unknown"],
      ["Worst-case classical queries", "2"],
      ["Quantum target", "1 query"],
      ["Information requested", "One parity bit"],
    ],
  }),

  quantum(1, 0, 0, {
    title: "Initialize the input and target qubits",
    mathStage: "Initial product state",
    body: () => [
      "The bracket-shaped notation |...⟩ is called a <strong>ket</strong>. A ket names a quantum state vector; the vertical bar and angle bracket are not an absolute-value operation. The symbols |0⟩ and |1⟩ name the two computational-basis vectors [1, 0]ᵀ and [0, 1]ᵀ.",
      "The symbol |ψ₀⟩ names the complete two-qubit state at stage zero. The Greek letter ψ (psi) is just a conventional variable name for a quantum state, while its subscript 0 identifies this point in the circuit. It does not mean that the state has the numeric value zero.",
      "The names <strong>input</strong> and <strong>target</strong> describe the qubits' jobs inside the oracle. The input register x supplies the argument to f: its |0⟩ component selects f(0), and its |1⟩ component selects f(1). The oracle preserves x so that the operation remains reversible.",
      "The target register y is the qubit the oracle conditionally changes. If f(x) = 0, the oracle leaves y unchanged. If f(x) = 1, it flips y between |0⟩ and |1⟩. Equivalently, y becomes y XOR f(x). 'Target' does not mean that y holds the algorithm's final answer; Deutsch's algorithm ultimately measures x, while y is prepared in |−⟩ and used to convert those conditional flips into phase signs.",
      "The labels below the individual kets identify the registers: |0⟩ₓ means that the input qubit x is in state |0⟩, and |0⟩ᵧ means that the target qubit y is in state |0⟩. Putting the two states together requires a <strong>tensor product</strong>, written ⊗. The common shorthand |0⟩ₓ|0⟩ᵧ silently omits that ⊗ symbol.",
      "Because the register order is x followed by y, |0⟩ₓ ⊗ |0⟩ᵧ is abbreviated |00⟩. The first digit describes x and the second describes y. The four possible computational-basis states are therefore |00⟩, |01⟩, |10⟩, and |11⟩.",
      "A general two-qubit state assigns a complex amplitude to each of those four basis states. Here the expansion is 1|00⟩ + 0|01⟩ + 0|10⟩ + 0|11⟩. Saying amplitude(|00⟩) = 1 means that the coefficient multiplying |00⟩ is the real number 1; all three other coefficients are zero.",
      "Measurement probability is the squared magnitude of an amplitude. The squared magnitude of 1 is 1, so the probability of measuring the two-bit result 00 is 1, conventionally written 100%. An amplitude of −1 or i would also have magnitude 1 and therefore probability 100%; amplitude signs and phases matter when components later interfere, not when one isolated probability is calculated.",
      "The state is called a product state because the joint vector can still be separated into one state for x tensor-multiplied by one state for y. That separability is what 'no entanglement' means here.",
      "No oracle query has occurred. Initialization merely establishes a known starting point from which the reversible gates can prepare the interference experiment.",
    ],
    equations: () => [
      "|0⟩ = [1, 0]ᵀ    and    |1⟩ = [0, 1]ᵀ",
      "|ψ₀⟩ = |0⟩ₓ ⊗ |0⟩ᵧ",
      "|0⟩ₓ ⊗ |0⟩ᵧ = |00⟩ = [1, 0, 0, 0]ᵀ",
      "|ψ₀⟩ = 1|00⟩ + 0|01⟩ + 0|10⟩ + 0|11⟩",
      "amplitude of |00⟩ = its coefficient = 1",
      "P(00) = magnitude(1)² = 1 = 100%",
    ],
    facts: () => [
      ["Input x", "Selects f(0) or f(1)"],
      ["Target y", "Updated to y XOR f(x)"],
      ["Register order", "x, then y"],
      ["Final measured qubit", "x, not y"],
    ],
  }),

  quantum(2, 1, 1, {
    title: "Apply X and set the target qubit to |1⟩",
    mathStage: "After X(y)",
    body: () => [
      "The Pauli-X gate exchanges |0⟩ and |1⟩. Applying it only to y changes |00⟩ into |01⟩ while x remains zero.",
      "Starting the target at one is not used to store a final answer. It prepares y for the next Hadamard, which will turn it into |−⟩. That particular state makes an oracle-controlled bit flip appear as a phase sign instead.",
      "The state is still one definite basis state and still contains no entanglement or superposition.",
    ],
    equations: () => [
      "X|0⟩ = |1⟩",
      "|ψ₁⟩ = |0⟩ₓ|1⟩ᵧ = |01⟩",
    ],
    facts: () => [
      ["Gate", "X(y)"],
      ["Input qubit", "|0⟩"],
      ["Target qubit", "|1⟩"],
      ["Queries used", "0"],
    ],
  }),

  quantum(3, 2, 2, {
    title: "Apply H and prepare the target in |−⟩",
    mathStage: "After H(y)",
    body: () => [
      "The symbol |1⟩ names the two-component state vector [0, 1]ᵀ; it is not the number 1. The Hadamard gate is a matrix. Multiplying that matrix by [0, 1]ᵀ produces the new vector [1, −1]ᵀ/√2.",
      "That output vector is given the shorthand name |−⟩. Because |0⟩ = [1, 0]ᵀ and |1⟩ = [0, 1]ᵀ, the same output vector can also be written (|0⟩ − |1⟩)/√2. These are equivalent descriptions of one vector, not a value being mapped to an equation.",
      "Applying X does <strong>not</strong> point the Bloch arrow in the opposite direction. X is a 180-degree rotation around the X axis, and |−⟩ already lies on that axis. Its Bloch arrow therefore remains fixed at the −X point. The opposite Bloch point is |+⟩, not −|−⟩.",
      "Algebraically, X exchanges the |0⟩ and |1⟩ components of |−⟩. Because those components have opposite signs, the resulting vector is −|−⟩. A common multiplier of −1 is a phase shift of π and does not change the target's physical state. During the oracle, however, X is applied conditionally: only the input components for which f(x) = 1 acquire that sign. It can therefore become a relative phase between the x = 0 and x = 1 components, which the final Hadamard can reveal through interference.",
      "The target is not random or mixed. It is a pure state pointing along the negative X axis of its Bloch sphere.",
    ],
    equations: () => [
      "H = (1/√2) [[1, 1], [1, −1]]",
      "H[0, 1]ᵀ = [1, −1]ᵀ/√2",
      "|−⟩ := [1, −1]ᵀ/√2 = (|0⟩−|1⟩)/√2",
      "X|−⟩ = −|−⟩",
      "Bloch(|−⟩) = Bloch(−|−⟩) = (−1, 0, 0)",
      "|ψ₂⟩ = |0⟩ₓ|−⟩ᵧ",
    ],
    facts: () => [
      ["Gate", "H(y)"],
      ["Input qubit", "|0⟩"],
      ["Target qubit", "|−⟩"],
      ["Purpose", "Enable phase kickback"],
    ],
  }),

  quantum(4, 3, 3, {
    title: "Apply H and prepare both possible inputs",
    mathStage: "After H(x)",
    body: () => [
      "The input state |0⟩ is the vector [1, 0]ᵀ. Multiplying it by the Hadamard matrix produces [1, 1]ᵀ/√2. That resulting vector is named |+⟩ and can equivalently be expanded as (|0⟩ + |1⟩)/√2.",
      "The complete two-qubit state now contains components for both possible x values, each paired with the same target state |−⟩.",
      "Expanding the product produces four joint basis amplitudes: +1/2 for |00⟩, −1/2 for |01⟩, +1/2 for |10⟩, and −1/2 for |11⟩. These signs come from the target's |−⟩ state, not from evaluating f.",
      "The state remains unentangled because it still factors exactly into |+⟩ₓ|−⟩ᵧ. The oracle will act on both input components coherently in its single application.",
    ],
    equations: () => [
      "H = (1/√2) [[1, 1], [1, −1]]",
      "H[1, 0]ᵀ = [1, 1]ᵀ/√2",
      "|+⟩ := [1, 1]ᵀ/√2 = (|0⟩+|1⟩)/√2",
      "|ψ₃⟩ = |+⟩ₓ|−⟩ᵧ",
      "|ψ₃⟩ = (|00⟩−|01⟩+|10⟩−|11⟩)/2",
    ],
    facts: () => [
      ["Gate", "H(x)"],
      ["Input qubit", "|+⟩"],
      ["Input components", "x = 0 and x = 1"],
      ["Entanglement", "None"],
    ],
  }),

  quantum(5, 4, 4, {
    title: "Query the hidden function once",
    mathStage: "After U_f",
    branchMode: "query",
    body: (oracle) => [
      "The reversible oracle U<sub>f</sub> preserves x and XORs f(x) into y. On an ordinary basis state, it performs |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩. This is one invocation of the hidden function even though the input register is in superposition.",
      `For the selected ${oracle.name} oracle, a concrete circuit decomposition is: <strong>${oracle.decomposition}</strong>. That decomposition is how this small demonstration realizes the black box; query complexity still counts the complete U<sub>f</sub> block as one function query.`,
      `The x = 0 component uses f(0) = ${oracle.values[0]}, while the x = 1 component uses f(1) = ${oracle.values[1]}. Because y is |−⟩, each requested target flip returns y to the same |−⟩ state while contributing a minus sign to that input component.`,
    ],
    equations: () => [
      "U_f|x⟩|y⟩ = |x⟩|y⊕f(x)⟩",
      "U_f|x⟩|−⟩ = (−1)^{f(x)}|x⟩|−⟩",
    ],
    facts: (oracle) => [
      ["Oracle", oracle.name],
      ["f(0), f(1)", `${oracle.values[0]}, ${oracle.values[1]}`],
      ["Oracle queries", "1"],
      ["Target after query", "Still |−⟩"],
    ],
  }),

  interpretation(1, 4, {
    title: "Read the phase kickback branch by branch",
    mathStage: "The function is now encoded in phase",
    body: (oracle) => [
      "Phase kickback means the oracle's output has been converted from a target-bit change into a sign on each input component. A branch with f(x) = 0 receives sign +1; a branch with f(x) = 1 receives sign −1.",
      `For this oracle, the input state after removing the unchanged |−⟩ target factor is ${sign(oracle.values[0])}|0⟩ + ${sign(oracle.values[1])}|1⟩, with the common normalization 1/√2. The two signs are ${oracle.values[0] === oracle.values[1] ? "equal" : "opposite"}.`,
      "The target has not learned or retained f(x); it ends in exactly |−⟩. The useful information is the relative sign between the x = 0 and x = 1 components. A common sign on both components would only be an unobservable global phase.",
    ],
    equations: (oracle) => [
      `x=0: (−1)^{f(0)} = ${sign(oracle.values[0])}`,
      `x=1: (−1)^{f(1)} = ${sign(oracle.values[1])}`,
      `|ψ₄⟩ = [${sign(oracle.values[0])}|0⟩ + ${sign(oracle.values[1])}|1⟩]|−⟩/√2`,
    ],
    facts: (oracle) => [
      ["x=0 phase sign", sign(oracle.values[0])],
      ["x=1 phase sign", sign(oracle.values[1])],
      ["Relative signs", oracle.values[0] === oracle.values[1] ? "Equal" : "Opposite"],
      ["Target changed?", "No"],
    ],
  }),

  interpretation(2, 4, {
    title: "Calculate which output amplitude will cancel",
    mathStage: "Before the final Hadamard",
    body: (oracle) => [
      "The final Hadamard does not reveal both function values. It combines the two signed input components into a sum for output |0⟩ and a difference for output |1⟩.",
      `Here the two branch signs are s₀ = ${sign(oracle.values[0])} and s₁ = ${sign(oracle.values[1])}. The |0⟩ amplitude is (s₀+s₁)/2 = ${(Math.pow(-1, oracle.values[0]) + Math.pow(-1, oracle.values[1])) / 2}. The |1⟩ amplitude is (s₀−s₁)/2 = ${(Math.pow(-1, oracle.values[0]) - Math.pow(-1, oracle.values[1])) / 2}.`,
      `Therefore the input qubit's ${resultBit(oracle) === 0 ? "|1⟩" : "|0⟩"} amplitude becomes exactly 0, while its ${resultBit(oracle) === 0 ? "|0⟩" : "|1⟩"} amplitude has magnitude 1. Measuring x must return ${resultBit(oracle)}: ${resultBit(oracle) === 0 ? "the function values are equal, so the oracle is constant" : "the function values differ, so the oracle is balanced"}.`,
    ],
    equations: (oracle) => [
      "A(0) = [(−1)^{f(0)} + (−1)^{f(1)}]/2",
      "A(1) = [(−1)^{f(0)} − (−1)^{f(1)}]/2",
      `A(0) = ${(Math.pow(-1, oracle.values[0]) + Math.pow(-1, oracle.values[1])) / 2},   A(1) = ${(Math.pow(-1, oracle.values[0]) - Math.pow(-1, oracle.values[1])) / 2}`,
    ],
    facts: (oracle) => [
      ["Sum amplitude A(0)", String((Math.pow(-1, oracle.values[0]) + Math.pow(-1, oracle.values[1])) / 2)],
      ["Difference amplitude A(1)", String((Math.pow(-1, oracle.values[0]) - Math.pow(-1, oracle.values[1])) / 2)],
      ["Cancelled output", resultBit(oracle) === 0 ? "|1⟩" : "|0⟩"],
      ["Surviving output", resultBit(oracle) === 0 ? "|0⟩" : "|1⟩"],
    ],
  }),

  quantum(6, 5, 5, {
    title: "Apply the final H and convert phase into a bit",
    mathStage: "After H(x)",
    branchMode: "interference",
    body: (oracle) => [
      "Hadamard now performs the addition and subtraction described in the previous step. Equal branch signs reinforce at |0⟩ and cancel at |1⟩. Opposite branch signs cancel at |0⟩ and reinforce at |1⟩.",
      `Because ${oracle.name} has ${oracle.values[0] === oracle.values[1] ? "equal" : "opposite"} function values, the input qubit becomes ${resultBit(oracle) === 0 ? "|0⟩" : "|1⟩"}, up to a possible global minus sign. Its Bloch vector therefore points to the ${resultBit(oracle) === 0 ? "+Z |0⟩" : "−Z |1⟩"} pole.`,
      "The target remains |−⟩ and is not measured. The two-qubit state remains a product state throughout this algorithm; entanglement was not required for the speedup in this particular problem.",
    ],
    equations: (oracle) => [
      "H[(s₀|0⟩+s₁|1⟩)/√2] = [(s₀+s₁)|0⟩+(s₀−s₁)|1⟩]/2",
      `|ψ₅⟩ = ${resultBit(oracle) === 0 ? "±|0⟩|−⟩" : "±|1⟩|−⟩"}`,
    ],
    facts: (oracle) => [
      ["Gate", "H(x)"],
      ["Input result", resultBit(oracle) === 0 ? "|0⟩" : "|1⟩"],
      ["Target result", "|−⟩"],
      ["Entanglement", "None"],
    ],
  }),

  quantum(7, 5, 6, {
    title: "Measure only the input qubit",
    mathStage: "Quantum execution complete",
    branchMode: "result",
    body: (oracle) => [
      `Measure x in the computational Z basis. This run returns ${resultBit(oracle)} with 100% probability. The result is deterministic for every one of the four valid one-bit functions; no repeated sampling is required in the ideal circuit.`,
      "The target qubit is ignored. It served as a phase catalyst that made U_f write information into the input's relative phase, then separated cleanly from the answer.",
      `The measured bit ${resultBit(oracle)} is not f(0) or f(1). It is their XOR: ${oracle.values[0]} ⊕ ${oracle.values[1]} = ${resultBit(oracle)}. One query has produced exactly the relational fact requested by the problem.`,
    ],
    equations: (oracle) => [
      `Measure x → ${resultBit(oracle)}`,
      `f(0) ⊕ f(1) = ${oracle.values[0]} ⊕ ${oracle.values[1]} = ${resultBit(oracle)}`,
      `P(x=${resultBit(oracle)}) = 1`,
    ],
    facts: (oracle) => [
      ["Measured qubit", "Input x only"],
      ["Measurement", String(resultBit(oracle))],
      ["Probability", "100%"],
      ["Oracle queries", "1"],
    ],
  }),

  interpretation(3, 5, {
    title: "Interpret the bit and compare query counts",
    mathStage: "Algorithm complete",
    body: (oracle) => [
      `Deutsch's decision rule is direct: measurement 0 means constant and measurement 1 means balanced. The selected ${oracle.name} oracle produced ${resultBit(oracle)}, so the algorithm classifies it as <strong>${oracle.classification}</strong>.`,
      "The quantum circuit did not obtain two classical answers in parallel and then read both. Measurement cannot expose both f(0) and f(1). Instead, the oracle encoded their parity into a relative phase, and the final Hadamard arranged interference so that only the requested parity survived as a measurable bit.",
      "The improvement is modest but historically decisive: one exact quantum query instead of two deterministic classical queries. It supplied a concrete primitive for later algorithms: represent a global property in phase, then combine amplitudes so equal function outputs produce only measurement 0 while different function outputs produce only measurement 1.",
      "The <a href=\"/demos/deutsch-jozsa/\">Deutsch-Jozsa walkthrough</a> continues from this exact circuit and expands the input register from one bit to three, making eight function inputs available to one oracle query. See <a href=\"https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/quantum-query-algorithms/deutsch-algorithm\">IBM Quantum's full derivation of Deutsch's algorithm</a>.",
    ],
    equations: (oracle) => [
      "0 → constant,   1 → balanced",
      `observed ${resultBit(oracle)} → ${oracle.classification}`,
      "queries: quantum 1, deterministic classical 2",
    ],
    facts: (oracle) => [
      ["Observed bit", String(resultBit(oracle))],
      ["Classification", oracle.classification],
      ["Quantum queries", "1"],
      ["Classical worst case", "2"],
    ],
  }),
];
