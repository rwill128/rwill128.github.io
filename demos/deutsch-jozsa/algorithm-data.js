export const ORACLES = {
  "constant-zero": {
    id: "constant-zero",
    name: "Constant zero",
    classification: "constant",
    values: [0, 0, 0, 0, 0, 0, 0, 0],
    description: "Every one of the eight inputs returns 0.",
  },
  "constant-one": {
    id: "constant-one",
    name: "Constant one",
    classification: "constant",
    values: [1, 1, 1, 1, 1, 1, 1, 1],
    description: "Every one of the eight inputs returns 1.",
  },
  "balanced-low-bit": {
    id: "balanced-low-bit",
    name: "Balanced: low bit",
    classification: "balanced",
    values: [0, 1, 0, 1, 0, 1, 0, 1],
    description: "The output equals the rightmost input bit: four zeros and four ones.",
  },
  "balanced-irregular": {
    id: "balanced-irregular",
    name: "Balanced: irregular",
    classification: "balanced",
    values: [0, 1, 1, 1, 0, 0, 0, 1],
    description: "Four inputs return 0 and four return 1, without following a single-bit pattern.",
  },
};

function setup(number, data) {
  return {
    phase: "Problem setup",
    phaseStep: number,
    stateIndex: 0,
    quantumStage: -1,
    queryCount: 0,
    ...data,
  };
}

function circuit(number, stateIndex, quantumStage, data) {
  return {
    phase: "Quantum circuit",
    phaseStep: number,
    stateIndex,
    quantumStage,
    queryCount: quantumStage >= 4 ? 1 : 0,
    ...data,
  };
}

function interpretation(number, stateIndex, quantumStage, data) {
  return {
    phase: "Interpretation",
    phaseStep: number,
    stateIndex,
    quantumStage,
    queryCount: 1,
    ...data,
  };
}

