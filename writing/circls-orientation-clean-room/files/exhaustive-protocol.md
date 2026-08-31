# Exhaustive small-instance orientation comparator v1

## Purpose

The primary census establishes the endpoint of one deterministic coordinate-
descent algorithm. It does not establish that the endpoint is globally optimal
over birth orientations. This comparator enumerates the complete orientation
space for every census case with at most eight data qubits.

## Frozen roster

Take every case in the immutable primary-census manifest whose declared qubit
count is at most eight. Do not select cases based on whether coordinate descent
improved them. A case whose released baseline cannot pass every forced public
verifier check is reported as ineligible and is not enumerated.

## Enumeration and acceptance

For an eligible case with `n` data patches:

1. Recompile and fully verify the released CircLS `full` baseline.
2. Enumerate all `2^n` complete birth-orientation assignments in lexicographic
   bit order relative to the released realized orientations.
3. Re-optimize placement and compile every assignment through the full physical
   CircLS pipeline. Retain compile failures as outcomes.
4. Among assignments with T1 no greater than the released baseline, rank by
   exact V1, then T1, then bitstring.
5. Independently recompile candidates in rank order. The global endpoint is the
   first assignment whose circuit hash and metrics reproduce exactly and whose
   silence, determinism, forced graphlike distance, and logical-equivalence
   checks all run and pass. If no assignment improves on the verified baseline,
   the baseline is the global endpoint.
6. Compare its V1 with the primary census coordinate-descent endpoint.

The claim is global only over birth orientation while retaining CircLS's own
placement optimization and all other pinned compiler choices. It is not a
global optimum over layouts, schedules, routes, or circuits.
