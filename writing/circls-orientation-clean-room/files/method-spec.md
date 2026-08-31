# Method specification

## Scope

The study tests a compiler transformation in the released `full` configuration of [CircLS](https://arxiv.org/abs/2608.23819), a Clifford-only lattice-surgery compiler. It is not a Shor optimization, a Clifford+T result, a hardware execution, or a hardware-runtime claim.

The controlled variable is each data patch's birth orientation (`X_horizontal` or `X_vertical`). CircLS already exposes the orientation input; the tested contribution is to search it using the realized physical compilation as the objective and the unchanged public verifier as an acceptance gate.

## Exact coordinate-search rule

For one circuit:

1. Compile the circuit with CircLS's released `full` configuration. Record the realized data-patch orientations, V1 occupied spacetime, T1 rounds, complete Stim-circuit hash, and public verifier report.
2. For every data-patch coordinate, flip only that coordinate in the current orientation map.
3. Re-run optimized placement and the complete physical compilation.
4. Reject compile failures. A candidate is metric-eligible only if V1 is strictly lower and T1 does not increase.
5. Recompile a metric-eligible candidate independently. Require the hash and metrics to match and require silence, determinism, forced graphlike distance, and affine logical equivalence all to run and pass with no skipped field.
6. Accept the eligible candidate with the lowest V1, breaking ties by T1 and then coordinate name.
7. Repeat until a complete single-flip neighborhood contains no acceptable move.

The endpoint is a verified single-flip local optimum, not a global optimum. The two-stage implementation may postpone the expensive verifier until after exact V1/T1 screening, but it does not approximate the objective.

## Guarded route-proxy rule

CircLS's pure route probe can rank orientation flips cheaply when the baseline and candidate preserve the same liveness, absence, batch structure, merge-window count, latency, and zero-rotation regime. At distance three the observed source-derived identity is:

`delta V1 = ((rounds + 1) / d) * delta route cells = (4/3) * delta route cells`.

The proxy is only a ranker. Every accepted move still requires full physical compilation, deterministic recompilation, exact V1/T1 improvement, and the unchanged four-part verifier. Guard failures receive no prediction. The validated boundary excludes rotations, latency changes, walls, batch demotions or restructuring, and general hardware cost.

## Benchmarks and selection labels

Benchmark constructors are those in the pinned CircLS `experiments/benchsuite.py`; QASMBench programs come from the separately pinned [QASMBench repository](https://github.com/pnnl/QASMBench). Random-Clifford cases use the pinned `random_clifford(n, depth, seed)` constructor. Each result retains its actual selection label. The fifteen positive rows are not fifteen fresh held-out experiments and must not be pooled as such.

## Correctness fixes kept separate from performance

The fallback-bus patch persists the bus under which a repair probe succeeded before registration replays the repair. Its seed-392 `q6` result rescues a hard compiler failure but is not an orientation-performance win.

The symbolic-reporting patch uses the already-existing symbolic record tracker for normal `CompiledProgram` objects. On random-Clifford seed 74 it restores deterministic parity `out[3] XOR out[6] = 1`; the physical circuit hash and metrics remain unchanged. This is a reporting/verifier fix, not a compiler optimization.

## Required claim boundaries

- Report V1 reductions as compiler-model occupied-spacetime reductions.
- Do not translate them into physical hardware speedups.
- Report T1 separately; it is unchanged in all fifteen positive rows.
- Four positive rows expand the rectangular bounding box, so they are not unqualified footprint wins.
- CircLS is Clifford-only; no claim extends to magic-state factories, non-Clifford workloads, or Shor.
- Novelty is not established until systematic related-work and domain-expert review are complete.

## Numerical-platform reproducibility boundary

The released optimized assignment portfolio uses numerical spectral/QAP starts. A clean Linux-arm64 rerun of the optimizer reproduced fourteen of the fifteen V1/T1 effects. `bv_n19` retained the same V1/T1 improvement and exact final hash but used a different released-baseline circuit. `random_holdout_12_60_303` selected a different optimized layout and the reported orientation ceased to be an improvement. Frozen placement plus orientation reproduced the physical endpoints exactly. Therefore report fifteen original-environment results, fourteen cross-platform optimizer effects, and thirteen exact optimized replays; do not call all fifteen platform-independent.
