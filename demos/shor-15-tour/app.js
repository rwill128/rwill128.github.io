import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  basisProbabilities,
  reducedBlochVector,
  simulateCircuit,
  stateNorm,
} from "../qubit-workbench/quantum.js";

const EPSILON = 1e-9;
const QUBIT_COUNT = 7;
const COUNTING_ROWS = [0, 1, 2];
const WORK_ROWS = [3, 4, 5, 6];
const QUBIT_LABELS = ["c0", "c1", "c2", "w0", "w1", "w2", "w3"];
const PERIOD_VALUES = [1, 2, 4, 8, 1, 2, 4, 8];
const COUNTING_COLOR = 0xff695a;
const WORK_COLOR = 0x40d2d6;

const qubits = Array.from({ length: QUBIT_COUNT }, () => ({ theta: 0, phi: 0 }));
const gates = [
  { type: "X", column: 0, rows: [6] },
  { type: "H", column: 1, rows: [0] },
  { type: "H", column: 1, rows: [1] },
  { type: "H", column: 1, rows: [2] },
  {
    type: "CMOD",
    column: 2,
    rows: [0, ...WORK_ROWS],
    control: 0,
    workRows: WORK_ROWS,
    labelRow: 4,
    multiplier: 1,
    modulus: 15,
  },
  {
    type: "CMOD",
    column: 3,
    rows: [1, ...WORK_ROWS],
    control: 1,
    workRows: WORK_ROWS,
    labelRow: 4,
    multiplier: 4,
    modulus: 15,
  },
  {
    type: "CMOD",
    column: 4,
    rows: [2, ...WORK_ROWS],
    control: 2,
    workRows: WORK_ROWS,
    labelRow: 4,
    multiplier: 2,
    modulus: 15,
  },
  { type: "IQFT", column: 5, rows: COUNTING_ROWS, labelRow: 1 },
];

