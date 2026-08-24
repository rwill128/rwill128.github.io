export const gates = [
  { type: "X", column: 0, rows: [6] },
  { type: "H", column: 1, rows: [0] },
  { type: "H", column: 2, rows: [1] },
  { type: "H", column: 3, rows: [2] },
  { type: "CSWAP", column: 4, rows: [1, 3, 5], control: 1, targets: [3, 5] },
  { type: "CSWAP", column: 5, rows: [1, 4, 6], control: 1, targets: [4, 6] },
  { type: "CSWAP", column: 6, rows: [2, 3, 4], control: 2, targets: [3, 4] },
  { type: "CSWAP", column: 7, rows: [2, 4, 5], control: 2, targets: [4, 5] },
  { type: "CSWAP", column: 8, rows: [2, 5, 6], control: 2, targets: [5, 6] },
  { type: "H", column: 9, rows: [0] },
  { type: "CPHASE", column: 10, rows: [1, 0], angle: -Math.PI / 2 },
  { type: "CPHASE", column: 11, rows: [2, 0], angle: -Math.PI / 4 },
  { type: "H", column: 12, rows: [1] },
  { type: "CPHASE", column: 13, rows: [2, 1], angle: -Math.PI / 2 },
  { type: "H", column: 14, rows: [2] },
  { type: "SWAP", column: 15, rows: [0, 2] },
];

function trace(status, copy, nodes, result) {
  return { kind: "pipeline", status, copy, nodes, result };
}

function preparation(number, data) {
  return {
    kicker: `Classical preparation ${number} of 4`,
    phase: "Preparation",
    phaseStep: number,
    phaseTotal: 4,
    circuitStep: 0,
    focus: [],
    ...data,
  };
}

function quantum(number, circuitStep, data) {
  return {
    kicker: `Quantum stage ${number} of 18`,
    phase: "Quantum circuit",
    phaseStep: number,
    phaseTotal: 18,
    circuitStep,
    ...data,
  };
}

function recovery(number, data) {
  return {
    kicker: `Classical recovery ${number} of 12`,
    phase: "Classical recovery",
    phaseStep: number,
    phaseTotal: 12,
    circuitStep: 16,
    focus: [],
    ...data,
  };
}

