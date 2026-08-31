# Birth-orientation optimization in CircLS: research status after the complete census

## Current claim

Birth orientation is a consequential input to CircLS's physical mapper on a
substantial minority of its verified 2–32-qubit benchmarks. A single,
deterministic, verifier-gated coordinate-descent algorithm reduced CircLS's V1
occupied-spacetime metric on 10 of 26 eligible cases without increasing T1.

This is a compiler result for modeled fault-tolerant circuits. It is not a new
quantum algorithm, a hardware experiment, or a result about Shor's algorithm.

## Frozen primary census

The v1 roster was frozen before execution and included every available CircLS
case from 2 through 32 qubits. Five of 31 roster cases could not enter the
comparison because the released baseline did not complete every required
public verifier check. All five remain reported as ineligible.

Among the 26 eligible cases:

- 10 improved and 16 had zero gain;
- the improvement rate was 38.46%;
- mean V1 reduction including zeros was 1.67%;
- median V1 reduction including zeros was 0%;
- aggregate V1-weighted reduction was 1.62%;
- all accepted endpoints retained the baseline T1;
- three V1 winners enlarged the rectangular bounding box.

The 14 cases with T1 greater than two form an exploratory, post-census
nontrivial subgroup, not a separately predeclared primary endpoint. Ten of
those 14 improved, with a 3.10% mean, 1.01% median, and 1.65% aggregate
V1-weighted reduction.

| Case | Baseline V1 | Final V1 | V1 reduction | T1 | V2 qubit-rounds | Peak tiles | Bounding-box volume |
|---|---:|---:|---:|---:|---:|---:|---:|
| `twistedghz_4` | 35.667 | 30.333 | 14.95% | 18 → 18 | 1,781 → 1,466 | 8 → 6 | 108 → 90 |
| `twistedghz_8` | 103.667 | 93.000 | 10.29% | 34 → 34 | 5,023 → 4,372 | 12 → 10 | 453.333 → 555.333 |
| `teleport_4` | 113.667 | 108.333 | 4.69% | 48 → 48 | 6,280 → 5,965 | 12 → 11 | unchanged |
| `bv_n14` | 232.333 | 229.667 | 1.15% | 76 → 76 | 11,898 → 11,737 | 31 → 29 | unchanged |
| `dj_16` | 292.667 | 287.333 | 1.82% | 87 → 87 | 14,914 → 14,592 | 37 → 33 | unchanged |
| `teleport_8` | 220.333 | 208.333 | 5.45% | 92 → 92 | 12,105 → 11,377 | 12 → 11 | 2,453.333 → 3,373.333 |
| `bv_n19` | 388.667 | 378.000 | 2.74% | 104 → 104 | 19,523 → 18,907 | 48 → 42 | unchanged |
| `bv_n30` | 767.333 | 760.667 | 0.87% | 104 → 104 | 35,561 → 35,162 | 57 → 54 | unchanged |
| `bv_32` | 785.333 | 781.333 | 0.51% | 93 → 93 | 35,952 → 35,707 | 54 → 53 | unchanged |
| `dj_32` | 927.333 | 919.333 | 0.86% | 175 → 175 | 44,913 → 44,437 | 78 → 74 | 7,058.333 → 7,700 |

The three bounding-box regressions make the interpretation metric-specific:
they save occupied spacetime and physical qubit-rounds but may require a larger
rectangular chip reservation.

## Exhaustive small-instance comparator

Every orientation assignment was compiled for every census case with at most
eight qubits whose released baseline passed the complete verifier. This covered
1,116 physical assignments across 11 eligible cases; all assignments compiled.
The global endpoint for every improving case was independently recompiled and
fully verified.

Strict coordinate descent reached the global V1 optimum in 9 of 11 eligible
cases. It missed two:

| Case | Released/greedy V1 | Global orientation V1 | Global reduction | Required interaction |
|---|---:|---:|---:|---|
| `bv_8` | 73.667 | 72.333 | 1.81% | two individually neutral flips |
| `dj_8` | 93.333 | 92.000 | 1.43% | two individually neutral flips |

In both cases each constituent single flip leaves V1 unchanged, while the pair
lowers it. The greedy rule rejects the neutral first step and therefore cannot
reach the better assignment. This is direct evidence for a plateau-aware or
multi-coordinate optimizer.

An offline policy simulation over the frozen, already compiled exhaustive
landscapes compared deterministic steepest descent with Hamming-radius-one and
Hamming-radius-two neighborhoods. Radius one reproduced the 9/11 result.
Radius two reached the global V1 optimum in all 11 eligible cases while
consulting 295 unique compiled states, versus 1,116 assignments in the full
enumeration. This is a search-policy result over the small frozen landscapes,
not yet a scaling result or a new set of physical compilations. The analysis is
saved as
`results/circls_orientation_exhaustive_small_v1/neighborhood_policy_analysis.json`.

## Evidence and integrity

- Primary manifest SHA-256:
  `56f02dc76c4c36dd9d207b5dda6509a8aad528ed9ee8c6b7cff576651ac91a5f`.
- Exhaustive-comparator manifest SHA-256:
  `dbf61727e5a325135eb8a2a600351f8a0e30db3ee2de87e90941b0b3da9d001e`.
- Primary census: 854 complete candidate compilations and 58 full verifier
  calls over 3,862 case-seconds.
- Every accepted move reproduced its circuit hash and exact V1/T1 metrics on
  independent recompilation and passed silence, determinism, forced graphlike
  distance, and logical equivalence.
- The pinned CircLS checkout remained clean at
  `3523afeb0034bf047651a7e98a7e45d3da5df72d`.

## Publication assessment

The complete census is materially stronger than the previous selected-positive
evidence. It establishes a denominator, two independent benchmark sources plus
custom families, exact zeros, ineligible cases, secondary-metric regressions,
and small-instance global-optimality comparisons.

It still does not establish a full-paper contribution. [O3LS](https://arxiv.org/abs/2604.15099)
already studies orientation-sensitive automatic lattice-surgery layout search,
and [Harvest](https://arxiv.org/abs/2608.03315) already co-optimizes placement,
routing, scheduling, and resource supply. The current method remains a simple,
expensive CircLS-specific outer search over an existing API hook.

The strongest next research question is now:

> Can a deterministic joint-orientation search retain the small-instance
> quality of radius-two descent while avoiding its quadratic number of full
> physical compilations at larger scales?

A publishable next version should predeclare and evaluate a plateau-aware or
bounded beam-search algorithm, compare it with released CircLS, strict greedy
descent, random orientation sampling, and exhaustive optima where tractable,
then test a separately frozen random-circuit panel and larger scale extension.
An O3LS comparison must use an actual runnable implementation or a carefully
matched reimplementation; CircLS's local `o3ls_composition.py` evaluates an
error-composition formula and is not a competing layout optimizer.

## Artifacts

- Primary protocol: `CIRCLS_ORIENTATION_CENSUS_PROTOCOL.md`
- Primary runner: `run_circls_orientation_census.py`
- Primary results: `results/circls_orientation_census_v1/`
- Exhaustive protocol: `CIRCLS_ORIENTATION_EXHAUSTIVE_PROTOCOL.md`
- Exhaustive runner: `run_circls_orientation_exhaustive_small.py`
- Exhaustive results: `results/circls_orientation_exhaustive_small_v1/`
- Neighborhood-policy analysis: `analyze_circls_orientation_neighborhoods.py`