const steps = [
  {
    kicker: "Classical reduction",
    title: "Why finding an order can reveal factors",
    operation: "No gates yet",
    stateLabel: "Quantum register not used yet",
    circuitStep: 0,
    focus: [],
    body: [
      "The input is a composite integer <strong>N</strong> that we want to split into factors. Choose an integer <strong>a</strong> with 1 &lt; a &lt; N, then compute <strong>gcd(a,N)</strong>, the greatest positive integer that divides both numbers. If that GCD is greater than 1, it is already a factor of N. The interesting case is gcd(a,N) = 1, which means a and N are <strong>coprime</strong>.",
      "Now repeatedly multiply by a while reducing every result modulo N. The notation <strong>u ≡ v (mod N)</strong> means that u and v leave the same remainder when divided by N, equivalently that N divides u − v. Because there are only finitely many nonzero remainders coprime to N, the sequence a¹ mod N, a² mod N, … eventually returns to 1.",
      "The <strong>order r of a modulo N</strong> is the smallest positive exponent for which a<sup>r</sup> ≡ 1 (mod N). This is the number the quantum portion is designed to recover. It is a period because multiplying the exponent by another r does not change the remainder: a<sup>x+r</sup> ≡ a<sup>x</sup> (mod N).",
      "Why does r help? If r is even, let <strong>z = a<sup>r/2</sup></strong>. Then z² = a<sup>r</sup> ≡ 1 (mod N), so N divides z² − 1 = (z − 1)(z + 1). If z is not congruent to +1 or −1 modulo N, some factors of N divide z − 1 and others divide z + 1. The ordinary calculations gcd(z − 1,N) and gcd(z + 1,N) can therefore expose nontrivial factors.",
      "The quantum computer does not perform the final factorization. It supplies information about r. Choosing a, checking the initial GCD, recovering and verifying r from measurements, and computing the final GCDs are classical. If r is odd or the half-order power gives only a trivial ±1 result, this choice of a failed and the algorithm tries another a.",
      "This tour uses N = 15 and a = 2, so the function examined by the quantum circuit is f(x) = 2<sup>x</sup> mod 15.",
    ],
    equations: [
      "gcd(a,N) = 1",
      "u ≡ v (mod N)  ⇔  N divides u − v",
      "r = min{k &gt; 0 : a<sup>k</sup> ≡ 1 (mod N)}",
      "z = a<sup>r/2</sup>  ⇒  N divides (z − 1)(z + 1)",
      "Candidate factors: gcd(z − 1,N), gcd(z + 1,N)",
    ],
    facts: [
      ["Input", "Composite N"],
      ["Chosen base", "a coprime to N"],
      ["Quantum target", "Order r"],
      ["Final operation", "Classical GCDs"],
    ],
  },
  {
    kicker: "Concrete reduction",
    title: "For N = 15, choose a = 2",
    operation: "Classical gcd",
    stateLabel: "No quantum operation",
    circuitStep: 0,
    focus: [],
    body: [
      "Set N = 15 and choose a = 2. Euclid's algorithm gives gcd(2,15) = 1, so the initial GCD does not reveal a factor and 2 is valid for order finding.",
      "Evaluate f(x) = 2<sup>x</sup> mod 15 one exponent at a time: f(0) = 1, f(1) = 2, f(2) = 4, f(3) = 8, and f(4) = 16 mod 15 = 1. The first positive exponent that returns the value to 1 is 4, so the order is r = 4. From then on the four-value sequence repeats: f(x + 4) = f(x).",
      "We can see r = 4 by inspection only because this example is tiny. The quantum circuit will encode the eight input values x = 0 through 7 simultaneously, transform their repeated spacing into a measurable frequency pattern, and produce samples from which a classical program can recover r.",
      "Once r = 4 is known, compute z = 2<sup>r/2</sup> = 2² = 4. Because 4² − 1 = 15 = (4 − 1)(4 + 1), the two GCDs are gcd(3,15) = 3 and gcd(5,15) = 5. This is the exact connection between the period four and the factors of 15.",
    ],
    equations: [
      "gcd(2, 15) = 1",
      "2⁰, 2¹, 2², 2³, 2⁴ (mod 15) = 1, 2, 4, 8, 1",
      "r = 4  ⇒  z = 2<sup>r/2</sup> = 4",
      "gcd(4 − 1, 15) = 3,   gcd(4 + 1, 15) = 5",
    ],
    facts: [
      ["Chosen base", "a = 2"],
      ["Classical check", "gcd = 1"],
      ["Order to recover", "r = 4"],
      ["Recovered factors", "3 and 5"],
    ],
  },
  {
    kicker: "Register allocation",
    title: "Seven qubits begin in the all-zero state",
    operation: "Initialize",
    stateLabel: "Circuit depth 0",
    circuitStep: 0,
    focus: [0, 1, 2, 3, 4, 5, 6],
    body: [
      "The circuit uses two registers. The three counting qubits c0,c1,c2 encode an unsigned binary integer x = 4c0 + 2c1 + c2, so their eight computational-basis labels represent x = 0 through 7. The four work qubits w0,w1,w2,w3 encode an integer y = 8w0 + 4w1 + 2w2 + w3, so they can represent 0 through 15; the modular arithmetic uses values 0 through 14.",
      "Three counting qubits are enough for this compiled demonstration because Q = 2³ = 8 covers two complete repetitions of the order-four function. A general implementation uses more counting qubits to estimate an unknown period accurately. There is no separate qubit that counts or stores r.",
      "The ket <strong>|0⟩</strong> names the first computational-basis state of one qubit. As a vector it is [1,0]<sup>T</sup>: coefficient 1 for outcome 0 and coefficient 0 for outcome 1. The ket's digit is a basis label, not an amplitude.",
      "Writing <strong>|000⟩<sub>count</sub>|0000⟩<sub>work</sub></strong> concatenates the two register labels. It names one basis state of the complete seven-qubit system, |0000000⟩. The tensor-product symbol is often omitted between adjacent kets; no operation is being performed by writing them together.",
      "A general seven-qubit state is a weighted sum of 2⁷ = 128 joint basis states. Each weight is a complex amplitude. Initially only |0000000⟩ has a nonzero amplitude, equal to 1, so measuring all seven qubits would return 0000000 with probability |1|² = 100%.",
      "At this moment every qubit has its own definite pure state |0⟩, and the complete state factors into seven independent pieces. That is a <strong>product state</strong>. No qubit's state depends on any other qubit, so there is no entanglement.",
    ],
    equations: [
      "|0⟩ = [1, 0]<sup>T</sup>",
      "x = 4c0 + 2c1 + c2,   y = 8w0 + 4w1 + 2w2 + w3",
      "|000⟩<sub>count</sub> ⊗ |0000⟩<sub>work</sub> = |0000000⟩",
      "|Ψ₀⟩ = 1·|0000000⟩ + 0·|0000001⟩ + … + 0·|1111111⟩",
      "P(0000000) = |1|² = 1",
    ],
    facts: [
      ["Counting labels", "Q = 2³ = 8"],
      ["Joint basis states", "2⁷ = 128"],
      ["Nonzero coefficients", "1"],
      ["State type", "Pure product"],
    ],
  },
  {
    kicker: "Work-register seed",
    title: "Start modular multiplication from one",
    operation: "X on w3",
    stateLabel: "After X(w3)",
    circuitStep: 1,
    focus: [6],
    body: [
      "The work bits use the order w0w1w2w3, with w0 worth 8 and w3 worth 1. The initial label 0000 represents the integer 0. An X gate exchanges |0⟩ and |1⟩ on its target, so applying X to w3 changes the work-register label from 0000 to 0001.",
      "The work register must begin at <strong>1</strong>, the multiplicative identity, because the next gates build 2<sup>x</sup> by multiplying this stored value. Starting from 1 gives 1·2<sup>x</sup> = 2<sup>x</sup>. Starting from 0 would be useless because every multiplication would leave it at 0.",
      "Only one joint basis state still has nonzero amplitude: |000⟩<sub>count</sub>|0001⟩<sub>work</sub> with coefficient 1. The state remains a product state; the X gate changed one definite bit but created neither superposition nor entanglement.",
    ],
    equations: [
      "X|0⟩ = |1⟩",
      "|Ψ₁⟩ = |000⟩<sub>count</sub>|0001⟩<sub>work</sub>",
    ],
    facts: [
      ["Changed qubit", "w3"],
      ["Work value", "0001₂ = 1"],
      ["State type", "Product"],
      ["Nonzero amplitudes", "1"],
    ],
  },
  {
    kicker: "Parallel exponents",
    title: "Put every candidate exponent into superposition",
    operation: "H on c0, c1, c2",
    stateLabel: "After H⊗H⊗H",
    circuitStep: 2,
    focus: [0, 1, 2],
    body: [
      "A Hadamard gate transforms |0⟩ into |+⟩ = (|0⟩ + |1⟩)/√2. Applying H separately to c0, c1, and c2 multiplies those three two-term sums together, producing all eight counting-register labels 000 through 111.",
      "The complete state is (1/√8)(|000⟩ + |001⟩ + |010⟩ + |011⟩ + |100⟩ + |101⟩ + |110⟩ + |111⟩)|0001⟩. Every listed joint basis state has coefficient +1/√8. If the registers were measured now, every x value would therefore have probability 1/8 = 12.5%, and the work result would certainly be 0001.",
      "These eight terms are not eight independently running programs, and the counting register did not iterate through eight values. They are simultaneous components of one state vector. Their signs and complex phases can later make them add or cancel when another operation maps several components into the same output component.",
      "At this step all eight coefficients have the same positive phase, and the state still factors as |+⟩<sub>c0</sub>|+⟩<sub>c1</sub>|+⟩<sub>c2</sub>|0001⟩<sub>work</sub>. Every qubit is still independent; superposition by itself is not entanglement.",
    ],
    equations: [
      "H|0⟩ = (|0⟩ + |1⟩)/√2 = |+⟩",
      "|Ψ₂⟩ = (1/√8) Σ<sub>x=0</sub><sup>7</sup> |x⟩|0001⟩",
      "P(x) = |1/√8|² = 1/8 = 12.5%",
    ],
    facts: [
      ["Nonzero joint states", "8"],
      ["Amplitude each", "1/√8 ≈ 0.354"],
      ["Probability each", "12.5%"],
      ["Entanglement", "None"],
    ],
  },
  {
    kicker: "Controlled modular power",
    title: "The c0 gate contributes the 2⁴ factor",
    operation: "Controlled ×1 mod 15",
    stateLabel: "After controlled U⁴",
    circuitStep: 3,
    focus: [0, 3, 4, 5, 6],
    body: [
      "The binary expansion x = 4c0 + 2c1 + c2 lets the circuit build 2<sup>x</sup> from three precomputed powers: 2⁴ for c0, 2² for c1, and 2¹ for c2. This first controlled gate handles the c0 contribution.",
      "For every computational-basis term with c0 = 0, the gate leaves the work register unchanged. For every term with c0 = 1, it maps a work value y to (2⁴·y) mod 15. This is a single linear operation on the entire superposition. It does not measure c0 or choose one term to execute.",
      "In this example 2⁴ mod 15 = 16 mod 15 = 1. Multiplying any reached work value by 1 changes nothing, so all eight joint basis labels and all eight coefficients remain exactly as they were before the gate.",
      "Because the work output is identical whether c0 is 0 or 1, the work register contains no information about c0. The complete state still factors with c0 in |+⟩, so c0 remains pure and unentangled. This identity also foreshadows the period: increasing x by 4 contributes a multiplier of 1 and therefore repeats the modular value.",
    ],
    equations: [
      "2⁴ mod 15 = 16 mod 15 = 1",
      "C(U⁴): |0⟩|y⟩ → |0⟩|y⟩,   |1⟩|y⟩ → |1⟩|(2⁴y) mod 15⟩",
      "2⁴ mod 15 = 1  ⇒  U⁴ = I on the work register",
    ],
    facts: [
      ["Exponent contribution", "4c0"],
      ["Conditional multiplier", "2⁴ mod 15 = 1"],
      ["State-vector change", "None"],
      ["c0 state", "Pure |+⟩"],
    ],
  },
  {
    kicker: "Controlled modular power",
    title: "The middle bit writes multiplication by four",
    operation: "Controlled ×4 mod 15",
    stateLabel: "After controlled U²",
    circuitStep: 4,
    focus: [1, 3, 4, 5, 6],
    body: [
      "The three counting bits encode x as <strong>x = 4c0 + 2c1 + c2</strong>. Calling c1 the weight-2 bit means that changing c1 from 0 to 1 adds 2 to x. Since 2<sup>x</sup> = 2<sup>4c0</sup>2<sup>2c1</sup>2<sup>c2</sup>, the c1 stage must contribute the factor 2² mod 15 = 4 whenever c1 is 1.",
      "A <strong>controlled gate</strong> is one reversible quantum operation, not an if/else statement and not a measurement. On a computational-basis term with c1 = 0, it applies the identity to the work register. On a term with c1 = 1, it multiplies the work value by 4 modulo 15. Because c1 is in superposition, the operation acts coherently on both kinds of terms in the same state.",
      "Immediately before this gate, the state contains eight terms labelled |000⟩ through |111⟩, all with work value 0001. The c1 values across those terms are 0, 0, 1, 1, 0, 0, 1, 1. Consequently, the resulting work values are 1, 1, 4, 4, 1, 1, 4, 4. The period-finding trace shows every term and the gate action directly.",
      "Written as work-register bits, those two values are <strong>0001</strong> and <strong>0100</strong>. Comparing them identifies the affected qubits exactly: <strong>w0 remains 0</strong>, <strong>w1 changes from 0 to 1</strong>, <strong>w2 remains 0</strong>, and <strong>w3 changes from 1 to 0</strong>. Therefore w0 and w2 factor out as independent |0⟩ states. The correlated subsystem consists of c1, w1, and w3.",
      "Ignoring c0, c2, w0, and w2, which still factor out, the affected three-qubit state is <strong>(|0⟩<sub>c1</sub>|0⟩<sub>w1</sub>|1⟩<sub>w3</sub> + |1⟩<sub>c1</sub>|1⟩<sub>w1</sub>|0⟩<sub>w3</sub>)/√2</strong>. If c1 is measured as 0, w1w3 must be 01; if c1 is measured as 1, w1w3 must be 10. No product of three independent one-qubit states can reproduce those two linked alternatives, so c1 is entangled with the pair (w1,w3).",
      "When c1, w1, or w3 is examined by itself, its two outcomes each have probability 1/2 and no local phase information remains. Its reduced Bloch vector therefore has length 0 and is drawn at the sphere's center. The complete seven-qubit state is nevertheless pure: the information missing from each one-qubit view is present in the exact correlations among the three qubits. w0 and w2 remain pure |0⟩ states with Bloch radius 1.",
    ],
    equations: [
      "x = 4c0 + 2c1 + c2",
      "2² mod 15 = 4",
      "C(U²): |0⟩|y⟩ → |0⟩|y⟩,   |1⟩|y⟩ → |1⟩|4y mod 15⟩",
      "c1 = 0: |0001⟩<sub>work</sub>    c1 = 1: |0100⟩<sub>work</sub>",
      "|Ψ⟩<sub>c1,w1,w3</sub> = (|001⟩ + |110⟩)/√2",
      "c1 = w1,   w3 = 1 − c1,   w0 = w2 = 0",
    ],
    facts: [
      ["Entangled partition", "c1 ↔ (w1,w3)"],
      ["Correlated radii", "c1,w1,w3 = 0"],
      ["Unaffected work bits", "w0,w2 = |0⟩"],
      ["Global state", "Pure"],
    ],
  },
  {
    kicker: "Modular exponentiation",
    title: "The low bit completes 2ˣ mod 15",
    operation: "Controlled ×2 mod 15",
    stateLabel: "After controlled U¹",
    circuitStep: 5,
    focus: [2, 3, 4, 5, 6],
    body: [
      "The word <strong>mod</strong> means remainder after division. For example, 16 mod 15 = 1 because 16 = 1·15 + 1, and 32 mod 15 = 2 because 32 = 2·15 + 2. Therefore <strong>f(x) = 2<sup>x</sup> mod 15</strong> is the function that raises 2 to x and returns only the remainder after division by 15. Any remainder modulo 15 lies between 0 and 14; this particular function cycles through only 1, 2, 4, and 8. That use of modular arithmetic is all that makes this a modular function.",
      "The circuit applies three controlled multiplication gates <strong>sequentially</strong>. The work register starts at y = 1. The c0 gate conditionally multiplies y by 2⁴ mod 15 = 1; the c1 gate conditionally multiplies it by 2² mod 15 = 4; and this c2 gate conditionally multiplies it by 2¹ mod 15 = 2. After every multiplication, the result is reduced modulo 15.",
      "These three factors correspond exactly to the binary expansion x = 4c0 + 2c1 + c2. Algebraically, the final work value is y = 1·(2⁴)<sup>c0</sup>(2²)<sup>c1</sup>(2¹)<sup>c2</sup> mod 15 = 2<sup>x</sup> mod 15. For x = 3, the counting bits are 011: c0 contributes no multiplication, c1 contributes ×4, and c2 contributes ×2, so the work value moves 1 → 4 → 8.",
      "After this final gate, the complete state is the sum of eight terms shown below. A label such as <strong>|011⟩<sub>count</sub>|1000⟩<sub>work</sub></strong> is one computational-basis state of the complete seven-qubit register: the three counting bits encode x = 3 and the four work bits encode 8. It is not a basis state belonging to one individual qubit. Seven qubits have 2⁷ = 128 possible joint basis states; only the eight listed here have nonzero coefficients at this step.",
      "The number multiplying each listed joint basis state is its <strong>amplitude</strong>. Every one of these eight coefficients is exactly +1/√8 because the Hadamard gates created eight equal coefficients and the controlled modular multiplications only moved those coefficients to different joint basis labels; they did not change their values. Consequently, each listed seven-bit result has probability |1/√8|² = 1/8 = 12.5% if measured now.",
    ],
    equations: [
      "a mod 15 = the remainder when a is divided by 15",
      "y = 1·(2⁴)<sup>c0</sup>(2²)<sup>c1</sup>(2¹)<sup>c2</sup> mod 15 = 2ˣ mod 15",
      "|Ψ₅⟩ = (1/√8)(|000⟩|0001⟩ + |001⟩|0010⟩ + |010⟩|0100⟩ + |011⟩|1000⟩ + |100⟩|0001⟩ + |101⟩|0010⟩ + |110⟩|0100⟩ + |111⟩|1000⟩)",
      "P(each listed joint state) = |1/√8|² = 1/8 = 12.5%",
    ],
    facts: [
      ["Sequential gates", "c0, then c1, then c2"],
      ["Nonzero joint states", "8 of 128"],
      ["Amplitude each", "+1/√8"],
      ["Probability each", "12.5%"],
    ],
  },
  {
    kicker: "The encoded pattern",
    title: "Exponent values four apart have the same output",
    operation: "Inspect correlations",
    stateLabel: "Modular function encoded",
    circuitStep: 5,
    focus: [0, 1, 2, 3, 4, 5, 6],
    body: [
      "The word <strong>pair</strong> here refers to two numerical exponent values x encoded by the counting register. The pair x = 0 and x = 4 differs by 4 and produces the same work value 1. Likewise, x = 1 and 5 both produce 2; x = 2 and 6 both produce 4; and x = 3 and 7 both produce 8.",
      "In complete register notation, the first equality is between the terms |000⟩<sub>count</sub>|0001⟩<sub>work</sub> and |100⟩<sub>count</sub>|0001⟩<sub>work</sub>. Their counting labels represent 0 and 4, while their identical work label 0001 represents the shared function value 1. The other three pairs have the same structure.",
      "Grouping the eight-term state by shared work output gives four sums: (|0⟩ + |4⟩)|1⟩, (|1⟩ + |5⟩)|2⟩, (|2⟩ + |6⟩)|4⟩, and (|3⟩ + |7⟩)|8⟩, all multiplied by 1/√8. In every sum, the two exponent values differ by exactly 4. This equality f(x + 4) = f(x), and the fact that no smaller positive shift works for every x, is the encoded period r = 4.",
      "If the counting register were measured now, every x from 0 through 7 would still occur with probability 12.5%. That list of individual probabilities is called the counting-register <strong>marginal distribution</strong>: it ignores which work value accompanies each x. The marginal is uniform, so it does not reveal the period by itself. The period is in the pairing between counting labels and work labels.",
      "A Bloch sphere shows only the reduced state of one qubit after all other qubits have been ignored. Here c0 remains pure |+⟩ because changing c0 changes x by 4 without changing the work output. c1 and c2 individually appear maximally mixed, and each work qubit has Bloch radius 0.5. Those one-qubit summaries omit the multi-qubit statement that specific x values share specific work outputs, which is why the full joint-state table is required.",
    ],
    equations: [
      "x = 0,4 → f(x) = 1    x = 1,5 → 2    x = 2,6 → 4    x = 3,7 → 8",
      "|Ψ₅⟩ = (1/√8)[(|0⟩+|4⟩)|1⟩ + (|1⟩+|5⟩)|2⟩ + (|2⟩+|6⟩)|4⟩ + (|3⟩+|7⟩)|8⟩]",
      "f(x + 4) = f(x),   and 4 is the smallest positive shift",
    ],
    facts: [
      ["Exponent pairs", "(0,4), (1,5), (2,6), (3,7)"],
      ["Difference in each pair", "4"],
      ["Counting probability", "12.5% per x"],
      ["Encoded order", "r = 4"],
    ],
  },
  {
    kicker: "Interference",
    title: "The inverse QFT cancels every odd counting value",
    operation: "Inverse QFT on c0-c2",
    stateLabel: "After QFT†",
    circuitStep: 6,
    focus: [0, 1, 2],
    body: [
      "The inverse quantum Fourier transform, written QFT†, acts on the three counting qubits and leaves the four work qubits untouched. It is a change of basis: each input counting state |x⟩ contributes a complex amplitude to every output counting state |y⟩, with phase e<sup>−2πixy/8</sup>. The number 8 is Q = 2³, the number of counting-register basis states.",
      "Before QFT†, every work output is attached to a pair of exponent states separated by four, such as (|0⟩ + |4⟩)|1⟩. For a proposed output y, those two exponent terms contribute a common factor 1 + e<sup>−2πi·4y/8</sup> = 1 + (−1)<sup>y</sup>.",
      "When y is odd, (−1)<sup>y</sup> = −1, so the two contributions add to 1 − 1 = 0 and cancel exactly. When y is even, (−1)<sup>y</sup> = +1, so they add to 2 and reinforce. Every one of the four exponent pairs has the same four-step separation, so all odd counting outcomes vanish and only y = 0, 2, 4, and 6 remain.",
      "The resulting state has sixteen nonzero joint terms: each of the four surviving counting labels can accompany each of the four work values 1, 2, 4, and 8. Every joint term has amplitude magnitude 1/4 and probability 1/16 = 6.25%. Summing the four work possibilities for one counting value gives 4·6.25% = 25%, so each surviving counting outcome has probability 25%.",
      "No measurement has happened yet. The counting and work registers remain entangled. Locally, c0 and c1 each have a zero-length Bloch vector because each is individually 50/50 with no retained one-qubit phase; c2 is pure |0⟩ because every surviving binary y value is even and therefore ends in 0.",
    ],
    equations: [
      "QFT†|x⟩ = (1/√8) Σ<sub>y=0</sub><sup>7</sup> e<sup>−2πixy/8</sup>|y⟩",
      "Pair separated by 4: 1 + e<sup>−2πi·4y/8</sup> = 1 + (−1)<sup>y</sup>",
      "Odd y: 1 − 1 = 0    Even y: 1 + 1 = 2",
      "Surviving y values: 0, 2, 4, 6",
    ],
    facts: [
      ["Input spacing", "4"],
      ["Cancelled outcomes", "y = 1,3,5,7"],
      ["Surviving outcomes", "y = 0,2,4,6"],
      ["Counting probability", "25% each"],
    ],
  },
  {
    kicker: "Quantum output",
    title: "Measurement returns one phase sample",
    operation: "Measure c0-c2",
    stateLabel: "Counting-register marginal",
    circuitStep: 6,
    focus: [0, 1, 2],
    body: [
      "Measuring the counting register converts its three qubits into one classical three-bit result. A physical run returns one of 000, 010, 100, or 110, not the complete probability chart. Each occurs with probability 25% in this exact circuit. The work register is not measured for order recovery.",
      "Interpret the measured bits as an integer y from 0 through Q − 1, where Q = 2³ = 8. The ratio y/Q is an estimate of a fraction k/r, where r is the unknown order and k is an integer selected by the quantum measurement. Because Q is exactly divisible by r = 4 here, the possible fractions are exact rather than approximate: k/r = 0/4, 1/4, 2/4, or 3/4.",
      "The four possible bit strings therefore mean: 000 gives y/8 = 0/8 = 0/4; 010 gives 2/8 = 1/4; 100 gives 4/8 = 2/4 = 1/2; and 110 gives 6/8 = 3/4. The quantum circuit does not label k or r separately; it returns only y, from which the classical code analyzes the fraction y/8.",
      "A sample is directly useful only when reducing k/r to lowest terms does not remove a factor from r. Results 1/4 and 3/4 retain denominator 4. Result 1/2 has denominator 2 because k = 2 shares a factor with r = 4, so it reveals only a divisor of the order. Result 0 contains no denominator information. Unhelpful samples require another run or combination with other samples.",
    ],
    equations: [
      "y/Q ≈ k/r,   with Q = 8",
      "000 → 0/8 = 0    010 → 2/8 = 1/4",
      "100 → 4/8 = 1/2    110 → 6/8 = 3/4",
      "P(000) = P(010) = P(100) = P(110) = 1/4",
    ],
    facts: [
      ["Measured register", "c0c1c2 only"],
      ["Directly useful", "010 or 110"],
      ["Order divisor only", "100"],
      ["No order information", "000"],
    ],
  },
  {
    kicker: "Classical post-processing",
    title: "Recover the order from the measured fraction",
    operation: "Continued fractions",
    stateLabel: "Quantum circuit complete",
    circuitStep: 6,
    focus: [0, 1, 2],
    body: [
      "Suppose the measurement is 010. Its integer value is y = 2, so y/Q = 2/8 = 1/4. In this compiled example the fraction is already exact. The denominator 4 is therefore a candidate for the order r.",
      "In a larger circuit, y/Q will usually be only close to k/r. The <strong>continued-fraction algorithm</strong> rewrites a real number as a sequence of integer quotients and uses its convergents to find nearby fractions with small denominators. Applied to a sufficiently accurate y/Q, one of those fractions is k/r reduced to lowest terms. Its denominator divides r but is not guaranteed to equal r.",
      "Every denominator must therefore be checked with ordinary modular arithmetic. Candidate 4 passes because 2⁴ mod 15 = 1. It is the actual order because the smaller positive divisors 1 and 2 fail: 2¹ mod 15 = 2 and 2² mod 15 = 4.",
      "If the measured result were 100, then y/Q = 1/2 and the proposed denominator 2 would fail the order test. The classical program would reject it and run the quantum circuit again, try suitable multiples, or combine independent samples. It never accepts a denominator merely because it came from one measurement.",
    ],
    equations: [
      "y/Q = 2/8 = 1/4  ⇒  candidate denominator 4",
      "Verify: 2⁴ mod 15 = 1",
      "Minimality: 2¹ mod 15 = 2,   2² mod 15 = 4",
      "Reject denominator 2 because 2² mod 15 ≠ 1",
    ],
    facts: [
      ["Example sample", "y = 2"],
      ["Measured fraction", "1/4"],
      ["Candidate denominator", "4"],
      ["Verified order", "r = 4"],
    ],
  },
  {
    kicker: "Classical factor recovery",
    title: "Period four splits 15 into three and five",
    operation: "Euclidean algorithm",
    stateLabel: "Final classical calculation",
    circuitStep: 6,
    focus: [],
    body: [
      "The classical program now has the verified order r = 4. Because r is even, compute <strong>z = 2<sup>r/2</sup> mod 15 = 2² mod 15 = 4</strong>. The new symbol z avoids confusing this number with the exponent variable x used earlier.",
      "The two trivial square roots of 1 modulo 15 are +1 and −1, represented by remainders 1 and 14. Our value z = 4 is neither one. Yet z² = 16 ≡ 1 (mod 15), so 15 divides z² − 1.",
      "Factor the difference of squares: z² − 1 = (z − 1)(z + 1). Substituting z = 4 gives 15 = 3·5. The GCD calculations recover those shared divisors even when the factorization is not visually obvious: gcd(z − 1,15) = gcd(3,15) = 3 and gcd(z + 1,15) = gcd(5,15) = 5.",
      "Everything after the order was recovered is classical integer arithmetic. If r had been odd, or if the half-order power had produced the trivial remainder −1, this attempt would not split N and the algorithm would choose another base a.",
      "This seven-qubit circuit is a compact educational implementation specialized for N = 15, not a claim that current hardware can factor cryptographic RSA moduli. The mathematical reduction is the same, but useful key sizes require fault-tolerant modular-arithmetic circuits vastly larger than this demonstration. The derivation follows the <a href=\"https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/phase-estimation-and-factoring/shor-algorithm\">IBM Quantum treatment of Shor's algorithm</a>.",
    ],
    equations: [
      "z = 2<sup>4/2</sup> mod 15 = 4",
      "z² − 1 = (z − 1)(z + 1) = 3·5 = 15",
      "gcd(z − 1, 15) = gcd(3, 15) = 3",
      "gcd(z + 1, 15) = gcd(5, 15) = 5",
      "15 = 3 × 5",
    ],
    facts: [
      ["Recovered order", "r = 4"],
      ["Half-order power", "z = 4"],
      ["First factor", "3"],
      ["Second factor", "5"],
    ],
  },
];

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
let periodTraceTimer = null;

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