export const STEPS = [
  setup(1, {
    title: "Expand Deutsch's question from two inputs to eight",
    mathStage: "The promised function",
    body: (oracle) => [
      "<a href=\"/demos/deutsch-algorithm/\">Deutsch's original problem</a> asks whether the two outputs f(0) and f(1) are equal. Deutsch-Jozsa asks the same kind of question about a function whose input can contain any number of bits.",
      "This walkthrough uses three input bits. The function therefore has eight possible inputs: 000 through 111. It still returns only one bit for each input.",
      "We are promised that the function is one of two extremes. A constant function returns the same bit eight times. A balanced function returns 0 four times and 1 four times. Functions with any other split are excluded from the problem.",
      `The selected function is <strong>${oracle.name}</strong>. ${oracle.description}`,
    ],
    equations: () => [
      "f : three input bits → one output bit",
      "constant: 8 equal outputs",
      "balanced: 4 outputs are 0 and 4 are 1",
    ],
    facts: (oracle) => [
      ["Input strings", "8"],
      ["Bits per input", "3"],
      ["Selected function", oracle.name],
      ["Promise", "Constant or balanced"],
    ],
  }),

  setup(2, {
    title: "See why an exact classical answer can require five queries",
    mathStage: "Worst-case deterministic search",
    body: () => [
      "A classical program can query individual inputs. Suppose its first four queries all return 0. The function could be constant zero, because the remaining four outputs might also be 0. It could also be balanced, because every remaining output might be 1.",
      "The fifth query resolves that worst case. Another 0 makes a balanced four-zero/four-one split impossible, while a 1 proves that the function is not constant and therefore must be balanced under the promise.",
      "So three input bits produce a worst-case requirement of five deterministic classical queries. Deutsch-Jozsa will make one oracle query. This counts calls to the black box, not total gates or wall-clock time.",
    ],
    equations: () => [
      "after 4 equal answers: constant and balanced are both possible",
      "the 5th answer settles the promised category",
      "classical worst case = 2^(3−1) + 1 = 5 queries",
    ],
    facts: () => [
      ["Classical worst case", "5 queries"],
      ["Quantum queries", "1"],
      ["Answer required", "One category"],
      ["Full truth table needed?", "No"],
    ],
  }),

  setup(3, {
    title: "Separate the input register from the target workspace",
    mathStage: "Four qubits with two different jobs",
    body: () => [
      "The three upper qubits x₂, x₁, and x₀ form one input register. Read together, they name an ordinary three-bit input such as 000, 101, or 111. The subscripts indicate place value: x₂ contributes 4, x₁ contributes 2, and x₀ contributes 1.",
      "The lower qubit y is the oracle's target. For each input x, the oracle leaves x unchanged and changes y to y XOR f(x). If f(x)=0, y stays as it was. If f(x)=1, y flips.",
      "Target does not mean final answer. The final answer will come from measuring the three input qubits. The target is temporary workspace prepared so its conditional flips become signs on the input components.",
    ],
    equations: () => [
      "input register x = x₂x₁x₀",
      "target update: y becomes y XOR f(x)",
      "measured register: x only",
    ],
    facts: () => [
      ["Input qubits", "x₂, x₁, x₀"],
      ["Target qubit", "y"],
      ["Possible x values", "000 through 111"],
      ["Register order", "x₂ x₁ x₀ y"],
    ],
  }),

  circuit(1, 0, 0, {
    title: "Initialize the four qubits",
    mathStage: "One ordinary starting state",
    body: () => [
      "All three input qubits begin at 0, so the input register currently contains only 000. The target also begins at 0.",
      "At this moment there is no collection of eight function inputs. There is one definite four-bit state: input 000 paired with target 0.",
      "Initialization does not query the function and does not classify it. It only gives every later gate a known starting point.",
    ],
    equations: () => [
      "input register = 000",
      "target = 0",
      "complete state = |000⟩|0⟩",
    ],
    facts: () => [
      ["Input present", "000 only"],
      ["Target", "0"],
      ["Nonzero input components", "1 of 8"],
      ["Oracle queries", "0"],
    ],
  }),

  circuit(2, 1, 1, {
    title: "Set the target to one",
    mathStage: "After X on y",
    body: () => [
      "The X gate changes the target from 0 to 1. Nothing happens to the input register, which remains 000.",
      "This target value is not f(000). The oracle has not run. Starting from 1 merely prepares the target for the Hadamard on the next page.",
    ],
    equations: () => [
      "X changes target 0 → 1",
      "complete state = |000⟩|1⟩",
    ],
    facts: () => [
      ["Gate", "X on y"],
      ["Input register", "000"],
      ["Target", "1"],
      ["Function evaluated?", "No"],
    ],
  }),

  circuit(3, 2, 2, {
    title: "Turn the target into a phase-sensitive marker",
    mathStage: "After H on y",
    body: () => [
      "The target is transformed into a state with equal 0 and 1 measurement probabilities but opposite signs. We name that state |−⟩.",
      "Its useful property is operational: flipping this target exchanges its 0 and 1 components, but because their signs are opposite, the physical target state returns to the same condition with an overall minus sign.",
      "When the oracle requests that flip only for particular input components, those components receive the minus sign. That is how the function's eight outputs will be recorded without leaving eight readable output bits in the target.",
    ],
    equations: () => [
      "target |−⟩ means: equal 0/1 magnitudes, opposite signs",
      "flip(|−⟩) = the same target state multiplied by −1",
    ],
    facts: () => [
      ["Target measurement", "50% 0, 50% 1"],
      ["Target signs", "+ for 0, − for 1"],
      ["Input register", "Still 000"],
      ["Purpose", "Convert flips into signs"],
    ],
  }),

  circuit(4, 3, 3, {
    title: "Prepare all eight inputs with equal weight",
    mathStage: "After H on x₂, x₁, and x₀",
    body: () => [
      "A Hadamard is applied to each input qubit. The resulting input register contains eight equal-magnitude components labeled 000, 001, 010, 011, 100, 101, 110, and 111.",
      "This does not create eight independently readable function calls. It creates one quantum state whose description contains every possible input label. A measurement now would return one random label with probability 1/8 and discard the other components.",
      "All eight components currently have the same positive sign. The oracle's one operation will keep or reverse each sign according to that input's function value.",
    ],
    equations: () => [
      "input components = 000, 001, 010, 011, 100, 101, 110, 111",
      "each input probability before the oracle = 1/8 = 12.5%",
      "each input sign before the oracle = +",
    ],
    facts: () => [
      ["Input components", "8"],
      ["Magnitude", "Equal"],
      ["Signs", "All positive"],
      ["Oracle queries", "0"],
    ],
  }),

  circuit(5, 4, 4, {
    title: "Query the function once and mark all eight input components",
    mathStage: "After the single oracle operation",
    body: (oracle) => [
      "The oracle is applied once to the complete four-qubit state. For every input component whose function value is 0, the input sign stays positive. For every component whose function value is 1, the target flip contributes a negative sign.",
      `For ${oracle.name}, the function values in input order are ${oracle.values.join("")}. The input grid now shows the resulting positive and negative signs directly.`,
      "The target finishes in the same |−⟩ state it had before the query. It does not contain eight outputs. The useful record of the function is now the sign pattern spread across the eight input components.",
    ],
    equations: () => [
      "f(x)=0 → keep the sign on input x",
      "f(x)=1 → reverse the sign on input x",
      "one oracle operation marks all eight components",
    ],
    facts: (oracle) => [
      ["Oracle", oracle.name],
      ["Positive signs", String(oracle.values.filter((value) => value === 0).length)],
      ["Negative signs", String(oracle.values.filter((value) => value === 1).length)],
      ["Oracle queries", "1"],
    ],
  }),

  interpretation(1, 4, 4, {
    title: "Read what the sign pattern says before transforming it",
    mathStage: "Function values encoded as signs",
    body: (oracle) => [
      `The selected function produces ${oracle.values.filter((value) => value === 0).length} positive signs and ${oracle.values.filter((value) => value === 1).length} negative signs. ${oracle.description}`,
      "If the function is constant, all eight signs match. Constant zero produces eight positive signs; constant one produces eight negative signs. Those patterns differ only by one common sign on the complete state, so the final measurement treats both as the same category.",
      "If the function is balanced, exactly four signs are positive and four are negative. The positions of those signs can vary, so a balanced function does not necessarily lead to one predetermined three-bit measurement. The algorithm only needs to guarantee that 000 is impossible.",
    ],
    equations: () => [
      "constant → 8 matching signs",
      "balanced → 4 positive signs and 4 negative signs",
      "the target remains unchanged and can be ignored",
    ],
    facts: (oracle) => [
      ["Selected category", oracle.classification],
      ["Sign pattern", oracle.values.map((value) => value === 0 ? "+" : "−").join(" ")],
      ["Target after query", "Still |−⟩"],
      ["Readable truth table?", "No"],
    ],
  }),

  circuit(6, 5, 5, {
    title: "Use three Hadamards to compare the complete sign pattern",
    mathStage: "Walsh-Hadamard transform of the input signs",
    body: (oracle) => [
      "The second Hadamard layer combines the eight signed input components in eight different addition-and-subtraction patterns, one for each possible measurement label from 000 through 111.",
      "For output 000, the combination is especially simple: add all eight input signs and divide by eight. Eight equal signs produce magnitude 1 at 000. Four positive and four negative signs sum to zero, so a balanced function produces zero amplitude and zero probability at 000.",
      oracle.id === "balanced-irregular"
        ? "This irregular balanced function places equal 25% probability on 001, 010, 100, and 111. It does not select one unique nonzero result; the categorical evidence is that 000 has exactly 0% probability."
        : oracle.id === "balanced-low-bit"
          ? "This particular balanced pattern transforms into the definite result 001. That label identifies this pattern's low-bit structure, but Deutsch-Jozsa only uses the fact that the result is not 000."
          : "All eight matching signs transform into the definite result 000. Constant zero and constant one therefore produce the same observable classification result.",
    ],
    equations: () => [
      "amplitude at 000 = (sum of all eight signs) / 8",
      "constant: sum = +8 or −8 → P(000)=100%",
      "balanced: sum = 0 → P(000)=0%",
    ],
    facts: (oracle) => [
      ["Transform", "H on all three input qubits"],
      ["P(000)", oracle.classification === "constant" ? "100%" : "0%"],
      ["Selected category", oracle.classification],
      ["Target changed?", "No"],
    ],
  }),

  interpretation(2, 5, 6, {
    title: "Measure the input register and apply one decision rule",
    mathStage: "Three measured bits",
    body: (oracle) => [
      `The input register is measured once. For ${oracle.name}, the chart shows every result that can occur and its exact probability.`,
      "The decision rule ignores which particular nonzero string appears. Result 000 means constant. Any result containing at least one 1 means balanced.",
      `This run therefore returns <strong>${oracle.classification}</strong> with certainty. The target qubit is not measured because its state is the same for both categories and contains no additional classification information.`,
    ],
    equations: () => [
      "measured 000 → constant",
      "measured anything else → balanced",
      "ideal classification probability = 100%",
    ],
    facts: (oracle) => [
      ["Measured qubits", "x₂, x₁, x₀"],
      ["000 probability", oracle.classification === "constant" ? "100%" : "0%"],
      ["Classification", oracle.classification],
      ["Oracle queries", "1"],
    ],
  }),

  interpretation(3, 5, 6, {
    title: "Generalize the same circuit to n input bits",
    mathStage: "The n-bit rule",
    body: () => [
      "For n input bits, the input register contains n qubits and represents 2ⁿ possible input strings. One additional target qubit is prepared in the same phase-sensitive state.",
      "The circuit structure does not change: prepare every input component with Hadamards, apply the oracle once, then apply Hadamards to all n input qubits and measure them.",
      "An exact deterministic classical algorithm can require 2^(n−1)+1 queries in the worst case. The ideal Deutsch-Jozsa circuit requires one. The advantage depends on the promise that the function is exactly constant or exactly balanced, and it concerns black-box query count rather than the cost of constructing the oracle.",
      "The measurement rule also stays the same: all n measured bits equal to zero means constant; any 1 anywhere means balanced. See <a href=\"https://qiskit.qotlabs.org/learning/courses/fundamentals-of-quantum-algorithms/quantum-query-algorithms/deutsch-jozsa-algorithm\">IBM Quantum's derivation of Deutsch-Jozsa</a>.",
    ],
    equations: () => [
      "number of function inputs = 2ⁿ",
      "classical worst case = 2^(n−1) + 1 oracle queries",
      "quantum circuit = 1 oracle query",
    ],
    facts: () => [
      ["Input register", "n qubits"],
      ["Target register", "1 qubit"],
      ["Constant result", "00…0"],
      ["Balanced result", "At least one 1"],
    ],
  }),
];
