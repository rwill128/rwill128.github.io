# CircLS birth-orientation census protocol v1

## Research question

Across a roster selected without using orientation-search outcomes, how often
does deterministic coordinate descent over data-patch birth orientation reduce
CircLS's realized physical-circuit V1 occupied-spacetime metric without
increasing T1 latency?

The experiment concerns CircLS physical compilation. It does not modify the
logical quantum algorithm and does not measure quantum hardware.

## Frozen primary corpus

The initial census contains every available CircLS benchmark with 2 through 32
logical qubits, inclusive, except only a TopoLS-derived case whose separate
source checkout is absent. No case is included or excluded based on whether a
prior experiment found an improvement. The immutable manifest records the full
case roster, QASM hashes, source revisions, configuration, and implementation
hashes before the first census result is produced.

Larger non-oversize cases form a later scaling extension. They are not silently
pooled into the primary corpus.

## Baseline

Each case starts from the released CircLS `full` configuration at commit
`3523afeb0034bf047651a7e98a7e45d3da5df72d`. This includes optimized placement,
measurement reduction, liveness-based allocation, scheduling, routing,
physical Stim lowering, and CircLS's public verifier. The baseline is not a
weakened control constructed for this experiment.

## One search algorithm

For every case:

1. Compile the unmodified released baseline and require every public verifier
   check to run and pass, with graphlike-distance verification forced above the
   default detector cap.
2. Take the realized orientations of every data patch as the current state.
3. Flip each data-patch orientation once, independently, re-optimize placement,
   and compile every resulting candidate through the complete physical CircLS
   pipeline.
4. A candidate is metric-eligible only if its exact V1 is strictly lower than
   the current state and its exact T1 is no larger.
5. Rank eligible candidates by V1, then T1, then coordinate name.
6. Independently recompile candidates in that order. Accept the first only if
   its circuit hash and metrics reproduce exactly and every public verifier
   check runs and passes.
7. Repeat from the accepted state. Terminate only after a complete one-flip
   neighborhood yields no accepted improvement.

This is deterministic steepest coordinate descent from the released baseline.
It establishes a one-flip local optimum, not a global optimum. The route proxy
is not used anywhere in the census.

## Required reporting

Every roster member is reported as improved, zero-gain, failed, baseline-not-
fully-verified, or non-converged. The primary aggregate includes zeros and
excludes only cases that could not enter the verified comparison; those cases
remain visible separately.

For each case report:

- baseline and final V1 occupied spacetime;
- baseline and final T1 rounds;
- V2 physical qubit-rounds;
- peak allocated tiles;
- rectangular bounding-box volume;
- physical patch rotations;
- accepted moves, physical compilations, verification calls, failures, hashes,
  and wall time.

The aggregate reports the improvement rate, the unweighted mean and median V1
change over all eligible cases (including zeros), an aggregate V1-weighted
change, and the number of apparent V1 wins that enlarge the bounding box.

## Interpretation boundary

The primary claim can concern only this pinned CircLS backend, its Clifford
benchmark suite, and its modeled physical circuits. A positive census does not
by itself establish novelty over orientation-aware layout work such as O3LS,
nor applicability to non-Clifford workloads, magic-state factories, or real
hardware. Those require separate comparisons and experiments.
