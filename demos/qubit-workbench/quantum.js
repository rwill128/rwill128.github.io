const SQRT_HALF = 1 / Math.sqrt(2);

function complex(re = 0, im = 0) {
  return { re, im };
}

function add(left, right) {
  return complex(left.re + right.re, left.im + right.im);
}

function multiply(left, right) {
  return complex(
    left.re * right.re - left.im * right.im,
    left.re * right.im + left.im * right.re,
  );
}

function scale(value, amount) {
  return complex(value.re * amount, value.im * amount);
}

function magnitudeSquared(value) {
  return value.re * value.re + value.im * value.im;
}

export const MATRICES = {
  H: [
    [complex(SQRT_HALF), complex(SQRT_HALF)],
    [complex(SQRT_HALF), complex(-SQRT_HALF)],
  ],
  X: [
    [complex(), complex(1)],
    [complex(1), complex()],
  ],
  Y: [
    [complex(), complex(0, -1)],
    [complex(0, 1), complex()],
  ],
  Z: [
    [complex(1), complex()],
    [complex(), complex(-1)],
  ],
  S: [
    [complex(1), complex()],
    [complex(), complex(0, 1)],
  ],
  SDG: [
    [complex(1), complex()],
    [complex(), complex(0, -1)],
  ],
  T: [
    [complex(1), complex()],
    [complex(), complex(SQRT_HALF, SQRT_HALF)],
  ],
  TDG: [
    [complex(1), complex()],
    [complex(), complex(SQRT_HALF, -SQRT_HALF)],
  ],
};

export function rotationMatrix(axis, angle) {
  const cosine = Math.cos(angle / 2);
  const sine = Math.sin(angle / 2);

  if (axis === "X") {
    return [
      [complex(cosine), complex(0, -sine)],
      [complex(0, -sine), complex(cosine)],
    ];
  }
  if (axis === "Y") {
    return [
      [complex(cosine), complex(-sine)],
      [complex(sine), complex(cosine)],
    ];
  }
  if (axis === "Z") {
    return [
      [complex(cosine, -sine), complex()],
      [complex(), complex(cosine, sine)],
    ];
  }
  throw new Error(`Unsupported rotation axis: ${axis}`);
}

export function qubitState(theta, phi) {
  return [
    complex(Math.cos(theta / 2)),
    complex(
      Math.sin(theta / 2) * Math.cos(phi),
      Math.sin(theta / 2) * Math.sin(phi),
    ),
  ];
}

export function initialStateVector(qubits) {
  let vector = [complex(1)];
  for (const qubit of qubits) {
    const nextQubit = qubitState(qubit.theta, qubit.phi);
    const expanded = [];
    for (const amplitude of vector) {
      expanded.push(multiply(amplitude, nextQubit[0]));
      expanded.push(multiply(amplitude, nextQubit[1]));
    }
    vector = expanded;
  }
  return vector;
}

function qubitMask(qubitCount, qubit) {
  return 1 << (qubitCount - 1 - qubit);
}

function readRegisterValue(basis, qubitCount, rows) {
  return rows.reduce((value, row) => (
    (value << 1) | ((basis & qubitMask(qubitCount, row)) === 0 ? 0 : 1)
  ), 0);
}

function writeRegisterValue(basis, qubitCount, rows, value) {
  return rows.reduce((nextBasis, row, index) => {
    const mask = qubitMask(qubitCount, row);
    const bit = 1 << (rows.length - 1 - index);
    return (value & bit) === 0 ? nextBasis & ~mask : nextBasis | mask;
  }, basis);
}

export function applySingleQubitGate(vector, qubitCount, qubit, matrix) {
  const output = vector.map((value) => complex(value.re, value.im));
  const mask = qubitMask(qubitCount, qubit);

  for (let basis = 0; basis < vector.length; basis += 1) {
    if ((basis & mask) !== 0) continue;
    const zeroIndex = basis;
    const oneIndex = basis | mask;
    const zero = vector[zeroIndex];
    const one = vector[oneIndex];
    output[zeroIndex] = add(multiply(matrix[0][0], zero), multiply(matrix[0][1], one));
    output[oneIndex] = add(multiply(matrix[1][0], zero), multiply(matrix[1][1], one));
  }

  return output;
}

export function applyControlledX(vector, qubitCount, control, target) {
  const output = vector.map((value) => complex(value.re, value.im));
  const controlMask = qubitMask(qubitCount, control);
  const targetMask = qubitMask(qubitCount, target);

  for (let basis = 0; basis < vector.length; basis += 1) {
    if ((basis & controlMask) === 0 || (basis & targetMask) !== 0) continue;
    const targetIndex = basis | targetMask;
    output[basis] = complex(vector[targetIndex].re, vector[targetIndex].im);
    output[targetIndex] = complex(vector[basis].re, vector[basis].im);
  }

  return output;
}

export function applyControlledZ(vector, qubitCount, control, target) {
  const controlMask = qubitMask(qubitCount, control);
  const targetMask = qubitMask(qubitCount, target);
  return vector.map((value, basis) => {
    const shouldFlip = (basis & controlMask) !== 0 && (basis & targetMask) !== 0;
    return shouldFlip ? scale(value, -1) : complex(value.re, value.im);
  });
}