function traceSequence(values, valueLabel = "f(x)", additionalRows = []) {
  const rows = [
    ["x", values.map((_, index) => index), "x"],
    ...additionalRows,
    [valueLabel, values, "value"],
  ];
  return `
    <div class="trace-sequence">
      ${rows.map(([label, rowValues, rowName]) => `
        <div class="trace-row">
          <span class="trace-row-label">${label}</span>
          ${rowValues.map((value, index) => (
            `<span class="trace-cell" data-trace-row="${rowName}" data-trace-index="${index}">${value}</span>`
          )).join("")}
        </div>
      `).join("")}
      <div class="trace-result"></div>
    </div>
  `;
}

function workValuesByExponent(vector) {
  const workProbabilities = Array.from({ length: 8 }, () => new Map());
  basisProbabilities(vector, QUBIT_COUNT)
    .filter((entry) => entry.probability > EPSILON)
    .forEach((entry) => {
      const exponent = Number.parseInt(entry.basis.slice(0, 3), 2);
      const workValue = Number.parseInt(entry.basis.slice(3), 2);
      const probabilities = workProbabilities[exponent];
      probabilities.set(
        workValue,
        (probabilities.get(workValue) ?? 0) + entry.probability,
      );
    });

  return workProbabilities.map((probabilities) => {
    if (probabilities.size === 0) return "–";
    return [...probabilities.entries()]
      .sort((left, right) => right[1] - left[1])[0][0];
  });
}

