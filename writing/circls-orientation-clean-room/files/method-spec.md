# CircLS orientation-aware layout search — reproduction method v1.4

The normative public specification is the article at
<https://rwill128.github.io/writing/circls-orientation-clean-room/>. This file
duplicates its method for plain-text use.

## Scope

This is a compiler-layout experiment in the released CircLS `full`
configuration. CircLS targets a fault-tolerant surface-code/lattice-surgery
quantum-computer model and emits a physical Stim circuit. CircLS itself and
the verifier run classically. This is not a quantum-algorithm, Shor,
non-Clifford, hardware-execution, or hardware-speedup claim.

The controlled variable is each non-`y*` data patch's birth orientation:
`X_horizontal` or `X_vertical`. Every candidate reruns released optimized
assignment and complete physical compilation.

## Sources and environment

- CircLS commit: `3523afeb0034bf047651a7e98a7e45d3da5df72d`
- QASMBench commit: `357b942396d5c2b7cbc1c229c585a6ef5ccaebac`
- Python: 3.12.12
- Exact Python dependencies: `REQUIREMENTS.lock`
- Exact benchmark constructors and QASM hashes: `BENCHMARKS.json`

Record `numpy.show_config()` because BLAS/LAPACK identity affects CircLS's
spectral assignment start on degenerate interaction graphs.

## Baseline

Call `experiments.ablation.compile_kwargs("full", case)` from pinned CircLS.
The released full configuration enables optimized assignment, measurement
reduction, first-use initialization, step scheduling, parallel steps, and
policy liveness. Preserve CircLS's released `teleport_*` exception, which
disables step scheduling. Use distance three. Do not inject a placement or
orientation.

## Profile A: exhaustive physical ranking

Use Profile A for `teleport_8`, `bv_n14`, `twistedghz_8`, `bv_n19`,
`dj_16`, and `bv_n30`.

The original Profile A runs used 256 noiseless verification shots. For clean
reproduction, set `force_distance=True` on every baseline and candidate even
where CircLS would run the distance check without forcing it.

1. Compile the baseline. Record the complete realized data orientation map,
   placement, V1, T1, Stim-text SHA-256, and verifier report.
2. The current map contains every non-`y*` data patch. Compiler-pinned `y*`
   ancillas are not search coordinates.
3. Construct the complete one-coordinate neighborhood by copying the current
   map and flipping exactly one patch between `X_horizontal` and `X_vertical`.
4. Compile every candidate with released optimized assignment and complete
   physical lowering. Do not reuse the current or author placement. Reject
   compile failures.
5. A candidate is metric-eligible only if V1 is strictly lower than current
   and T1 does not increase.
6. Sort eligible candidates by V1, then T1, then ordinary Python string order
   of the patch name. Thus `q10` sorts before `q2`.
7. Recompile each eligible candidate independently in that order. Require the
   Stim hash, V1, and T1 to equal its screening compilation.
8. Run public CircLS verification with `force_distance=True`. Require silence,
   deterministic observables, graphlike distance equal to three, and logical
   affine equivalence all to run and pass. Reject any skipped field.
9. Accept the first eligible fully verified candidate and make its full
   orientation map current.
10. Repeat until complete physical compilation of the final one-flip
    neighborhood produces no acceptable candidate.

This establishes a verified one-flip local optimum, not a global optimum.

## Profile B: route-ranked continuation

Use Profile B for `bv_holdout_12`, `dj_holdout_12`,
`teleport_holdout_6`, `twistedghz_holdout_6`,
`random_holdout_12_60_303`, and the four `parallel_holdout_*` cases.

The original Profile B verification gates used 1,024 noiseless shots and
`force_distance=True`.

Compile and verify the baseline as in Profile A. Physically compile its complete
one-flip neighborhood. Apply the exact V1/T1 rule, sort by V1, T1, and ordinary
Python patch-name order, then independently recompile and fully verify the first
acceptable candidate. If there is no acceptable candidate, stop at the
baseline.

After that exact first move:

1. Build the released optimized mapping for current and every one-flip map.
2. Run the pure parallel-window route probe. Reconstruct liveness and step
   batching, probe every planned merge window, demote an unroutable parallel
   batch to serial windows, and return `OK` only if every resulting window can
   be routed.
3. Rank `OK` candidates by parallel-window cost (active patch slots plus unique
   corridor cells, summed over predicted windows), route-cell count, then
   ordinary Python patch-name order. Retain those scored below current.
4. In that order, physically compile candidates. For an exact V1/T1-eligible
   result, independently recompile it, require identical hash and metrics, and
   run the complete verifier. Accept the first fully verified candidate.
5. If none is accepted, physically compile every unscreened coordinate. Combine
   all screened results, rank exact eligible candidates by V1, T1, and patch
   name, then independently recompile and verify them in order. Accept the
   first fully verified candidate.
6. Repeat. Stop only when step 5 has physically covered the complete current
   neighborhood and no candidate is acceptable.

In the narrower zero-rotation, equal-latency regime with unchanged liveness,
absence, batch structure, and merge-window count, the observed distance-three
identity is:

`delta V1 = ((rounds + 1) / d) * delta route cells = (4/3) * delta route cells`

Outside that regime the score is a heuristic ranker, not an exact V1
prediction. Profile B nevertheless uses it for ordering whenever the probe
returns `OK`. It does not supply an accepted metric: every accepted move is
physically compiled twice and fully verified. It can change the greedy path and
cannot certify termination; only the exhaustive physical fallback can do that.

## Clean-room reporting

Implement from this prose and public sources. Before seeing any later author
artifact, freeze the implementation, dependency and platform record, BLAS and
LAPACK identity, QASM hashes, source archive, commands, outputs, and hashes.
Report exact endpoint matches, metric-only matches, different positive local
optima, compile failures, verification failures, and skipped checks separately.
Frozen placement replay is not optimizer reproduction.

This companion publishes no author search implementation, generated trace,
frozen placement, final orientation map, custom verifier, or saved reproduction
output.
