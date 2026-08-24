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
    title: "How a period exposes factors",
    operation: "No gates yet",
    stateLabel: "Quantum register not used yet",
    circuitStep: 0,
    focus: [],
    body: [
      "Start with the composite number <strong>N</strong> that we want to factor. Choose an integer <strong>a</strong> between 1 and N that shares no factor with N, then examine the modular-power function <strong>f(x) = a<sup>x</sup> mod N</strong>. Because a is coprime to N, its powers eventually return to 1 and repeat. The smallest positive exponent that returns to 1 is the <strong>order r</strong> of a modulo N.",
      "If r is even, define <strong>y = a<sup>r/2</sup></strong>. Since a<sup>r</sup> ≡ 1 mod N, we know y² ≡ 1 mod N. Therefore N divides y² − 1 = (y − 1)(y + 1). If y is neither +1 nor −1 modulo N, neither parenthesis contains all of N, but together their product does. The shared divisors <strong>gcd(y − 1, N)</strong> and <strong>gcd(y + 1, N)</strong> reveal nontrivial factors of N.",
      "The quantum computer is used only for the difficult middle step: obtaining information from which we can recover r. Choosing a, checking gcd(a, N), validating the candidate order, and calculating the final GCDs are classical operations. If r is odd or y ≡ −1 mod N, this choice of a did not help and we choose another a.",
      "In this tour, N = 15 and a = 2. The exact periodic function we ask the quantum circuit to analyze is <strong>f(x) = 2<sup>x</sup> mod 15</strong>.",
    ],
    equations: [
      "f(x) = a<sup>x</sup> mod N",
      "r = min{k &gt; 0 : a<sup>k</sup> ≡ 1 (mod N)}",
      "a<sup>r</sup> − 1 = (a<sup>r/2</sup> − 1)(a<sup>r/2</sup> + 1)",
      "Factors ← gcd(a<sup>r/2</sup> − 1, N), gcd(a<sup>r/2</sup> + 1, N)",
    ],
    facts: [
      ["Classical input", "N and a"],
      ["Periodic function", "aˣ mod N"],
      ["Quantum objective", "Recover r"],
      ["Classical output", "Factors of N"],
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
      "Choose <strong>a = 2</strong>. Before using a quantum computer, Euclid's algorithm checks gcd(2, 15) = 1. Had that GCD been greater than one, we would already have found a factor and would not need order finding.",
      "Now inspect f(x) = 2<sup>x</sup> mod 15. Its values are 1, 2, 4, 8, then 1 again. The first return to 1 occurs at x = 4, so the order is r = 4. We can calculate this tiny sequence by hand; the quantum portion of the tour demonstrates how period information can instead be extracted from a state containing many exponent branches.",
      "Once r = 4 has been recovered and verified, set y = 2<sup>4/2</sup> = 4. The two GCD calculations give gcd(4 − 1, 15) = 3 and gcd(4 + 1, 15) = 5. That is the complete reason finding this period factors 15.",
      "A real execution does not directly return the factors or even print r. It returns a phase sample from the counting register. Classical continued fractions propose r from that sample; modular exponentiation verifies it; then the GCD calculations produce the factors.",
    ],
    equations: [
      "gcd(2, 15) = 1",
      "2⁰, 2¹, 2², 2³, 2⁴ (mod 15) = 1, 2, 4, 8, 1",
      "r = 4  ⇒  y = 2<sup>r/2</sup> = 4",
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
      "The upper three qubits form the <strong>counting register</strong>. Their bit string will eventually encode an estimate of a phase. The lower four form the <strong>work register</strong>, which stores values modulo 15.",
      "The symbol <strong>|0⟩ names a basis state</strong>; it does not mean that the state's amplitude is zero. As a two-entry column vector, |0⟩ = [1, 0]<sup>T</sup>: the amplitude for measuring 0 is 1, and the amplitude for measuring 1 is 0.",
      "The expression <strong>|000⟩<sub>count</sub> ⊗ |0000⟩<sub>work</sub></strong> joins the three counting qubits and four work qubits with a tensor product. It is the same seven-bit basis state as |0000000⟩. It describes the current state of the seven qubits, not an operation performed on them.",
      "A general seven-qubit state assigns a complex coefficient, called an <strong>amplitude</strong>, to each of its 128 possible basis states. Here the coefficient of |0000000⟩ is 1 and the other 127 coefficients are 0. That is what 'one nonzero amplitude' means. Its measurement probability is |1|² = 100%.",
      "Each qubit is <strong>pure</strong> because it is completely described by |0⟩ rather than a statistical mixture. The joint state is a <strong>product state</strong> because it factors into seven independent single-qubit states; none of the qubits are entangled yet.",
    ],
    equations: [
      "|0⟩ = [1, 0]<sup>T</sup>",
      "|000⟩<sub>count</sub> ⊗ |0000⟩<sub>work</sub> = |0000000⟩",
      "|Ψ₀⟩ = 1·|0000000⟩ + 0·|0000001⟩ + … + 0·|1111111⟩",
      "P(0000000) = |1|² = 1",
    ],
    facts: [
      ["Basis states", "2⁷ = 128"],
      ["Nonzero coefficients", "1"],
      ["Certain outcome", "000 | 0000"],
      ["Entanglement", "None"],
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
      "Modular exponentiation needs the work register to start at the multiplicative identity, <strong>1</strong>, rather than 0. An X gate flips the least-significant work qubit w3 from |0⟩ to |1⟩.",
      "This is still a product state. Nothing is in superposition and nothing is entangled. We have simply encoded the integer 1 as the four-bit string 0001 so subsequent controlled multiplications can transform it into 2<sup>x</sup> mod 15.",
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
      "A Hadamard gate maps each counting qubit from |0⟩ to |+⟩. Together, the three gates create an equal superposition of all eight exponent values x = 0 through 7. Each branch has amplitude 1/√8 and probability 1/8.",
      "It is important not to describe this as eight classical calculations that have already happened. We have prepared one coherent state with eight basis components. The advantage comes from preserving their relative phases and later making the inverse QFT cause those components to interfere.",
    ],
    equations: [
      "H|0⟩ = (|0⟩ + |1⟩)/√2 = |+⟩",
      "|Ψ₂⟩ = (1/√8) Σ<sub>x=0</sub><sup>7</sup> |x⟩|1⟩",
    ],
    facts: [
      ["Branches", "8"],
      ["Amplitude each", "1/√8 ≈ 0.354"],
      ["Probability each", "12.5%"],
      ["Work value", "Still 1"],
    ],
  },
  {
    kicker: "Controlled modular power",
    title: "The high exponent bit controls an identity",
    operation: "Controlled ×1 mod 15",
    stateLabel: "After controlled U⁴",
    circuitStep: 3,
    focus: [0, 3, 4, 5, 6],
    body: [
      "The most-significant counting bit c0 has binary weight 4, so it controls multiplication by 2<sup>4</sup> mod 15. Because 16 mod 15 = 1, that controlled operation is the identity on the work register.",
      "Nothing visible changes, but this is not an omitted step. The fact that the fourth power becomes identity is exactly the periodic structure we are trying to detect. c0 remains a pure |+⟩ because the work register cannot record whether this control was 0 or 1.",
    ],
    equations: [
      "2⁴ mod 15 = 16 mod 15 = 1",
      "U⁴|y⟩ = |1 · y mod 15⟩ = |y⟩",
    ],
    facts: [
      ["Control", "c0, weight 4"],
      ["Multiplier", "1 mod 15"],
      ["Visible change", "None"],
      ["c0 purity", "1.000"],
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
      "The middle counting bit c1 has weight 2, so it controls multiplication by 2<sup>2</sup> mod 15 = 4. Branches with c1 = 0 leave the work value at 1; branches with c1 = 1 change it to 4.",
      "Now c1 and parts of the work register become entangled. Their individual Bloch vectors can collapse to the center even though the complete seven-qubit state remains pure. The missing local information has not been destroyed; it now exists in correlations such as “c1 = 0 goes with work = 1” and “c1 = 1 goes with work = 4.”",
    ],
    equations: [
      "2² mod 15 = 4",
      "|0⟩|1⟩ → |0⟩|1⟩,   |1⟩|1⟩ → |1⟩|4⟩",
    ],
    facts: [
      ["Control", "c1, weight 2"],
      ["Multiplier", "4 mod 15"],
      ["Work values", "1 or 4"],
      ["c1 Bloch radius", "0.000"],
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
      "The least-significant counting bit c2 has weight 1, so it controls multiplication by 2. Combining all three controls computes the modular function for every exponent branch: the work register now holds 2<sup>x</sup> mod 15 alongside the corresponding |x⟩.",
      "The eight amplitudes still have equal magnitude. What changed is which seven-bit basis state owns each amplitude. The function values repeat every four exponents: 1, 2, 4, 8, then 1, 2, 4, 8 again.",
    ],
    equations: [
      "|Ψ₅⟩ = (1/√8) Σ<sub>x=0</sub><sup>7</sup> |x⟩|2ˣ mod 15⟩",
      "f(x) = 2ˣ mod 15 = 1, 2, 4, 8, 1, 2, 4, 8",
    ],
    facts: [
      ["Control", "c2, weight 1"],
      ["Multiplier", "2 mod 15"],
      ["Distinct work values", "4"],
      ["Period", "4 branches"],
    ],
  },
  {
    kicker: "The encoded pattern",
    title: "The period lives in joint correlations",
    operation: "Inspect correlations",
    stateLabel: "Modular function encoded",
    circuitStep: 5,
    focus: [0, 1, 2, 3, 4, 5, 6],
    body: [
      "At this stage the counting register alone still has a uniform measurement distribution. Looking only at its eight probabilities would not reveal the period. The useful structure is in the <strong>joint</strong> mapping between exponent and work value.",
      "Pairs separated by four share a work value: 0 and 4 map to 1, 1 and 5 map to 2, 2 and 6 map to 4, and 3 and 7 map to 8. This is why individual Bloch spheres are insufficient to describe a multi-qubit algorithm: seven local summaries cannot reconstruct the 128-amplitude joint state or its correlations.",
    ],
    equations: [
      "0,4 → 1    1,5 → 2    2,6 → 4    3,7 → 8",
      "f(x + 4) = f(x)",
    ],
    facts: [
      ["Counting marginal", "Uniform"],
      ["Joint pattern", "Pairs Δx = 4"],
      ["c0 radius", "1.000"],
      ["Work radii", "0.500 each"],
    ],
  },
  {
    kicker: "Interference",
    title: "The inverse QFT turns periodic phase into peaks",
    operation: "Inverse QFT on c0-c2",
    stateLabel: "After QFT†",
    circuitStep: 6,
    focus: [0, 1, 2],
    body: [
      "The inverse quantum Fourier transform acts only on the counting register. It combines all eight exponent amplitudes with carefully chosen phases. Contributions inconsistent with the period cancel, while contributions at frequencies compatible with period four reinforce one another.",
      "The counting register is still entangled with the work register, so this is not one ordinary three-qubit pure state. The individual c0 and c1 Bloch vectors sit at the center. Nevertheless, their <strong>joint measurement distribution</strong> has become sharply concentrated at four bit strings.",
    ],
    equations: [
      "QFT†|x⟩ = (1/√8) Σ<sub>y=0</sub><sup>7</sup> e<sup>−2πixy/8</sup>|y⟩",
      "Constructive peaks: y = 0, 2, 4, 6",
      "y/8 = 0, 1/4, 1/2, 3/4",
    ],
    facts: [
      ["Operation", "QFT† on 3 qubits"],
      ["Nonzero amplitudes", "16 joint terms"],
      ["Counting outcomes", "4"],
      ["Probability each", "25%"],
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
      "A real execution measures one counting bit string, not the whole probability table. In this exact simulation, 000, 010, 100, and 110 each occur with probability 25%. Dividing the measured integer y by 8 converts that bit string into a phase estimate.",
      "Not every sample is equally useful. 010 gives 1/4 and 110 gives 3/4, both of which reveal denominator 4. The 100 result reduces to 1/2 and suggests only a divisor of the true order. The 000 result provides no period information. Shor's algorithm is probabilistic, so unsuccessful samples are handled by repeating the experiment.",
    ],
    equations: [
      "010₂ = 2,   θ = 2/8 = 1/4",
      "110₂ = 6,   θ = 6/8 = 3/4",
      "P(000) = P(010) = P(100) = P(110) = 1/4",
    ],
    facts: [
      ["Useful directly", "010 or 110"],
      ["Partial information", "100"],
      ["No information", "000"],
      ["Response", "Repeat if needed"],
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
      "Suppose measurement produced 010. The phase estimate is 2/8 = 1/4, whose denominator proposes <strong>r = 4</strong>. For larger instances the phase will generally be an approximation, so continued fractions recover a nearby rational number with a suitably small denominator.",
      "The candidate must be verified classically by checking 2<sup>r</sup> mod 15 = 1. If a sample yields 1/2, its denominator 2 fails that verification because 2² mod 15 = 4. We then repeat or combine information from additional samples rather than accepting the denominator blindly.",
    ],
    equations: [
      "y/2ᵐ = 2/8 = 1/4  ⇒  candidate r = 4",
      "Verify: 2⁴ mod 15 = 1",
      "Reject r = 2 because 2² mod 15 = 4 ≠ 1",
    ],
    facts: [
      ["Example sample", "y = 2"],
      ["Phase", "1/4"],
      ["Candidate order", "r = 4"],
      ["Verification", "2⁴ mod 15 = 1"],
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
      "The recovered order is even, so compute x = 2<sup>r/2</sup> mod 15 = 4. This x is neither +1 nor −1 modulo 15, which means x² − 1 is divisible by 15 while neither x − 1 nor x + 1 is divisible by 15 on its own.",
      "That forces nontrivial factors of 15 to be distributed across x − 1 and x + 1. Two ordinary GCD calculations recover them: gcd(3, 15) = 3 and gcd(5, 15) = 5. The quantum computer supplied the order; the final extraction is entirely classical.",
      "This is a compact compiled demonstration, not a claim that present hardware can factor useful RSA keys. The same mathematical reduction scales, while fault-tolerant modular arithmetic at cryptographic sizes requires vastly larger circuits. The derivation follows the <a href=\"https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/phase-estimation-and-factoring/shor-algorithm\">IBM Quantum treatment of Shor's algorithm</a>.",
    ],
    equations: [
      "x = 2<sup>4/2</sup> mod 15 = 4",
      "gcd(x − 1, 15) = gcd(3, 15) = 3",
      "gcd(x + 1, 15) = gcd(5, 15) = 5",
      "15 = 3 × 5",
    ],
    facts: [
      ["Recovered order", "r = 4"],
      ["Half-order power", "x = 4"],
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