export const steps = [
  preparation(1, {
    title: "Validate the integer to be factored",
    operation: "Classical preflight",
    stateLabel: "Before circuit construction",
    body: [
      "The input is <strong>N = 15</strong>. Shor's algorithm is intended for a positive composite integer. A classical preflight rejects cases that do not require quantum order finding: N ≤ 1 is invalid, a prime has no nontrivial factors, an even N immediately yields factor 2, and a prime power can be handled separately.",
      "For this demonstration, 15 is odd, composite, and not a power of one prime. Nothing has happened to a quantum register yet. This first operation establishes that the problem should proceed to selection of a modular base.",
      "This is not the same as already knowing the factors. Primality testing and recognizing simple structural cases are classically efficient; finding the nontrivial factors of a general large composite is the hard problem.",
    ],
    equations: [
      "N = 15",
      "15 &gt; 1,   15 is odd,   15 is composite",
      "Proceed to modular-base selection",
    ],
    facts: [
      ["Input", "N = 15"],
      ["Even-factor shortcut", "Not applicable"],
      ["Prime-power shortcut", "Not applicable"],
      ["Next operation", "Choose a"],
    ],
    trace: trace(
      "Input preflight",
      "These checks remove cases that do not need quantum order finding.",
      [["N = 15", "input"], ["odd", "not divisible by 2"], ["composite", "requires factoring"], ["continue", "choose a base"]],
      "No qubits have been allocated or changed.",
    ),
  }),

  preparation(2, {
    title: "Choose the modular base a = 2",
    operation: "Select a",
    stateLabel: "Classical selection",
    body: [
      "Choose an integer <strong>a</strong> satisfying 1 &lt; a &lt; N. The algorithm may choose randomly; this compiled example deliberately chooses <strong>a = 2</strong> because its powers modulo 15 have a short, visible order.",
      "The base does not need to be a factor. In fact, the next operation checks whether a accidentally shares a factor with N. If it does, the quantum circuit is unnecessary because the GCD has already solved the problem.",
      "Different valid choices of a can have different orders and can succeed or fail during final factor recovery. Shor's algorithm permits retrying with another base when a chosen base produces an unusable order.",
    ],
    equations: ["1 &lt; a &lt; N", "a = 2", "1 &lt; 2 &lt; 15"],
    facts: [
      ["Candidate base", "a = 2"],
      ["Allowed interval", "2 through 14"],
      ["Quantum work", "None yet"],
      ["Next operation", "gcd(a,N)"],
    ],
    trace: trace(
      "Base selection",
      "The base determines the modular sequence whose order the circuit will estimate.",
      [["N = 15", "target"], ["choose", "1 < a < 15"], ["a = 2", "selected base"], ["gcd next", "check for shortcut"]],
      "Selecting a defines the function f(x) = 2ˣ mod 15 but does not evaluate it yet.",
    ),
  }),

  preparation(3, {
    title: "Check whether the base already reveals a factor",
    operation: "Euclidean GCD",
    stateLabel: "gcd(2,15)",
    body: [
      "Compute <strong>g = gcd(a,N)</strong>, the greatest positive integer dividing both values. Euclid's algorithm gives 15 = 7·2 + 1, followed by 2 = 2·1 + 0, so the last nonzero remainder is 1 and gcd(2,15) = 1.",
      "If g were greater than 1, g would be a nontrivial factor and the algorithm would stop. Here g = 1, so 2 and 15 are <strong>coprime</strong>. Multiplication by 2 modulo 15 is therefore reversible on the nonzero residues, which allows it to be represented by a unitary circuit.",
      "The order-finding problem is now well-defined: find the smallest positive integer r for which 2<sup>r</sup> ≡ 1 (mod 15).",
    ],
    equations: [
      "15 = 7·2 + 1",
      "2 = 2·1 + 0",
      "gcd(2,15) = 1",
      "r = min{k &gt; 0 : 2<sup>k</sup> ≡ 1 (mod 15)}",
    ],
    facts: [
      ["GCD result", "g = 1"],
      ["Relationship", "2 and 15 are coprime"],
      ["Immediate factor", "None"],
      ["Quantum target", "Order r"],
    ],
    trace: trace(
      "Euclidean algorithm",
      "A nontrivial GCD would end the algorithm before any quantum work.",
      [["gcd(2,15)", "start"], ["15 mod 2 = 1", "first remainder"], ["2 mod 1 = 0", "stop"], ["g = 1", "continue"]],
      "Because g = 1, proceed to construction of the order-finding circuit.",
    ),
  }),

  preparation(4, {
    title: "Compile the register widths and modular multipliers",
    operation: "Circuit synthesis",
    stateLabel: "No state transition",
    body: [
      "Four work qubits are required to encode integers from 0 through 15. This educational circuit uses three counting qubits, so Q = 2³ = 8 exponent labels are available. A general implementation chooses a larger counting register to estimate an unknown order with enough precision; three is a deliberate specialization for this order-four example.",
      "The counting bits encode x = 4c0 + 2c1 + c2. Therefore 2<sup>x</sup> can be assembled from the conditional factors 2⁴, 2², and 2¹. Reduced modulo 15, those multipliers are 1, 4, and 2.",
      "The c0 multiplier is 1, so an optimized circuit emits no physical gate for it. Multiplication by 4 modulo 15 is a two-position cyclic rotation of the four work bits and becomes two controlled-SWAP gates. Multiplication by 2 is a one-position cyclic rotation and becomes three controlled-SWAP gates.",
      "This tour treats controlled-SWAP as its gate-level boundary. A hardware compiler can decompose each controlled-SWAP further into the device's native one- and two-qubit gates, but that decomposition depends on the selected gate set and hardware topology.",
    ],
    equations: [
      "x = 4c0 + 2c1 + c2",
      "2⁴ mod 15 = 1,   2² mod 15 = 4,   2¹ mod 15 = 2",
      "×4: two controlled swaps    ×2: three controlled swaps",
    ],
    facts: [
      ["Counting width", "3 qubits; Q = 8"],
      ["Work width", "4 qubits"],
      ["Unitary gates emitted", "16 total"],
      ["Circuit boundary", "Controlled-SWAP"],
    ],
    trace: trace(
      "Compiled operation plan",
      "The three modular powers are translated into concrete register permutations before execution.",
      [["2⁴ mod 15 = 1", "emit no gate"], ["2² mod 15 = 4", "two CSWAPs"], ["2¹ mod 15 = 2", "three CSWAPs"], ["QFT†", "seven gates"]],
      "The resulting quantum execution contains one initialization, 16 unitary gates, and one measurement: 18 quantum stages.",
    ),
  }),

  quantum(1, 0, {
    title: "Initialize all seven qubits to |0⟩",
    operation: "Initialize",
    stateLabel: "Before the first gate",
    focus: [0, 1, 2, 3, 4, 5, 6],
    body: [
      "The three counting qubits begin in |000⟩ and the four work qubits begin in |0000⟩. Adjacent register kets denote one complete basis state: |000⟩<sub>count</sub>|0000⟩<sub>work</sub> = |0000000⟩.",
      "Seven qubits have 2⁷ = 128 computational-basis states. Initially the coefficient of |0000000⟩ is 1 and every other coefficient is 0. Calling an amplitude nonzero refers to that coefficient, not to the zeroes and ones written inside the ket label.",
      "The global state is pure because one state vector completely describes it. It is a product state because it factors into seven independent |0⟩ states. Thus every local Bloch vector has radius 1 and points toward +Z, the |0⟩ pole.",
    ],
    equations: [
      "|Ψ₀⟩ = |000⟩<sub>count</sub>|0000⟩<sub>work</sub>",
      "|Ψ₀⟩ = |0⟩<sub>c0</sub>⊗|0⟩<sub>c1</sub>⊗|0⟩<sub>c2</sub>⊗|0⟩<sub>w0</sub>⊗|0⟩<sub>w1</sub>⊗|0⟩<sub>w2</sub>⊗|0⟩<sub>w3</sub>",
      "P(0000000) = |1|² = 1",
    ],
    facts: [
      ["Counting value", "000₂ = 0"],
      ["Work value", "0000₂ = 0"],
      ["Nonzero amplitudes", "1 of 128"],
      ["Entanglement", "None"],
    ],
    trace: trace(
      "State preparation",
      "Initialization selects one basis state before any unitary gate runs.",
      [["7 qubits", "allocated"], ["|000⟩", "counting"], ["|0000⟩", "work"], ["amplitude 1", "for |0000000⟩"]],
      "The circuit is ready for its first unitary operation.",
    ),
  }),

  quantum(2, 1, {
    title: "Apply X to w3 and seed the work register with one",
    operation: "X(w3)",
    stateLabel: "After gate 1 of 16",
    focus: [6],
    body: [
      "The work bits are ordered w0w1w2w3 with binary weights 8, 4, 2, and 1. The X gate exchanges |0⟩ and |1⟩ on w3, changing the work-register label from 0000 to 0001.",
      "Modular multiplication must start from 1 because 1 is the multiplicative identity: 1·2<sup>x</sup> = 2<sup>x</sup>. Starting from zero would fail because every multiplication would leave the work value at zero.",
      "The complete state remains separable. X changed one definite qubit but did not create a superposition or correlate w3 with another qubit.",
    ],
    equations: ["X|0⟩ = |1⟩", "|Ψ₁⟩ = |000⟩|0001⟩", "0001₂ = 1"],
    facts: [
      ["Gate", "1 of 16"],
      ["Changed qubit", "w3"],
      ["Work value", "1"],
      ["Entanglement", "None"],
    ],
    trace: trace(
      "Gate 1: X on w3",
      "X flips only the least-significant work bit.",
      [["|0000⟩", "work before"], ["X(w3)", "flip 0 to 1"], ["|0001⟩", "work after"], ["value 1", "multiplicative seed"]],
      "One joint basis state still has amplitude 1: |000⟩|0001⟩.",
    ),
  }),

  quantum(3, 2, {
    title: "Apply H to c0 and create exponent values 0 and 4",
    operation: "H(c0)",
    stateLabel: "After gate 2 of 16",
    focus: [0],
    body: [
      "c0 is the four's-place counting bit in x = 4c0 + 2c1 + c2. Hadamard maps its initial |0⟩ state to |+⟩ = (|0⟩ + |1⟩)/√2 while the other counting bits remain zero.",
      "The counting register therefore contains two basis labels: 000, representing x = 0, and 100, representing x = 4. Each complete joint state remains paired with work value 0001 and has amplitude +1/√2.",
      "This is a coherent superposition but still a product state: c0 is |+⟩ and the other six qubits have definite states. Superposition alone does not imply entanglement.",
    ],
    equations: [
      "H|0⟩ = (|0⟩ + |1⟩)/√2",
      "|Ψ₂⟩ = (|000⟩|0001⟩ + |100⟩|0001⟩)/√2",
      "P(x=0) = P(x=4) = 1/2",
    ],
    facts: [
      ["Gate", "2 of 16"],
      ["Changed qubit", "c0"],
      ["Exponent values", "0 and 4"],
      ["Entanglement", "None"],
    ],
    trace: trace(
      "Gate 2: H on c0",
      "Changing the four's-place bit creates exponent labels separated by four.",
      [["c0 = 0", "before"], ["H(c0)", "create |+⟩"], ["000, 100", "count labels"], ["x = 0, 4", "numeric values"]],
      "Both terms retain work value 1 and amplitude +1/√2.",
    ),
  }),

  quantum(4, 3, {
    title: "Apply H to c1 and add exponent values 2 and 6",
    operation: "H(c1)",
    stateLabel: "After gate 3 of 16",
    focus: [1],
    body: [
      "c1 is the two's-place counting bit. Applying H creates both c1 = 0 and c1 = 1 inside each existing c0 component. The counting labels become 000, 010, 100, and 110, representing x = 0, 2, 4, and 6.",
      "Every complete state has work value 1 and amplitude +1/2. Squaring the magnitude gives probability 1/4 for each of the four exponent values if the counting register were measured now.",
      "The state still factors as |+⟩<sub>c0</sub>|+⟩<sub>c1</sub>|0⟩<sub>c2</sub>|0001⟩<sub>work</sub>. No operation has yet made a work value depend on a counting value.",
    ],
    equations: [
      "x ∈ {0,2,4,6}",
      "|Ψ₃⟩ = (1/2) Σ<sub>x∈{0,2,4,6}</sub> |x⟩|1⟩",
      "P(each x) = |1/2|² = 1/4",
    ],
    facts: [
      ["Gate", "3 of 16"],
      ["Changed qubit", "c1"],
      ["Exponent values", "0, 2, 4, 6"],
      ["Entanglement", "None"],
    ],
    trace: trace(
      "Gate 3: H on c1",
      "The two's-place bit doubles the number of exponent labels.",
      [["000, 100", "before"], ["H(c1)", "split each term"], ["000,010,100,110", "after"], ["0,2,4,6", "x values"]],
      "Four joint states now have amplitude +1/2; every work label remains 0001.",
    ),
  }),

  quantum(5, 4, {
    title: "Apply H to c2 and create all eight exponent values",
    operation: "H(c2)",
    stateLabel: "After gate 4 of 16",
    focus: [2],
    body: [
      "c2 is the one's-place counting bit. H(c2) adds the odd exponent beside each existing even exponent, producing every counting label from 000 through 111, or x = 0 through 7.",
      "All eight complete states have work value 1 and amplitude +1/√8, so each has probability 1/8 = 12.5%. The circuit has not iterated through eight values; one state vector contains eight simultaneous basis components.",
      "Because the work register is identical in every component, the counting and work registers are still independent. The next controlled swaps will make the work label depend on the counting bits.",
    ],
    equations: [
      "|Ψ₄⟩ = (1/√8) Σ<sub>x=0</sub><sup>7</sup>|x⟩|1⟩",
      "P(x) = 1/8 = 12.5%",
      "|Ψ₄⟩ = |+⟩|+⟩|+⟩|0001⟩",
    ],
    facts: [
      ["Gate", "4 of 16"],
      ["Changed qubit", "c2"],
      ["Exponent values", "0 through 7"],
      ["Entanglement", "None"],
    ],
    trace: trace(
      "Gate 4: H on c2",
      "The one's-place bit completes the uniform exponent superposition.",
      [["4 labels", "before"], ["H(c2)", "add odd partners"], ["8 labels", "000 through 111"], ["1/√8 each", "amplitudes"]],
      "The counting distribution is uniform, while the work register still certainly contains 1.",
    ),
  }),

  quantum(6, 5, {
    title: "Apply the first controlled swap for multiplication by four",
    operation: "CSWAP(c1; w0,w2)",
    stateLabel: "After gate 5 of 16",
    focus: [1, 3, 5],
    body: [
      "The c1-controlled multiplier must rotate the four work bits by two positions, implementing y → 4y mod 15. Its first gate swaps w0 and w2 only in basis components where c1 = 1.",
      "At this checkpoint the reached work value is 0001 in every component, so w0 = 0 and w2 = 0. Swapping two equal bits leaves every currently occupied basis label unchanged. That does not make the gate meaningless: together with the next controlled swap, it implements the correct permutation for every possible four-bit work value.",
      "No state-vector coefficient moves during this particular execution of the gate, and no entanglement is created yet. This is an actual gate whose observable effect happens to be identity on the current support of the state.",
    ],
    equations: [
      "c1 = 0: no swap",
      "c1 = 1: w0 ↔ w2",
      "0001 → 0001 because w0 = w2 = 0",
    ],
    facts: [
      ["Gate", "5 of 16"],
      ["Control", "c1"],
      ["Swapped bits", "w0 and w2"],
      ["State change here", "None"],
    ],
    trace: trace(
      "Gate 5: controlled swap",
      "The operation is conditional on c1 but acts trivially on the currently reached work value.",
      [["c1 = 1", "active components"], ["w0,w2 = 0,0", "bits before"], ["swap", "exchange equal bits"], ["0001", "work unchanged"]],
      "All eight joint states and all eight amplitudes remain unchanged.",
    ),
  }),

  quantum(7, 6, {
    title: "Apply the second controlled swap and finish multiplication by four",
    operation: "CSWAP(c1; w1,w3)",
    stateLabel: "After gate 6 of 16",
    focus: [1, 4, 6],
    body: [
      "The second gate swaps w1 and w3 when c1 = 1. For work value 0001, those bits are 0 and 1, so the swap produces 0100, the binary encoding of 4.",
      "Components with c1 = 0 retain work value 1. Components with c1 = 1 receive work value 4. Across x = 0 through 7, the work values are now 1, 1, 4, 4, 1, 1, 4, 4.",
      "This operation creates entanglement. c1 can no longer be described independently of w1 and w3: c1 = 0 is correlated with w1w3 = 01, while c1 = 1 is correlated with w1w3 = 10. Each of those individual qubits has a maximally mixed reduced state and a zero-length Bloch vector, even though the complete state remains pure.",
    ],
    equations: [
      "c1 = 1: 0001 → 0100",
      "work(x=0…7) = 1,1,4,4,1,1,4,4",
      "(|0⟩<sub>c1</sub>|01⟩<sub>w1w3</sub> + |1⟩<sub>c1</sub>|10⟩<sub>w1w3</sub>)/√2",
    ],
    facts: [
      ["Gate", "6 of 16"],
      ["Control", "c1"],
      ["Swapped bits", "w1 and w3"],
      ["Entanglement created", "c1 ↔ w1,w3"],
    ],
    trace: trace(
      "Gate 6: controlled swap",
      "This completes the two-position rotation used for conditional multiplication by four.",
      [["c1 = 1", "active"], ["0001", "work before"], ["w1 ↔ w3", "swap 0 and 1"], ["0100 = 4", "work after"]],
      "The c1 multiplier is complete: c1 = 0 goes with work 1, and c1 = 1 goes with work 4.",
    ),
  }),

  quantum(8, 7, {
    title: "Apply the first controlled swap for multiplication by two",
    operation: "CSWAP(c2; w0,w1)",
    stateLabel: "After gate 7 of 16",
    focus: [2, 3, 4],
    body: [
      "The c2-controlled multiplier rotates the four work bits left by one position, implementing y → 2y mod 15. The first of its three gates swaps w0 and w1 when c2 = 1.",
      "For c2 = 1 components whose work value is 0001, w0 and w1 are both zero, so the value remains 1. For c2 = 1 components whose work value is 0100, the swap produces 1000, changing 4 to 8.",
      "The work values by exponent become 1, 1, 4, 8, 1, 1, 4, 8. This is only an intermediate permutation; the remaining two swaps must still move the low-order bits for the work-1 components.",
    ],
    equations: [
      "c2 = 1: w0 ↔ w1",
      "0001 → 0001",
      "0100 → 1000",
      "work(x=0…7) = 1,1,4,8,1,1,4,8",
    ],
    facts: [
      ["Gate", "7 of 16"],
      ["Control", "c2"],
      ["Swapped bits", "w0 and w1"],
      ["Changed work value", "4 → 8"],
    ],
    trace: trace(
      "Gate 7: controlled swap",
      "Different occupied work values respond differently to the same bit swap.",
      [["c2 = 1", "active"], ["work 1", "0 ↔ 0; unchanged"], ["work 4", "0 ↔ 1"], ["work 8", "intermediate result"]],
      "Only x = 3 and x = 7 change at this gate, because those components have c1 = c2 = 1 and work value 4 beforehand.",
    ),
  }),

  quantum(9, 8, {
    title: "Apply the middle controlled swap in multiplication by two",
    operation: "CSWAP(c2; w1,w2)",
    stateLabel: "After gate 8 of 16",
    focus: [2, 4, 5],
    body: [
      "The second rotation gate swaps w1 and w2 when c2 = 1. In every currently occupied c2 = 1 work state, those two bits happen to be equal: both are zero for work values 1 and 8.",
      "Consequently this gate changes no occupied basis label in this particular run. It remains part of the exact cyclic-rotation circuit because other possible four-bit inputs would require the exchange.",
      "This is the second state-preserving gate encountered in the compiled example. Showing it separately matters because the lack of a state change is a property of the current input state, not evidence that the operation was omitted.",
    ],
    equations: [
      "c2 = 1: w1 ↔ w2",
      "0001 → 0001",
      "1000 → 1000",
    ],
    facts: [
      ["Gate", "8 of 16"],
      ["Control", "c2"],
      ["Swapped bits", "w1 and w2"],
      ["State change here", "None"],
    ],
    trace: trace(
      "Gate 8: controlled swap",
      "The active components contain equal values in the two targeted bit positions.",
      [["c2 = 1", "active"], ["w1,w2", "0,0 on support"], ["swap", "exchange equal bits"], ["state", "unchanged"]],
      "The final controlled swap will complete the one-position rotation.",
    ),
  }),

  quantum(10, 9, {
    title: "Apply the final controlled swap and finish 2ˣ mod 15",
    operation: "CSWAP(c2; w2,w3)",
    stateLabel: "After gate 9 of 16",
    focus: [2, 5, 6],
    body: [
      "The final multiplication-by-two gate swaps w2 and w3 when c2 = 1. For work value 0001, that moves the low bit left and produces 0010 = 2. For work value 1000, both targeted bits are zero, so 8 remains 8.",
      "All three binary exponent contributions have now been encoded. The eight nonzero joint states are |x⟩|2<sup>x</sup> mod 15⟩ with work values 1, 2, 4, 8, 1, 2, 4, 8. Every term still has amplitude +1/√8.",
      "The repeated pairs are explicit counting-register values: x = 0 and 4 both accompany work 1; 1 and 5 accompany 2; 2 and 6 accompany 4; 3 and 7 accompany 8. The difference within every pair is four, which is how the order r = 4 exists in the joint state before the inverse QFT.",
    ],
    equations: [
      "c2 = 1: w2 ↔ w3",
      "0001 → 0010,   1000 → 1000",
      "|Ψ⟩ = (1/√8) Σ<sub>x=0</sub><sup>7</sup>|x⟩|2ˣ mod 15⟩",
      "f(0…7) = 1,2,4,8,1,2,4,8",
    ],
    facts: [
      ["Gate", "9 of 16"],
      ["Controlled multiplier", "Complete"],
      ["Repeated spacing", "4"],
      ["Nonzero joint states", "8"],
    ],
    trace: {
      kind: "sequence",
      status: "Complete modular function",
      copy: "Each column is one occupied joint state. Pair labels identify exponent values that share a work-register result.",
      rows: [
        ["x", [0, 1, 2, 3, 4, 5, 6, 7], "x"],
        ["|x⟩", ["000", "001", "010", "011", "100", "101", "110", "111"], "basis"],
        ["pair", ["A", "B", "C", "D", "A", "B", "C", "D"], "pair"],
        ["f(x)", [1, 2, 4, 8, 1, 2, 4, 8], "value"],
      ],
      pairColors: true,
      result: "A: 0 and 4 → 1. B: 1 and 5 → 2. C: 2 and 6 → 4. D: 3 and 7 → 8. Every exponent pair differs by four.",
    },
  }),

  quantum(11, 10, {
    title: "Begin the inverse QFT with H on c0",
    operation: "H(c0)",
    stateLabel: "After gate 10 of 16",
    focus: [0],
    body: [
      "The inverse QFT is a seven-gate subcircuit, not one indivisible operation. Its first gate applies H to c0. Before this gate, c0 is independently in |+⟩ because changing c0 changes x by four without changing the work output.",
      "Hadamard maps |+⟩ back to |0⟩. Therefore amplitudes with c0 = 1 combine with their matching c0 = 0 amplitudes, and the number of nonzero joint states falls from eight to four. The four remaining counting labels are 000, 001, 010, and 011 at this intermediate, bit-reversed stage.",
      "This is the first concrete interference step: paired exponent amplitudes separated by four reinforce in c0 = 0 and cancel in c0 = 1. No measurement has occurred.",
    ],
    equations: [
      "H|+⟩ = |0⟩",
      "(|x⟩ + |x+4⟩)/√2 → |0⟩<sub>c0</sub>|x mod 4⟩",
      "8 nonzero terms → 4 nonzero terms",
    ],
    facts: [
      ["Gate", "10 of 16"],
      ["QFT† gate", "1 of 7"],
      ["Changed qubit", "c0"],
      ["Nonzero amplitudes", "4"],
    ],
    trace: trace(
      "QFT† gate 1: H on c0",
      "The period-four pairs differ only in c0, so H combines each pair.",
      [["c0 = |+⟩", "before"], ["H(c0)", "interfere pair"], ["c0 = |0⟩", "after"], ["4 terms", "remain"]],
      "The period's four-step spacing has been converted into a definite zero in the first processed Fourier bit.",
    ),
  }),

  quantum(12, 11, {
    title: "Apply the −π/2 controlled phase between c1 and c0",
    operation: "CP(−π/2; c1,c0)",
    stateLabel: "After gate 11 of 16",
    focus: [0, 1],
    body: [
      "A controlled-phase gate multiplies the amplitude of basis components where both participating qubits are 1 by e<sup>−iπ/2</sup> = −i. It changes amplitude phases, not basis labels or immediate measurement probabilities.",
      "In this specialized state, the previous Hadamard made c0 = 0 in every occupied component. Therefore no occupied component satisfies c1 = c0 = 1, and this controlled phase changes nothing here.",
      "The gate remains part of the general three-qubit inverse QFT. A compiled optimizer aware of this exact intermediate state could remove it, but the tour retains the standard gate sequence so every inverse-QFT operation is visible.",
    ],
    equations: [
      "|11⟩ → e<sup>−iπ/2</sup>|11⟩ = −i|11⟩",
      "Other basis labels are unchanged",
      "Current support has c0 = 0 ⇒ no amplitude changes",
    ],
    facts: [
      ["Gate", "11 of 16"],
      ["QFT† gate", "2 of 7"],
      ["Phase angle", "−π/2"],
      ["State change here", "None"],
    ],
    trace: trace(
      "QFT† gate 2: controlled phase",
      "The gate can rotate only amplitudes whose c1 and c0 bits are both one.",
      [["condition", "c1 = c0 = 1"], ["phase", "multiply by −i"], ["current c0", "always 0"], ["effect", "none here"]],
      "Probabilities and complex amplitudes both remain unchanged for this particular input state.",
    ),
  }),

  quantum(13, 12, {
    title: "Apply the −π/4 controlled phase between c2 and c0",
    operation: "CP(−π/4; c2,c0)",
    stateLabel: "After gate 12 of 16",
    focus: [0, 2],
    body: [
      "This controlled-phase gate would multiply amplitudes with c2 = c0 = 1 by e<sup>−iπ/4</sup>. The smaller angle accounts for the greater binary-distance between c2 and c0 in the Fourier transform.",
      "Again, c0 is zero in every occupied component after the first inverse-QFT Hadamard, so the activation condition never occurs and the state vector remains unchanged.",
      "Controlled phase gates often produce no visible movement on individual Bloch spheres even when they do act, because they modify joint relative phases. Here the stronger statement is that they do not act on any nonzero component at all.",
    ],
    equations: [
      "|11⟩ → e<sup>−iπ/4</sup>|11⟩",
      "e<sup>−iπ/4</sup> = (1−i)/√2",
      "Current support has c0 = 0 ⇒ no amplitude changes",
    ],
    facts: [
      ["Gate", "12 of 16"],
      ["QFT† gate", "3 of 7"],
      ["Phase angle", "−π/4"],
      ["State change here", "None"],
    ],
    trace: trace(
      "QFT† gate 3: controlled phase",
      "This is the smaller of the inverse-QFT phase corrections involving c0.",
      [["condition", "c2 = c0 = 1"], ["phase", "e^(−iπ/4)"], ["current c0", "always 0"], ["effect", "none here"]],
      "The next Hadamard begins processing c1.",
    ),
  }),

  quantum(14, 13, {
    title: "Apply H to c1 inside the inverse QFT",
    operation: "H(c1)",
    stateLabel: "After gate 13 of 16",
    focus: [1],
    body: [
      "H(c1) combines amplitudes whose intermediate counting labels differ only in c1. Unlike c0, c1 is entangled with the work register, so it does not begin in one independent |+⟩ or |−⟩ state that can be summarized without the work value.",
      "The operation transforms four occupied joint states into eight occupied joint states. The counting-register probabilities remain concentrated on intermediate labels 000, 001, 010, and 011 at 25% each because the new terms are distributed across different work states and phases.",
      "A Hadamard can either increase or decrease the number of nonzero basis amplitudes. What matters is addition and subtraction of the two input amplitudes for each matched pair, not a rule that H always creates superposition.",
    ],
    equations: [
      "H: (α|0⟩ + β|1⟩) → ((α+β)|0⟩ + (α−β)|1⟩)/√2",
      "4 nonzero joint terms → 8",
      "P(c0c1c2 ∈ {000,001,010,011}) = 25% each",
    ],
    facts: [
      ["Gate", "13 of 16"],
      ["QFT† gate", "4 of 7"],
      ["Changed qubit", "c1"],
      ["Nonzero amplitudes", "8"],
    ],
    trace: trace(
      "QFT† gate 4: H on c1",
      "Because c1 is entangled with work, its interference must be read from the joint amplitudes.",
      [["4 terms", "before"], ["H(c1)", "add and subtract pairs"], ["8 terms", "after"], ["joint phases", "carry period data"]],
      "The full joint-state list shows the new signs and phases; one-qubit probabilities alone do not.",
    ),
  }),

  quantum(15, 14, {
    title: "Apply the −π/2 controlled phase between c2 and c1",
    operation: "CP(−π/2; c2,c1)",
    stateLabel: "After gate 14 of 16",
    focus: [1, 2],
    body: [
      "This gate multiplies every occupied amplitude with c2 = c1 = 1 by −i. Unlike the two previous controlled phases, its activation condition does occur in the current state.",
      "The gate changes complex phases but leaves every basis label and every basis-state probability unchanged. The counting marginal therefore looks identical immediately before and after this operation even though the state vector is different.",
      "Those phase changes matter because the following H(c2) adds and subtracts amplitudes. Rotating an amplitude before that addition changes which output components reinforce and which cancel.",
    ],
    equations: [
      "c2 = c1 = 1: amplitude A → −iA",
      "|−iA|² = |A|²",
      "Probabilities unchanged now; later interference changes",
    ],
    facts: [
      ["Gate", "14 of 16"],
      ["QFT† gate", "5 of 7"],
      ["Phase angle", "−π/2"],
      ["Immediate probabilities", "Unchanged"],
    ],
    trace: trace(
      "QFT† gate 5: controlled phase",
      "The state changes in phase space even though no probability bar moves yet.",
      [["c2=c1=1", "selected amplitudes"], ["× (−i)", "rotate −90°"], ["magnitudes", "unchanged"], ["next H", "uses new phases"]],
      "Inspecting only probabilities at this checkpoint would miss the operation's entire effect.",
    ),
  }),

  quantum(16, 15, {
    title: "Apply H to c2 and complete the Fourier interference",
    operation: "H(c2)",
    stateLabel: "After gate 15 of 16",
    focus: [2],
    body: [
      "H(c2) converts the phase relationships prepared by the preceding gates into amplitudes of computational-basis states. The number of nonzero joint amplitudes rises from eight to sixteen because each of four work values can now accompany four intermediate counting labels.",
      "Before the final bit-order swap, the counting labels 000, 001, 010, and 011 each have probability 25%. Labels 100 through 111 have zero probability because c0 was already fixed to zero by the first inverse-QFT Hadamard.",
      "The Fourier interference is mathematically complete, but the output bits are reversed relative to the integer convention used elsewhere in the tour. One final SWAP corrects that representation.",
    ],
    equations: [
      "8 nonzero joint terms → 16",
      "P(000)=P(001)=P(010)=P(011)=1/4",
      "P(100)=P(101)=P(110)=P(111)=0",
    ],
    facts: [
      ["Gate", "15 of 16"],
      ["QFT† gate", "6 of 7"],
      ["Changed qubit", "c2"],
      ["Output order", "Bit-reversed"],
    ],
    trace: trace(
      "QFT† gate 6: H on c2",
      "The final Hadamard converts the prepared phases into counting-basis probabilities.",
      [["phase pattern", "before"], ["H(c2)", "interfere"], ["000–011", "25% each"], ["bit order", "still reversed"]],
      "The probability pattern is correct but encoded with c0 and c2 exchanged.",
    ),
  }),

  quantum(17, 16, {
    title: "Swap c0 and c2 to restore counting-bit order",
    operation: "SWAP(c0,c2)",
    stateLabel: "After gate 16 of 16",
    focus: [0, 2],
    body: [
      "The standard QFT gate sequence naturally emits its result in reversed bit order. SWAP(c0,c2) exchanges the most- and least-significant counting bits while leaving c1 unchanged.",
      "The intermediate labels map as 000 → 000, 001 → 100, 010 → 010, and 011 → 110. Interpreted as integers, the four possible values are therefore y = 0, 4, 2, and 6, conventionally listed as 0, 2, 4, and 6.",
      "This final gate does not create the Fourier peaks; it relabels their bit positions. After the swap, every even y has probability 25% and every odd y has probability zero. The peak spacing is Q/r = 8/4 = 2.",
    ],
    equations: [
      "SWAP: c0 ↔ c2",
      "001 → 100,   011 → 110",
      "Surviving y = 0,2,4,6",
      "Peak spacing = Q/r = 8/4 = 2",
    ],
    facts: [
      ["Gate", "16 of 16"],
      ["QFT† gate", "7 of 7"],
      ["Swapped qubits", "c0 and c2"],
      ["Counting peaks", "0, 2, 4, 6"],
    ],
    trace: trace(
      "QFT† gate 7: final swap",
      "The swap converts the inverse-QFT's internal bit order into ordinary binary order.",
      [["000", "stays 000"], ["001", "becomes 100"], ["010", "stays 010"], ["011", "becomes 110"]],
      "The completed counting distribution is 25% on 000, 010, 100, and 110.",
    ),
  }),

  quantum(18, 16, {
    title: "Measure the three counting qubits",
    operation: "Measure c0,c1,c2",
    stateLabel: "Quantum execution complete",
    focus: [0, 1, 2],
    body: [
      "Measurement converts the three counting qubits into one classical three-bit string. A single run returns exactly one of 000, 010, 100, or 110, each with probability 25%; it does not return the complete distribution displayed by the simulator.",
      "The work register is not measured because factor recovery needs only the counting result. Measuring the counting register also projects the entangled global state onto the subspace compatible with the observed y, but the algorithm does not use the remaining work state afterward.",
      "For the concrete recovery path in the remaining operations, assume this run returns <strong>010</strong>. Other possible samples can be unhelpful and may require another execution.",
    ],
    equations: [
      "Measure(c0c1c2) → one classical bit string",
      "P(000)=P(010)=P(100)=P(110)=1/4",
      "Example observed result: 010",
    ],
    facts: [
      ["Quantum stage", "18 of 18"],
      ["Measured register", "Counting only"],
      ["Example result", "010"],
      ["Work measurement", "Not required"],
    ],
    trace: trace(
      "Counting-register measurement",
      "The simulator shows the distribution; one physical execution samples one tile.",
      [["state", "four possible y values"], ["measure", "c0,c1,c2"], ["010", "example sample"], ["classical bits", "passed to recovery"]],
      "All later operations are classical. The example path continues with measured bits 010.",
    ),
  }),

  recovery(1, {
    title: "Decode the measured bits as the integer y = 2",
    operation: "Binary decode",
    stateLabel: "Input bits 010",
    body: [
      "Treat c0c1c2 as an unsigned three-bit integer with weights 4, 2, and 1. The observed bit string 010 therefore represents y = 0·4 + 1·2 + 0·1 = 2.",
      "The symbol y names the measured Fourier-register integer. It is not the original exponent x used during modular exponentiation and it is not the work-register value.",
      "This distinction matters because the next calculation interprets y relative to Q, the number of possible counting-register values.",
    ],
    equations: ["010₂ = 0·4 + 1·2 + 0·1", "y = 2"],
    facts: [
      ["Measured bits", "010"],
      ["Binary weights", "4, 2, 1"],
      ["Decoded integer", "y = 2"],
      ["Next operation", "Compute y/Q"],
    ],
    trace: trace(
      "Decode the sample",
      "The three measured bits become an ordinary integer.",
      [["010", "bit string"], ["0·4+1·2+0·1", "binary expansion"], ["2", "integer y"], ["retain", "for phase ratio"]],
      "No quantum state is manipulated during classical recovery.",
    ),
  }),

  recovery(2, {
    title: "Divide by Q to obtain the measured phase fraction",
    operation: "Compute y/Q",
    stateLabel: "Q = 2³ = 8",
    body: [
      "The counting register has three qubits, so it has Q = 2³ = 8 computational-basis values. Divide the measured integer by Q: y/Q = 2/8 = 1/4.",
      "Phase estimation makes y/Q approximate k/r for some integer k selected by measurement and the unknown order r. In this specially aligned example Q is divisible by r, so the fraction is exact rather than merely close.",
      "The quantum computer has still not output r directly. It has output one rational clue whose denominator may reveal r after classical analysis.",
    ],
    equations: ["Q = 2³ = 8", "y/Q = 2/8 = 1/4", "y/Q ≈ k/r"],
    facts: [
      ["y", "2"],
      ["Q", "8"],
      ["Measured ratio", "1/4"],
      ["Interpretation", "Approximation to k/r"],
    ],
    trace: trace(
      "Construct the phase estimate",
      "Normalize the measured integer by the counting-register range.",
      [["y = 2", "numerator"], ["Q = 8", "denominator"], ["2/8", "measured ratio"], ["1/4", "reduced value"]],
      "The reduced fraction is passed to continued-fraction analysis.",
    ),
  }),

  recovery(3, {
    title: "Run the continued-fraction expansion",
    operation: "Continued fractions",
    stateLabel: "Analyze 1/4",
    body: [
      "For a general measurement, y/Q is only near k/r. The continued-fraction algorithm repeatedly separates an integer part and reciprocates the remaining fractional part, generating convergents with small denominators that closely approximate the measured value.",
      "Here the input is exactly 1/4. Its continued-fraction expansion is [0;4]: the integer part is 0, the reciprocal of the remaining 1/4 is exactly 4, and no remainder remains.",
      "The useful output of this operation is a list of rational candidates, not a declaration that the denominator must be the order. The next operation selects and interprets the convergent.",
    ],
    equations: ["1/4 = 0 + 1/4", "[0;4]", "Convergent: 1/4"],
    facts: [
      ["Input", "1/4"],
      ["Expansion", "[0;4]"],
      ["Convergents", "0/1, 1/4"],
      ["Next operation", "Select denominator"],
    ],
    trace: trace(
      "Continued-fraction expansion",
      "This exact example terminates after one reciprocal step.",
      [["1/4", "input"], ["integer part 0", "first coefficient"], ["reciprocal 4", "second coefficient"], ["[0;4]", "expansion"]],
      "For noisy or inexact phase estimates, several convergents may need verification.",
    ),
  }),

  recovery(4, {
    title: "Select four as the candidate denominator",
    operation: "Read convergent denominator",
    stateLabel: "Candidate s = 4",
    body: [
      "The nonzero convergent is 1/4. Write it as k/s with numerator k = 1 and denominator s = 4. The denominator becomes a <strong>candidate</strong> for the order.",
      "A reduced measurement fraction can lose factors from the true order when k and r share a common divisor. For example, the possible sample y = 4 gives y/Q = 1/2 even though the actual order is 4. Therefore the denominator is never accepted solely because continued fractions produced it.",
      "This sample is favorable because 1 and 4 are coprime, so reducing the fraction did not remove any factor from the denominator. Verification is still mandatory.",
    ],
    equations: ["k/s = 1/4", "k = 1", "Candidate s = 4"],
    facts: [
      ["Convergent", "1/4"],
      ["Numerator", "k = 1"],
      ["Candidate denominator", "s = 4"],
      ["Status", "Unverified"],
    ],
    trace: trace(
      "Extract a candidate",
      "The denominator is a hypothesis about the order, not yet the answer.",
      [["1/4", "convergent"], ["numerator 1", "k"], ["denominator 4", "s"], ["candidate", "requires test"]],
      "The next calculation checks whether raising a to this exponent actually returns 1 modulo N.",
    ),
  }),

  recovery(5, {
    title: "Verify that the candidate returns the modular value to one",
    operation: "Test 2ˢ mod 15",
    stateLabel: "Candidate s = 4",
    body: [
      "Evaluate the defining order condition using the candidate s: 2⁴ mod 15 = 16 mod 15 = 1. Candidate 4 passes the recurrence test.",
      "A denominator that fails this calculation is not the order. Classical recovery can test suitable multiples of the denominator, combine information from another sample, or execute the quantum circuit again.",
      "Passing this test proves that 4 is a period of the modular sequence, but the order is specifically the <em>smallest</em> positive period. The next operation checks minimality.",
    ],
    equations: ["2⁴ = 16", "16 mod 15 = 1", "Candidate 4 is a period"],
    facts: [
      ["Candidate", "s = 4"],
      ["Modular power", "2⁴ mod 15"],
      ["Result", "1"],
      ["Status", "Period; minimality pending"],
    ],
    trace: trace(
      "Verify the recurrence",
      "A valid period must return the modular value to one.",
      [["s = 4", "candidate"], ["2⁴ = 16", "power"], ["16 mod 15", "remainder"], ["1", "passes"]],
      "The candidate satisfies the recurrence condition.",
    ),
  }),

  recovery(6, {
    title: "Check smaller divisors and establish the order r = 4",
    operation: "Minimality check",
    stateLabel: "Find the smallest period",
    body: [
      "The order is the smallest positive exponent returning the modular value to one. The positive divisors of candidate 4 below 4 are 1 and 2, so test them before naming 4 as the order.",
      "2¹ mod 15 = 2 and 2² mod 15 = 4. Neither result is 1. Since candidate 4 passed and neither smaller divisor passed, the smallest valid period is r = 4.",
      "For a larger candidate, factorization of the candidate and repeated modular-power tests can reduce a known period to the true order efficiently. This is classical computation.",
    ],
    equations: [
      "2¹ mod 15 = 2 ≠ 1",
      "2² mod 15 = 4 ≠ 1",
      "2⁴ mod 15 = 1",
      "r = 4",
    ],
    facts: [
      ["Tested smaller divisors", "1 and 2"],
      ["Smaller divisor passed", "None"],
      ["Verified order", "r = 4"],
      ["Quantum result recovered", "Yes"],
    ],
    trace: trace(
      "Establish minimality",
      "A period becomes the order only after smaller candidates are excluded.",
      [["d = 1", "remainder 2"], ["d = 2", "remainder 4"], ["d = 4", "remainder 1"], ["r = 4", "smallest valid"]],
      "The order-finding portion is now complete.",
    ),
  }),

  recovery(7, {
    title: "Check that the recovered order is even",
    operation: "Parity test",
    stateLabel: "r = 4",
    body: [
      "Factor recovery needs the half-order exponent r/2, so the recovered order must be even. Compute r mod 2. For r = 4, the remainder is zero and r/2 = 2 is an integer.",
      "If r were odd, the difference-of-squares reduction used next would not be available. This attempt would be discarded and the algorithm would choose another base a or repeat order finding as appropriate.",
      "Passing the parity check does not by itself guarantee useful factors. The half-order modular power can still produce a trivial square root of one, which is checked after it is computed.",
    ],
    equations: ["r = 4", "r mod 2 = 0", "r/2 = 2"],
    facts: [
      ["Recovered order", "4"],
      ["Parity", "Even"],
      ["Half order", "2"],
      ["Status", "Continue"],
    ],
    trace: trace(
      "Order parity",
      "Only an even order can be split into two equal exponents for the factor reduction.",
      [["r = 4", "input"], ["4 mod 2", "parity test"], ["0", "even"], ["r/2 = 2", "half order"]],
      "The half-order power can now be calculated.",
    ),
  }),

  recovery(8, {
    title: "Compute the half-order modular power z = 4",
    operation: "z = 2ʳᐟ² mod 15",
    stateLabel: "Classical modular exponentiation",
    body: [
      "Define z = a<sup>r/2</sup> mod N. Substituting a = 2, r = 4, and N = 15 gives z = 2² mod 15 = 4.",
      "Because a<sup>r</sup> ≡ 1 (mod N), squaring z also gives one modulo N: z² ≡ 1 (mod N). Therefore N divides z² − 1, and z² − 1 factors algebraically as (z − 1)(z + 1).",
      "This is the bridge from order finding to factor extraction. The algorithm has found a square root of one modulo 15 that may divide the factors of 15 between its two neighboring integers.",
    ],
    equations: [
      "z = a<sup>r/2</sup> mod N",
      "z = 2² mod 15 = 4",
      "z² ≡ 1 (mod 15)",
      "15 divides (z−1)(z+1)",
    ],
    facts: [
      ["Base", "a = 2"],
      ["Half order", "r/2 = 2"],
      ["Half-order power", "z = 4"],
      ["Key property", "z² ≡ 1 mod 15"],
    ],
    trace: trace(
      "Compute the modular square root",
      "The verified order produces a square root of one modulo N.",
      [["a = 2", "base"], ["r/2 = 2", "exponent"], ["2² mod 15", "calculate"], ["z = 4", "result"]],
      "Since 4² mod 15 = 1, z is a modular square root of one.",
    ),
  }),

  recovery(9, {
    title: "Reject trivial square roots before computing GCDs",
    operation: "Check z ≠ ±1 mod N",
    stateLabel: "z = 4",
    body: [
      "The universally available square roots of one modulo N are +1 and −1, represented by remainders 1 and N − 1. They produce trivial GCDs: using z = 1 makes z − 1 equal zero, while z = N − 1 makes z + 1 divisible by N.",
      "For N = 15, the trivial remainders are 1 and 14. The computed value z = 4 is neither, so it is a nontrivial modular square root of one and the GCD extraction is worth attempting.",
      "If z were 1 or 14, this base would not split 15 even though its order had been found correctly. The algorithm would retry with another base rather than reporting a factor.",
    ],
    equations: ["Trivial roots: 1 and N−1", "N−1 = 14", "z = 4 ∉ {1,14}"],
    facts: [
      ["Computed z", "4"],
      ["Trivial roots", "1 and 14"],
      ["Is z trivial?", "No"],
      ["Status", "Compute GCDs"],
    ],
    trace: trace(
      "Nontrivial-root check",
      "A correct order can still lead to an unusable half-order power.",
      [["z = 4", "candidate root"], ["compare 1", "+1 root"], ["compare 14", "−1 root"], ["nontrivial", "continue"]],
      "Both factor-producing GCD calculations are now eligible.",
    ),
  }),

  recovery(10, {
    title: "Compute p = gcd(z − 1, N)",
    operation: "First factor GCD",
    stateLabel: "gcd(3,15)",
    body: [
      "Subtract one from z: z − 1 = 4 − 1 = 3. Compute the greatest common divisor of 3 and 15. Because 15 = 5·3, the result is p = 3.",
      "This works because N divides (z − 1)(z + 1) while z is not itself ±1 modulo N. A nontrivial subset of N's factors can therefore be shared with z − 1.",
      "The result p = 3 is greater than 1 and less than N, so it is a nontrivial factor. A second GCD independently examines z + 1.",
    ],
    equations: ["z − 1 = 4 − 1 = 3", "p = gcd(3,15)", "p = 3"],
    facts: [
      ["Input", "z − 1 = 3"],
      ["GCD", "gcd(3,15)"],
      ["Result", "p = 3"],
      ["Nontrivial factor", "Yes"],
    ],
    trace: trace(
      "First factor extraction",
      "The first GCD checks which part of N is shared with z − 1.",
      [["z = 4", "input"], ["z−1 = 3", "neighbor"], ["gcd(3,15)", "Euclidean GCD"], ["p = 3", "factor"]],
      "One nontrivial factor has been recovered.",
    ),
  }),

  recovery(11, {
    title: "Compute q = gcd(z + 1, N)",
    operation: "Second factor GCD",
    stateLabel: "gcd(5,15)",
    body: [
      "Add one to z: z + 1 = 4 + 1 = 5. Compute the greatest common divisor of 5 and 15. Because 15 = 3·5, the result is q = 5.",
      "The two GCD operations are separate because, for a general composite N, they can return different nontrivial divisors or one can be trivial. The algorithm checks each result rather than assuming they form a complete factor pair.",
      "Here q = 5 is greater than 1 and less than 15, so it is also a nontrivial factor.",
    ],
    equations: ["z + 1 = 4 + 1 = 5", "q = gcd(5,15)", "q = 5"],
    facts: [
      ["Input", "z + 1 = 5"],
      ["GCD", "gcd(5,15)"],
      ["Result", "q = 5"],
      ["Nontrivial factor", "Yes"],
    ],
    trace: trace(
      "Second factor extraction",
      "The second GCD checks which part of N is shared with z + 1.",
      [["z = 4", "input"], ["z+1 = 5", "neighbor"], ["gcd(5,15)", "Euclidean GCD"], ["q = 5", "factor"]],
      "The candidate factors are now p = 3 and q = 5.",
    ),
  }),

  recovery(12, {
    title: "Verify the factors and return 15 = 3 × 5",
    operation: "Validate and return",
    stateLabel: "Algorithm complete",
    body: [
      "Check that both candidates are nontrivial divisors of N and that their product reconstructs the target: 1 &lt; 3 &lt; 15, 1 &lt; 5 &lt; 15, and 3·5 = 15. The factorization is valid.",
      "The quantum contribution was narrowly defined: prepare a periodic modular-function state, apply the inverse QFT, and sample information sufficient to recover r = 4. Every decision before the circuit and every operation after measurement was classical.",
      "This implementation is compiled specifically for N = 15 and a = 2. The mathematical reduction is the same as full Shor order finding, but cryptographic-scale factoring requires much larger reversible modular-arithmetic circuits, many more counting qubits, repeated samples, error correction, and hardware-specific gate decomposition.",
      "The full walkthrough contains 34 operations: 4 classical preparation operations, 18 quantum stages, and 12 classical recovery operations. The quantum circuit itself contains 16 unitary gates at the controlled-SWAP abstraction used here.",
      "For the general derivation beyond this compiled example, see <a href=\"https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/phase-estimation-and-factoring/shor-algorithm\">IBM Quantum's treatment of order finding and Shor's algorithm</a>.",
    ],
    equations: ["p = 3", "q = 5", "p·q = 3·5 = 15", "Return (3,5)"],
    facts: [
      ["First factor", "3"],
      ["Second factor", "5"],
      ["Product check", "3 × 5 = 15"],
      ["Total operations", "34"],
    ],
    trace: trace(
      "Final validation",
      "Never return candidate factors without checking them against the original input.",
      [["p = 3", "first GCD"], ["q = 5", "second GCD"], ["p·q = 15", "verification"], ["return (3,5)", "result"]],
      "Order finding has been converted into the verified factorization 15 = 3 × 5.",
    ),
  }),
];