function paintClassicalCounter(index) {
  periodTraceVisual.querySelectorAll(".trace-cell").forEach((cell) => {
    const cellIndex = Number.parseInt(cell.dataset.traceIndex, 10);
    cell.classList.toggle("is-seen", cellIndex <= index);
    cell.classList.toggle("is-current", cellIndex === index);
    cell.classList.remove("is-repeat");
  });

  const result = periodTraceVisual.querySelector(".trace-result");
  if (index === 0) {
    result.innerHTML = "Start at f(0) = 1. Now look for the smallest positive x that returns to 1.";
    return;
  }
  if (index < 4) {
    result.innerHTML = `f(${index}) = ${PERIOD_VALUES[index]}. It has not returned to 1 yet.`;
    return;
  }

  periodTraceVisual.querySelectorAll('[data-trace-index="0"], [data-trace-index="4"]')
    .forEach((cell) => cell.classList.add("is-repeat"));
  result.innerHTML = "f(4) = f(0) = 1. The first return occurred after 4 steps, so <strong>r = 4</strong>.";
}

function renderPeriodTrace(index, vector) {
  if (periodTraceTimer !== null) {
    window.clearInterval(periodTraceTimer);
    periodTraceTimer = null;
  }

  if (index === 0) {
    periodTraceStatus.textContent = "Classical reduction";
    periodTraceCopy.innerHTML = "The quantum circuit only has to find an order r. If r is even, define z = a<sup>r/2</sup>. Then z² ≡ 1 (mod N), so N divides (z − 1)(z + 1), and two GCD calculations may expose factors of N.";
    periodTraceVisual.innerHTML = `${tracePipeline([
      ["r even", "order condition"],
      ["z = a<sup>r/2</sup>", "half-order power"],
      ["N | (z−1)(z+1)", "difference of squares"],
      ["gcd(z±1,N)", "candidate factors"],
    ])}<div class="trace-result">The quantum part estimates r. The substitutions, verification, and GCD calculations afterward are ordinary classical arithmetic.</div>`;
    return;
  }

  if (index === 1) {
    periodTraceStatus.textContent = "Classical counter (comparison)";
    periodTraceCopy.innerHTML = "A conventional program could evaluate one exponent at a time. This animation is a reference for what period means; it is <strong>not</strong> how the quantum circuit runs.";
    periodTraceVisual.innerHTML = traceSequence(PERIOD_VALUES);
    let counter = 0;
    paintClassicalCounter(counter);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paintClassicalCounter(4);
      return;
    }
    periodTraceTimer = window.setInterval(() => {
      counter += 1;
      paintClassicalCounter(counter);
      if (counter === 4) {
        window.clearInterval(periodTraceTimer);
        periodTraceTimer = null;
      }
    }, 750);
    return;
  }

  if (index === 2 || index === 3) {
    const initialized = index === 3;
    periodTraceStatus.textContent = initialized ? "Work register seeded" : "Register roles";
    periodTraceCopy.innerHTML = "There is <strong>no qubit that stores r</strong>. The counting register labels an exponent x, the work register stores the corresponding remainder 2<sup>x</sup> mod 15, and the inverse QFT later converts repetition in those paired values into measurable probabilities.";
    periodTraceVisual.innerHTML = `
      <div class="trace-registers">
        <div class="trace-register">
          <strong>Counting register</strong>
          <span>${initialized ? "|000⟩" : "|000⟩ initially"}</span>
          <small>three bits encode x = 0 through 7</small>
        </div>
        <div class="trace-register">
          <strong>Work register</strong>
          <span>${initialized ? "|0001⟩ = 1" : "|0000⟩ initially"}</span>
          <small>four bits encode a value from 0 through 15</small>
        </div>
        <div class="trace-register is-warning">
          <strong>Not present</strong>
          <span>no register containing r</span>
          <small>r is inferred from repeated measurement results</small>
        </div>
      </div>
    `;
    return;
  }

  if (index >= 4 && index <= 8) {
    const values = workValuesByExponent(vector);
    const traceStates = {
      4: [
        "Eight complete joint-state terms",
        "The Hadamard gates create one term for every counting-register value x = 0 through 7. The work register remains |0001⟩ in every term because modular exponentiation has not started.",
        "Each column is one complete seven-qubit state |x⟩|0001⟩ with amplitude +1/√8 and probability 1/8. The circuit did not count through these values one after another.",
        "work",
      ],
      5: [
        "c0 contributes the 2⁴ factor",
        "For x = 4c0 + 2c1 + c2, c0 is the four's-place bit. When c0 = 1, this gate multiplies the work value by 2⁴ mod 15 = 1; when c0 = 0, it does nothing.",
        "The c0 = 1 columns are x = 4, 5, 6, and 7, but multiplication by 1 changes none of them. This identity is the first visible consequence of the period being four.",
        "work",
      ],
      6: [
        "Partial modular function",
        "This is one controlled quantum operation, not program control flow. It applies identity where c1 = 0 and modular ×4 where c1 = 1, without measuring c1.",
        "The table shows every basis term. Columns with c1 = 1 receive ×4, producing 1, 1, 4, 4, 1, 1, 4, 4. The low exponent bit has not been applied yet.",
        "work",
      ],
      7: [
        "Function encoded",
        "Read each column downward. The work value begins at 1, then the c0, c1, and c2 controlled gates act sequentially. The last row is the resulting remainder 2ˣ mod 15.",
        "The eight nonzero joint states are |x⟩|f(x)⟩. Each has coefficient +1/√8; f(x) = 1, 2, 4, 8, 1, 2, 4, 8.",
        "f(x)",
      ],
      8: [
        "Four pairs of exponent values",
        "The pairs are values of x encoded by the counting register. In each pair, the two exponent values produce the same work-register result: x = 0 and 4 both produce 1, x = 1 and 5 both produce 2, and so on.",
        "A: x = 0 and 4 → 1. B: x = 1 and 5 → 2. C: x = 2 and 6 → 4. D: x = 3 and 7 → 8. Every second exponent is exactly four larger, so f(x + 4) = f(x).",
        "f(x)",
      ],
    };
    const [status, copy, result, valueLabel] = traceStates[index];
    periodTraceStatus.textContent = status;
    periodTraceCopy.innerHTML = copy;
    let controlRows = [];
    if (index === 6) {
      controlRows = [
        ["|x⟩", ["000", "001", "010", "011", "100", "101", "110", "111"], "basis"],
        ["c1", [0, 0, 1, 1, 0, 0, 1, 1], "control"],
        ["gate", ["I", "I", "×4", "×4", "I", "I", "×4", "×4"], "gate"],
      ];
    }
    if (index === 4) {
      controlRows = [
        ["|x⟩", ["000", "001", "010", "011", "100", "101", "110", "111"], "basis"],
        ["amplitude", ["1/√8", "1/√8", "1/√8", "1/√8", "1/√8", "1/√8", "1/√8", "1/√8"], "amplitude"],
      ];
    }
    if (index === 5) {
      controlRows = [
        ["|x⟩", ["000", "001", "010", "011", "100", "101", "110", "111"], "basis"],
        ["c0", [0, 0, 0, 0, 1, 1, 1, 1], "control"],
        ["gate", ["I", "I", "I", "I", "×1", "×1", "×1", "×1"], "gate"],
      ];
    }
    if (index === 7) {
      controlRows = [
        ["|x⟩", ["000", "001", "010", "011", "100", "101", "110", "111"], "basis"],
        ["start", [1, 1, 1, 1, 1, 1, 1, 1], "start"],
        ["after c0", [1, 1, 1, 1, 1, 1, 1, 1], "after-c0"],
        ["after c1", [1, 1, 4, 4, 1, 1, 4, 4], "after-c1"],
        ["c2 gate", ["I", "×2", "I", "×2", "I", "×2", "I", "×2"], "gate"],
      ];
    }
    if (index === 8) {
      controlRows = [
        ["|x⟩", ["000", "001", "010", "011", "100", "101", "110", "111"], "basis"],
        ["pair", ["A", "B", "C", "D", "A", "B", "C", "D"], "pair"],
      ];
    }
    periodTraceVisual.innerHTML = traceSequence(values, valueLabel, controlRows);
    periodTraceVisual.querySelectorAll(".trace-cell")
      .forEach((cell) => cell.classList.add("is-seen"));
    if (index === 6) {
      [2, 3, 6, 7].forEach((controlledIndex) => {
        periodTraceVisual.querySelectorAll(`[data-trace-index="${controlledIndex}"]`)
          .forEach((cell) => cell.classList.add("is-controlled"));
      });
    }
    if (index === 5) {
      [4, 5, 6, 7].forEach((controlledIndex) => {
        periodTraceVisual.querySelectorAll(`[data-trace-index="${controlledIndex}"]`)
          .forEach((cell) => cell.classList.add("is-controlled"));
      });
    }
    if (index === 7) {
      [1, 3, 5, 7].forEach((controlledIndex) => {
        periodTraceVisual.querySelectorAll(`[data-trace-index="${controlledIndex}"]`)
          .forEach((cell) => cell.classList.add("is-controlled"));
      });
    }
    if (index === 8) {
      periodTraceVisual.querySelectorAll(".trace-cell").forEach((cell) => {
        cell.classList.add(`pair-${Number.parseInt(cell.dataset.traceIndex, 10) % 4}`);
      });
    }
    periodTraceVisual.querySelector(".trace-result").innerHTML = result;
    return;
  }

  if (index === 9) {
    periodTraceStatus.textContent = "Why only four counting values survive";
    periodTraceCopy.innerHTML = "Each work value appears beside two exponent values separated by four: x and x + 4. For a proposed measurement y, those two contributions differ by the phase factor e<sup>−2πi·4y/8</sup> = (−1)<sup>y</sup>.";
    periodTraceVisual.innerHTML = `${tracePipeline([
      ["Δx = 4", "paired exponents"],
      ["1 + (−1)<sup>y</sup>", "combined amplitude"],
      ["odd y → 0", "destructive interference"],
      ["even y → 2", "constructive interference"],
    ])}<div class="trace-result">Odd values y = 1, 3, 5, 7 cancel. Even values y = 0, 2, 4, 6 reinforce, so each has 25% counting-register probability. One hardware run measures one of those four values.</div>`;
    return;
  }

  if (index === 10) {
    periodTraceStatus.textContent = "One measured sample";
    periodTraceCopy.innerHTML = "Only the three counting qubits are measured here. Suppose one run returns |010⟩. Those bits encode the integer y = 2, and Q = 8 is the number of counting-register values.";
    periodTraceVisual.innerHTML = `${tracePipeline([
      ["|010⟩", "measured bits"],
      ["y = 2", "measured integer"],
      ["y/Q = 2/8", "phase estimate"],
      ["1/4", "reduced fraction"],
    ])}<div class="trace-result">The four possible outcomes correspond to 000 → 0, 010 → 1/4, 100 → 1/2, and 110 → 3/4 after dividing y by Q. A single run returns only one of them.</div>`;
    return;
  }

  if (index === 11) {
    periodTraceStatus.textContent = "Recover r classically";
    periodTraceCopy.innerHTML = "The measured fraction y/Q approximates k/r for some integer k. Continued fractions finds simple fractions near y/Q; the denominator is a candidate that may equal r or divide r, so it must be checked.";
    periodTraceVisual.innerHTML = `${tracePipeline([
      ["2/8 = 1/4", "measured fraction"],
      ["k/r = 1/4", "simple nearby fraction"],
      ["candidate 4", "denominator"],
      ["2⁴ mod 15 = 1", "verification"],
    ])}<div class="trace-result">The smaller divisors 1 and 2 do not return 2<sup>d</sup> mod 15 to 1, so 4 is the smallest valid exponent and therefore the order r.</div>`;
    return;
  }

  periodTraceStatus.textContent = "Use r to factor N";
  periodTraceCopy.innerHTML = "Let z = 2<sup>r/2</sup> mod 15. Because 2<sup>r</sup> ≡ 1 (mod 15), z² ≡ 1 (mod 15), so 15 divides (z − 1)(z + 1). The two GCDs test how the factors of 15 split between those neighboring integers.";
  periodTraceVisual.innerHTML = `${tracePipeline([
    ["r = 4", "recovered order"],
    ["z = 2² mod 15 = 4", "half-order power"],
    ["gcd(z−1,15) = 3", "first factor"],
    ["gcd(z+1,15) = 5", "second factor"],
    ["3 × 5", "answer"],
  ])}<div class="trace-result">Quantum period finding supplied r = 4; ordinary integer arithmetic turned it into 15 = 3 × 5.</div>`;
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
  renderPeriodTrace(nextIndex, nextVector);
  renderDistribution(nextVector);
  renderBasisAmplitudes(nextVector);
  renderProgress(nextIndex);
  basisDetails.open = nextIndex === 7 || nextIndex === 8 || nextIndex === 9;
  document.querySelectorAll(".step-explanation, .math-explanation, .state-evidence")
    .forEach((panel) => { panel.scrollTop = 0; });
  if (updateHash) history.replaceState(null, "", `#step-${nextIndex + 1}`);
}

steps.forEach((step, index) => {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "step-marker";
  marker.textContent = String(index + 1);
  marker.title = step.title;
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