export function applySwap(vector, qubitCount, first, second) {
  const output = vector.map((value) => complex(value.re, value.im));
  const firstMask = qubitMask(qubitCount, first);
  const secondMask = qubitMask(qubitCount, second);

  for (let basis = 0; basis < vector.length; basis += 1) {
    const firstBit = (basis & firstMask) !== 0;
    const secondBit = (basis & secondMask) !== 0;
    if (firstBit || !secondBit) continue;
    const swappedIndex = basis ^ firstMask ^ secondMask;
    output[basis] = complex(vector[swappedIndex].re, vector[swappedIndex].im);
    output[swappedIndex] = complex(vector[basis].re, vector[basis].im);
  }

  return output;
}

export function applyControlledModularMultiply(
  vector,
  qubitCount,
  control,
  workRows,
  multiplier,
  modulus,
) {
  const output = vector.map(() => complex());
  const controlMask = qubitMask(qubitCount, control);

  for (let basis = 0; basis < vector.length; basis += 1) {
    let outputBasis = basis;
    if ((basis & controlMask) !== 0) {
      const workValue = readRegisterValue(basis, qubitCount, workRows);
      const multiplied = workValue < modulus
        ? (workValue * multiplier) % modulus
        : workValue;
      outputBasis = writeRegisterValue(basis, qubitCount, workRows, multiplied);
    }
    output[outputBasis] = add(output[outputBasis], vector[basis]);
  }

  return output;
}

export function applyInverseQft(vector, qubitCount, rows) {
  const registerSize = 1 << rows.length;
  const normalization = 1 / Math.sqrt(registerSize);
  const output = vector.map(() => complex());

  // Transform each register slice while preserving every qubit outside the register.
  for (let basis = 0; basis < vector.length; basis += 1) {
    if (readRegisterValue(basis, qubitCount, rows) !== 0) continue;
    for (let outputValue = 0; outputValue < registerSize; outputValue += 1) {
      let sum = complex();
      for (let inputValue = 0; inputValue < registerSize; inputValue += 1) {
        const inputBasis = writeRegisterValue(basis, qubitCount, rows, inputValue);
        const angle = (-2 * Math.PI * inputValue * outputValue) / registerSize;
        sum = add(sum, multiply(
          complex(Math.cos(angle), Math.sin(angle)),
          vector[inputBasis],
        ));
      }
      const outputBasis = writeRegisterValue(basis, qubitCount, rows, outputValue);
      output[outputBasis] = scale(sum, normalization);
    }
  }

  return output;
}

function applyGate(vector, qubitCount, gate) {
  if (MATRICES[gate.type]) {
    return applySingleQubitGate(vector, qubitCount, gate.rows[0], MATRICES[gate.type]);
  }
  if (gate.type === "CNOT") {
    return applyControlledX(vector, qubitCount, gate.control, gate.target);
  }
  if (gate.type === "CZ") {
    return applyControlledZ(vector, qubitCount, gate.control, gate.target);
  }
  if (gate.type === "SWAP") {
    return applySwap(vector, qubitCount, gate.rows[0], gate.rows[1]);
  }
  if (gate.type === "CMOD") {
    return applyControlledModularMultiply(
      vector,
      qubitCount,
      gate.control,
      gate.workRows,
      gate.multiplier,
      gate.modulus,
    );
  }
  if (gate.type === "IQFT") {
    return applyInverseQft(vector, qubitCount, gate.rows);
  }
  throw new Error(`Unsupported gate: ${gate.type}`);
}

export function simulateCircuit(qubits, gates, stepCount) {
  const qubitCount = qubits.length;
  let vector = initialStateVector(qubits);
  const orderedGates = [...gates]
    .filter((gate) => gate.column < stepCount)
    .sort((left, right) => left.column - right.column || left.rows[0] - right.rows[0]);

  for (const gate of orderedGates) {
    vector = applyGate(vector, qubitCount, gate);
  }

  return vector;
}

export function basisProbabilities(vector, qubitCount) {
  return vector.map((amplitude, basis) => ({
    basis: basis.toString(2).padStart(qubitCount, "0"),
    amplitude,
    probability: magnitudeSquared(amplitude),
  }));
}

export function reducedBlochVector(vector, qubitCount, qubit) {
  const mask = qubitMask(qubitCount, qubit);
  let rho00 = 0;
  let rho11 = 0;
  let rho01 = complex();

  for (let basis = 0; basis < vector.length; basis += 1) {
    if ((basis & mask) !== 0) continue;
    const zero = vector[basis];
    const one = vector[basis | mask];
    rho00 += magnitudeSquared(zero);
    rho11 += magnitudeSquared(one);
    rho01 = add(rho01, complex(
      zero.re * one.re + zero.im * one.im,
      zero.im * one.re - zero.re * one.im,
    ));
  }

  const x = 2 * rho01.re;
  const y = -2 * rho01.im;
  const z = rho00 - rho11;
  const length = Math.sqrt(x * x + y * y + z * z);

  return {
    x,
    y,
    z,
    length,
    purity: (1 + length * length) / 2,
  };
}

export function stateNorm(vector) {
  return vector.reduce((total, amplitude) => total + magnitudeSquared(amplitude), 0);
}
