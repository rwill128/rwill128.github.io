---
layout: post
title: "Cross-layer scheduling for an approximate-residue RSA-2048 factoring circuit"
date: 2026-08-28
description: "A corrected 43.200-day operation-level RSA-2048 schedule using an explicit valid residue system, with a 27.47% same-workload scheduling ablation and unresolved physical assumptions."
version: "1.2"
---

# Cross-layer scheduling for an approximate-residue RSA-2048 factoring circuit

**A corrected methods note and clean-room reproduction target**

> **Correction history — August 28, 2026:** Version 1.0's 25,330-prime set failed the required modulus-deviation condition, so its 42.760-day factoring-instance claim remains permanently withdrawn. Version 1.1 published that erratum. Version 1.2 is a new result built from an explicit 25,341-prime set that passes exact capacity, primality, distinctness, multiplier-coprimality, and 31-bit modular-deviation checks against the actual RSA-2048 challenge modulus. Its corrected operation-model estimate is **43.1996669833 expected days**. This does not establish a physical runtime. The [v1.1 erratum](reproduction-spec-v1.1.json), [v1.2 reproduction specification](reproduction-spec-v1.2.json), and [canonical period list](rns-periods-v1.2.txt) are all retained for audit.

Resource estimates for cryptographically relevant quantum algorithms are long chains of conditional statements. A circuit construction determines logical operations. A compilation model turns them into primitive resources. A scheduler maps those resources onto a processor. A fault-tolerant architecture supplies timing, factories, movement, and failure rates. A striking number at the end is only as strong as every link before it.

This note reports a candidate improvement at one link in that chain: operation-level scheduling. It combines the approximate-residue factoring construction published by Craig Gidney in 2025 with the time-efficient high-rate neutral-atom capacity model published by Cain *et al.* in 2026. The central idea is to keep independent residue lanes closed over their compute, shared-accumulator update, and cleanup stages, allowing local work to overlap the serial accumulator bottleneck.

The replacement workload contains 25,341 explicit residue jobs. Under the same frozen operation model, a phase-separated schedule evaluates to **59.5623495529 expected days** and the closed-lane schedule to **43.1996669833 days**, a **27.4715% reduction**. That is the cleanest result here: same valid workload, same stage durations, same allocation, same retry factor, and only the scheduling policy changes.

Those are operation-schedule results. They are not a demonstrated physical runtime, and they are not a verified improvement over a state-of-the-art routed implementation. The public high-rate architecture does not specify the concrete code blocks, logical operators, mixed parallel-measurement gadgets, placement, movement paths, decoder latency, or factory interfaces needed to route this circuit. Factory and reliability sensitivity can erase the apparent advantage.

The purpose of this corrected note is to expose a valid algorithmic workload and a falsifiable scheduling result while keeping the boundary between operation-model evidence and physical implementation explicit.

## Claim ladder

The work makes three deliberately separate claims.

| Claim | Statement | Status |
|---|---|---|
| C1 | With the valid 25,341-job workload and allocation fixed, closed-lane pipelining reduces the estimate from 59.562 to 43.200 days. | Verified within the frozen operation model; clean-room reproduction requested |
| C2 | The exact-CCZ candidate has a complete 25,341-job operation schedule evaluating to 43.200 expected days for a valid modulus-specific RSA-2048 approximate-residue instance. | Verified internally at the operation-model level; not independently reproduced |
| C3 | The candidate factors RSA-2048 in about 43.200 physical days at a footprint comparable to 102,000 atoms. | Not established |

C2 now has a valid explicit workload, but C3 remains a separate and much harder claim. The null hypothesis for C3 is that routing, block granularity, factory contention, communication, decoding, and whole-run failure costs consume the apparent advantage.

## Published starting points

The algorithmic starting point is [Gidney's approximate-residue construction, arXiv:2505.15917v1](https://arxiv.org/abs/2505.15917v1), using the accompanying [Zenodo source snapshot](https://zenodo.org/records/15347487). The candidate uses the [Ekerå–Håstad short-discrete-logarithm route to factoring, arXiv:1702.00249v1](https://arxiv.org/abs/1702.00249v1), a 1,708-qubit shared exponent register, residue period width 20, a 31-bit shared accumulator, and window parameters

```text
n = 2048
l = 20
s = 3
w1 = 7
w3a = 4
w3b = 4
w4 = 5
len_acc = 31
num_shots = 4
```

The architectural comparison point is the time-efficient model in [Cain *et al.*, arXiv:2603.28627v1](https://arxiv.org/abs/2603.28627v1): 97 days at approximately 102,000 physical qubits, a 1 ms stabilizer-measurement cycle, distance 20, and logical parallelism `P = 1160`. That paper applies carry-lookahead depth as a full-circuit proxy to a different wide-arithmetic construction. Its 97-day point is a preliminary estimate, not a concrete routed reference circuit.

Lookup primitive counts are tied to [Qualtran commit `096a2d009059faee0cfae462c3d59cb055300eb9`](https://github.com/quantumlib/Qualtran/commit/096a2d009059faee0cfae462c3d59cb055300eb9). Factory sensitivity uses the exact in-place quantum carry-lookahead-adder Toffoli expression from [Draper *et al.*, arXiv:quant-ph/0406142v1](https://arxiv.org/abs/quant-ph/0406142v1).

Two assumptions from Gidney's construction remain broader than this result: that suitable low-deviation products can generally be found in the stated expected time, and that superposition masking can be costed by multiplying expected shots by `1 / (1 - S)`. Finding one RSA-2048 set is evidence for the first assumption on this instance, not a complexity proof. The second remains inherited. Version 1.2 includes Gidney's `/ 0.99` post-processing-success factor, which v1.0 omitted.

The original frozen source hashes are recorded in [publication manifest v1.0](publication-manifest-v1.json). The exact withdrawal evidence remains in the [v1.1 machine-readable erratum](reproduction-spec-v1.1.json). The replacement workload and acceptance values are in the [v1.2 specification](reproduction-spec-v1.2.json), and the publication is frozen by [manifest v1.2](publication-manifest-v1.2.json).

## From approximate residues to independent jobs

The approximate-residue construction replaces a single wide modular-arithmetic state with many small modular periods. Each period contributes a residue job. A job performs three stages:

1. **A — precompute:** local lookup and arithmetic on one lane;
2. **B — accumulator:** update the single shared output accumulator;
3. **C — cleanup:** uncompute the lane-local state.

The lane cannot start its next A stage until its previous C stage completes. B is globally serial because every job touches the shared accumulator. Different lanes may nevertheless perform A or C while another lane occupies B.

For exponent window `w1 = 7`, the 1,708 exponent bits require

```text
num_windows1 = ceil(1708 / 7) = 244
```

The exact required residue-product capacity is

```text
L >= N^244
log2(N^244) = 499624.37860603165 bits.
```

Using the modulus bit length gives the conservative surrogate `2048 * 244 = 499712` bits. Version 1.0 enumerated primes in `[2^19, 2^20)`, took them in descending order, and chose the smallest count `J` satisfying that surrogate:

```text
sum(log2(p) for p in selected_primes) >= 499712.
```

That produced 25,330 jobs with 499,714.6416576 bits of capacity, but capacity alone is insufficient. For the actual RSA-2048 challenge modulus `N`, the product `L` must also satisfy

```text
Delta_N(L) = min(L mod N, N - (L mod N)) / N < 2^(-31).
```

Recomputing the exact descending-prime set gives

```text
Delta_N(L)          = 0.3022205464...
achieved gap        = log2(N / min(...)) = 1.7263263496 bits
required gap        = 31 bits
shortfall           = 29.2736736504 bits
factor over limit   = 649,013,681.5
```

The v1.0 set therefore fails decisively. The mistake was to use Gidney's `vacuous_config` for cost extraction and then correct only prime-product capacity. That estimator supplies a synthetic modulus and period count; it does not construct a modulus-specific residue system.

### Version 1.2 residue-system construction

Version 1.2 first enumerates all 38,635 20-bit primes and removes every prime dividing any of the 31,232 required window multipliers `3^(k * 2^(7j)) mod N`. This excludes 1,555 primes and leaves 37,080 admissible candidates. The largest 25,339 admissible primes are the minimum count that can exceed `N^244`; the search uses 25,341 to retain two primes of capacity slack.

Starting from the largest admissible set, independent randomized one-for-one swaps exchange a selected and unselected prime while rejecting any swap that drops exact product capacity below `N^244`. The product residue is updated modulo `N`, and a set is accepted when its centered residue is below `N >> 31`. The successful run tested 433,783,476 accepted sets in 131.5 seconds across 11 workers. Search provenance is not an acceptance criterion: the explicit output is.

The canonical [25,341-prime list](rns-periods-v1.2.txt) has SHA-256

```text
deb506e83c8a80c3036de9ad4d2e80286a2fd043fa03bdbb2401c70dd90afa06
```

and verifies as follows:

```text
available 20-bit primes             38,635
admissible after multiplier filter  37,080
selected periods                    25,341
exact capacity                      499624.38099527627 bits
exact target                        499624.37860603165 bits
capacity margin                     0.00238924462 bits
achieved modular gap                35.3796566279 bits
required modular gap                31 bits
centered residue / limit            1 / 20.8165146132
required multipliers checked        31,232
```

Two implementations checked the set. A standalone C++/GMP verifier performs exact integer product, primality, deviation, and multiplier-GCD tests. Separately, the set passes the frozen author's `_verify_rns_solution` assertions in `src/facto/algorithm/prep/_precompute_rns.py`. The author's final verifier does not repeat multiplier filtering, which is why the independent GCD test remains a separate required gate.

The modulus-specific lookup arrays are deterministically derived rather than published as a 4.52 GB binary bundle. Using the frozen Zenodo source, construct the stated `ProblemConfig`, use the published periods in their listed order, and call `precompute_generators`, `find_multipliers_for_conf`, `precompute_table1`, `precompute_table3`, and `precompute_table4`. The expected native-array shapes are recorded in the v1.2 specification. Implementations may stream or regenerate these arrays; they must not substitute a size-only `vacuous_config` for functional execution.

## Exact blocked lookup

The lookup model begins with a clean blocked QROM. For a block size `B`, the high address bits select one block and the low address bits route one of its words to position zero.

The routing tree uses `B - 1` word Fredkins. For word width `w`, each word Fredkin is decomposed into `w` exact Fredkins, and each bit Fredkin uses one Toffoli or CCZ plus two CNOTs. The exact router therefore contributes

```text
router CCZ/Toffoli = w * (B - 1)
router CNOT        = 2 * w * (B - 1).
```

At tree level `k`, the available gate count is

```text
gates(k) = w * (B >> (k + 1)).
```

With parallel capacity `P_stage`, exact router magic depth is

```text
sum(ceil(gates(k) / P_stage) for each tree level k).
```

This matters because multiplying the largest level by the number of levels overcounts magic depth. Re-extracting it level by level reduced the router component by 25% relative to the scheduler's frozen proxy. The 43.200-day replacement schedule retains the larger proxy rather than claiming the uncompiled reduction.

After adding the routed word into the target, all lookup words are measured in the X basis. For measurement masks `m_i` and routed words `v_i(a)`, the branch phase is

```text
phase(a, m) = XOR_i parity(m_i AND v_i(a)).
```

A deferred address-indexed phase lookup evaluates the same Boolean function and cancels it. The functional obligation is therefore:

```text
target' = target + table[address] mod 2^w
corrected_phase = phase XOR phase = 0.
```

An independent implementation should test this identity exhaustively on small instances, including every address, target, and measurement outcome, before using the resource formula at RSA-sized widths.

## Rebuilding the lookup and stage frontiers

The stage profiles should be regenerated rather than copied from the result table. Construct Gidney's released `CostConfig` from the frozen candidate parameters and inspect `estimated_subroutine_costs_per_call`. Within each stage, interpret source operations as follows:

- `__iadd__` and `phase_flip_if_cmp` contribute carry-lookahead work at the operation width;
- `init_lookup` with `N > 2` contributes blocked-QROM selection and routing work;
- `phaseflip_by_lookup` with `N > 4` contributes the specialized square-root phase proxy;
- `CX`, `CZ`, and smaller Clifford-only lookups contribute no non-Clifford clock depth here;
- any other source operation is an error rather than an implicitly free operation.

Build a finite Qualtran lookup table for table sizes `8, 16, 32, 64, 128, 256`, word widths 18 through 40 inclusive, and every power-of-two block size from 1 through the table size. This is 897 rows. For every row, extract:

```text
table_size
word_width
block_size
QROAMClean compute gate and qubit counts
QROAMClean measurement-uncompute gate and qubit counts
uncompute block size
clean SelectSwapQROM gate and qubit counts
dirty SelectSwapQROM gate and qubit counts
incremental QROAM qubits relative to block size 1
```

For the frozen exact-CCZ router proxy, let

```text
levels        = log2(B)
widest_gates  = w * B / 2
batches       = ceil(widest_gates / P_stage)
selection     = ceil(N / B)
magic_layers  = levels * batches
magic_gates   = w * (B - 1)
cat_width     = min(P_stage, widest_gates)
cat_ancillas  = max(0, cat_width - 1)
cat_cycles    = 2 * levels * ceil(log2(cat_width)).
```

This is the conservative frozen scheduler proxy. The level-by-level formula in the previous section is the later audit, not a replacement input for the reported schedule.

The carry-lookahead proxy for an operation of width `u` is

```text
carry_layers  = 4 * log2(u) * ceil(u / P_stage)
carry_scratch = max(0, u - 2 * ceil(log2(u))).
```

For a phase-lookup table of size `N`, set `q = log2(N)` and `h = floor(q / 2)`. The specialized phase-layer proxy is

```text
uncorrected_ands = ((2 + (q mod 2)) * 2^h) - q - 2
multi_target_czs = max(0, 2^h + q - 3)
phase_layers     = uncorrected_ands + multi_target_czs.
```

For each lookup signature and each possible peak-scratch cap, select the fitting block size with minimum `selection + magic_layers`. A stage's extra lookup logicals are the maximum, not the sum, across sequential lookup signatures. Add the cat ancillas to Qualtran's incremental QROAM qubits. Stage scratch is the maximum of peak lookup scratch and carry scratch.

Discard any profile dominated in both scratch and rounds. Construct lane profiles from every nondominated pre/post pair. Their shared scratch is the maximum of the two stages; choose the fastest terminal profile fitting that same scratch. This produces the finite stage frontiers used by the outer stream and residue-width search.

## Stage-duration model

For each stage profile, operation categories are converted into surgery rounds as follows:

```text
rounds = 3 * carry_lookahead_layers
       + 4 * lookup_select_layers
       + 3 * lookup_router_magic_layers
       + 4 * specialized_phase_proxy_layers
       + lookup_router_clifford_cycles / (40 / 3).
```

This conversion is part of the frozen architecture model. It is not a measurement of a routed qLDPC circuit.

The selected candidate uses 30 residue lanes. It reserves 32 units of parallelism for the shared accumulator, leaving

```text
lane_parallelism = floor((1160 - 32) / 30) = 37.
```

The selected blocked-lookup assignments and resulting stage durations are:

| Stage | Source loops | Lookup assignments | Duration in surgery rounds |
|---|---|---|---:|
| A — precompute | `loop1 + loop2 + loop3` | `N128_w31 = 4`, `N256_w21 = 4` | 56,220.92488496 |
| B — accumulator | `loop4` | `N32_w31 = 4`, `N32_w32 = 4` | 1,045.70213435 |
| C — cleanup | `unloop3 + unloop2` | `N256_w20 = 4`, `N256_w21 = 4` | 22,618.54933841 |
| Terminal reset | `loop1` | `N128_w31 = 4` | 49,105.08679681 |

The durations are reported results. A clean reproduction should regenerate them from the frozen Gidney and Qualtran sources and report any disagreement before scheduling.

## Processor allocation

For a candidate with `S` streams, 20-bit residues use `2 * 20 + 42 = 82` private logicals per lane. Exponent-control fanout costs `w1 * (S - 1)` logicals. At `S = 30`, the fixed payload is

```text
payload = 1708 + 31 + 7 * (30 - 1) + 30 * 82
        = 4402 logicals.
```

The source architecture's processor capacity is 8,216 logicals, leaving 3,814 for simultaneous stage scratch. The selected profiles require 3,810, leaving four logicals of modeled slack.

The parallel CCZ reservation is

```text
30 * 37 + 32 = 1142 <= 1160.
```

These are static capacity checks. They do not establish a physical placement or collision-free route.

## Closed-lane scheduling algorithm

Distribute the 25,341 jobs as evenly as possible across 30 lanes. Twenty-one lanes receive 845 jobs and nine receive 844. The scheduling policy is deterministic, closed-lane, and first-ready-first-served at the accumulator.

```text
fanout = 183 surgery rounds
accumulator_available = fanout

for each lane:
    ready.push(fanout + A_duration, lane, lane_job=0)

while ready is not empty:
    pre_end, lane, lane_job = ready.pop_min()

    B_start = max(pre_end, accumulator_available)
    B_end   = B_start + B_duration
    C_end   = B_end + C_duration

    emit A, B, and C intervals for this job
    accumulator_available = B_end

    if lane has another job:
        ready.push(C_end + A_duration, lane, lane_job + 1)
    else:
        emit terminal reset [C_end, C_end + terminal_duration]
```

Ties are ordered by lane index. Every job must appear exactly once; every B must begin after its A; every C must begin at B completion; a lane's next A must begin at its previous C completion; B intervals must never overlap; and every lane must end with one terminal reset.

The maximum terminal-reset end time, excluding the one-time fanout, is

```text
M = 67,572,993.15175445 surgery rounds per attempt.
```

## Attempts and runtime conversion

The residue approximation introduces a retry multiplier. Let `A_add` be the number of accumulator additions and `L = 31` the accumulator length. For mask width `m`, use

```text
deviation       = A_add * 3 * 2^(-L)
mask_proportion = 2^(m - L)
failure(m)      = mask_proportion + deviation / mask_proportion.
```

Choose `m` in `[0, L]` minimizing `failure(m)`, then compute

```text
expected_attempt_multiplier = 4 / (1 - failure) / 0.99.
```

The `/ 0.99` term is Gidney's allowance for post-processing failure. Version 1.0 omitted it. The valid 25,341-job workload has 101,364 accumulator additions, `m = 25`, failure `0.0246876478`, a pre-postprocessing multiplier of `4.1012502211`, and a corrected multiplier of `4.1426769910`.

At code distance 20 and a 1 ms measurement cycle, one surgery round corresponds to `(2d/3)` measurement cycles. Expected operation-level days are

```text
days = (M + fanout)
     * expected_attempt_multiplier
     * (2 * 20 / 3)
     * 0.001
     / 86400
     = 43.1996669833.
```

The full trace contains 25,341 job records, 30 terminal resets, and one header. A separately implemented verifier checks job uniqueness, balanced lane assignment, all A/B/C dependencies, lane closure, single-accumulator serialization, stage durations, operation-category sums, terminal resets, fanout, makespan, runtime conversion, processor occupancy, explicit period-list hash, exact capacity, modular deviation, and the separately compiled multiplier-coprimality certificate. It reports 1,142/1,160 CCZ width and 8,212/8,216 logical occupancy.

## The same-workload scheduling ablation

The 27.4715% result holds the valid modulus-specific workload, stage durations, retry multiplier, and processor allocation fixed.

The phase-separated control completes all lane-local A/C batches, then all B services, then the terminal reset:

```text
fanout
+ ceil(jobs / lanes) * (A + C)
+ jobs * B
+ terminal.
```

The closed-lane schedule instead overlaps A and C work with B service while respecting the same lane and accumulator constraints. The phase-separated control evaluates to **59.5623495529 days** and the closed-lane schedule to **43.1996669833 days**, a **27.4715196637% reduction**.

This is a comparison against our own same-allocation control, not against a published implementation. It establishes that scheduling, rather than a different circuit or a larger machine, accounts for that particular reduction.

## Factory and reliability sensitivity

The 43.200-day value assumes operation resources are available when scheduled. To bound magic-state demand, the exact in-place QCLA Toffoli count used here is

```text
T(n) = 10n
     - 3 popcount(n)
     - 3 popcount(n - 1)
     - 3 floor(log2(n))
     - 3 floor(log2(n - 1))
     - 7.
```

Applying that expression to every modeled add and comparison produces 13.500 billion expected CCZ states. For `P = 1160`, a central 240-cycle batch model has 1.336× average throughput headroom. Perfect overlap retains 43.200 raw days. Fully serializing factory production gives 75.528 raw days, or 83.920 days per success at an imposed 90% whole-run survival target.

The conclusion is fragile:

| Sensitivity | Raw days | Days per success or implication |
|---|---:|---:|
| 240-cycle batches, perfect overlap | 43.200 | Operation-level lower envelope |
| 240-cycle batches, fully serialized | 75.528 | 83.920 at 90% survival |
| 360-cycle batches, fully serialized | 91.692 | 101.880 at 90% survival |
| 240-cycle serialized at nominal 0.1% physical error | 75.528 | 311–332, depending on block-hazard proxy |

Within the independent-error proxy, physical error must be approximately 0.0664% or lower to reach 90% survival. Correlated surgery, movement faults, burst contention, and decoder effects are not represented. The sensitivity analysis is a decision boundary, not a physical error proof.

## Why the physical claim remains open

The public time-efficient architecture supports a coarse capacity transfer: 1,142 is below `P = 1160`, and 8,212 is below the modeled 8,216 logical processor capacity. But an explicit route requires information the public v1 paper does not supply:

- parity-check matrices and logical-operator representatives for the proposed distance-20, 30%-rate code blocks;
- a mapping from the 8,212 live logicals to concrete blocks and physical supports;
- a high-rate surgery gadget for the mixed parallel-Pauli-measurement pattern;
- operation-zone coordinates, movement paths, collision constraints, and stabilizer timing;
- a concrete `P = 1160` factory layout and refill interface;
- decoder, feed-forward, and classical-bandwidth latency.

The modeled fit is also only four logical qubits. Public `P = 1160` throughput does not establish that this circuit's particular 1,142-operation pattern is simultaneously routable, and even small code-block rounding, surgery workspace, or routing buffers can exceed that four-qubit margin.

Consequently, the strongest defensible conclusion is:

> Closed-lane pipelining shortens the valid modulus-specific operation schedule under the stated model. Whether that operation-model effect becomes a physical speedup depends on unresolved architectural and reliability assumptions.

## Clean-room reproduction protocol

**Version 1.2 defines a new positive clean-room target; it does not reactivate v1.0.** The permitted input envelope is exactly this article, `reproduction-spec-v1.2.json`, `rns-periods-v1.2.txt`, the publication manifest and figure, plus the externally cited papers and frozen source archives. The public package does **not** contain or link to our scheduler implementation, search implementation, generated schedule trace, verifier implementation, resource certificate, factory-composition implementation, or saved result artifacts.

The explicit period list is a workload input, analogous to publishing a benchmark instance. The reproducer must validate it before using it. It is not expected to rediscover the same random walk, but independently finding a different valid set and rebuilding the downstream schedule would be stronger evidence.

Before implementation, the reproducer should record:

1. source hashes and environment;
2. its interpretation of every timing rule;
3. included and excluded costs;
4. tests and pass thresholds;
5. any ambiguity that could materially affect the result.

It should then independently construct or regenerate:

- validation that every published period is a distinct 20-bit prime, the exact product exceeds `N^244`, the centered residue is below `N >> 31`, and no period divides a required multiplier;
- the modulus-specific generators and lookup arrays from the frozen author source and published period order;
- small-instance exact blocked-lookup witnesses;
- primitive lookup counts from the frozen Qualtran revision;
- stage durations from the frozen source models;
- a full schedule and a separately implemented verifier;
- the same-allocation phase-separated control;
- factory and reliability sensitivity.

Acceptance requires agreement on the validity gates and schedule constraints, not byte-for-byte agreement with an unpublished implementation. A different feasible schedule under the same valid workload may be stronger evidence. Failure to reproduce, ambiguity, or a result that is slower than the reported value is a publishable outcome, not a failed assignment.

The reproducer must keep C2 and C3 separate. Reproducing 43.200 operation-model days does not establish atom count, routing, factory feasibility, decoder performance, logical survival, or wall-clock runtime.

## Frozen sources and direct links

| Source | Paper or record | Exact source material | Frozen digest |
|---|---|---|---|
| Gidney 2025 approximate residues | [arXiv:2505.15917v1](https://arxiv.org/abs/2505.15917v1); [Zenodo record 15347487](https://zenodo.org/records/15347487) | [download paper source](https://arxiv.org/src/2505.15917v1); [download `code.zip`](https://zenodo.org/api/records/15347487/files/code.zip/content) | Code MD5 `80544b9dfbfe3612cb3727518160c588`; code SHA-256 `e627abdeb91e880ec8500a3015ab59eb09c3171e1c8f8d9c5eab96728064c94d` |
| Ekerå–Håstad factoring reduction | [arXiv:1702.00249v1](https://arxiv.org/abs/1702.00249v1) | [download v1 source](https://arxiv.org/src/1702.00249v1) | Algorithmic reference; no local archive digest was used |
| Qualtran | [repository](https://github.com/quantumlib/Qualtran); [exact commit](https://github.com/quantumlib/Qualtran/commit/096a2d009059faee0cfae462c3d59cb055300eb9) | [download commit archive](https://github.com/quantumlib/Qualtran/archive/096a2d009059faee0cfae462c3d59cb055300eb9.zip) | Archive SHA-256 `9acab01aa39cb50b6d000e7cb85f368a1e22607baf256f64a9788d78f3bc67df` |
| Cain *et al.* neutral-atom architecture | [arXiv:2603.28627v1](https://arxiv.org/abs/2603.28627v1) | [download v1 source](https://arxiv.org/src/2603.28627v1) | Source SHA-256 `24728ea4b54e03407440a5c094d170708a3102dc0166006525c84c48645c1953` |
| Draper *et al.* QCLA | [arXiv:quant-ph/0406142v1](https://arxiv.org/abs/quant-ph/0406142v1) | [download v1 source](https://arxiv.org/src/quant-ph/0406142v1) | Source SHA-256 `4b09a9526eebea36140738d706ba9b90ce0db0d184cee6dc221b5961b7f75549` |

## Scope and status

This is an open technical methods note, not a peer-reviewed result. The current implementation passes 121 tests and 32 subtests. The explicit RNS additionally passes a standalone GMP verifier, the frozen author's exact RNS assertions, and the separately implemented full-trace verifier. These checks establish internal consistency at the algorithmic-workload and operation-schedule layers; they do not establish a physical implementation.

Version 1.1 preserves the v1.0 artifacts and explicitly withdraws its C2. Version 1.2 supplies a new explicit valid workload and corrected operation schedule. No physical factoring runtime is claimed.

### Change log

- **v1.0 — August 28, 2026:** published the operation model and 42.760-day candidate.
- **v1.1 — August 28, 2026:** withdrew C2 after the selected prime set failed the required 31-bit modulus-deviation bound; suspended positive clean-room reproduction; recorded the missing `/ 0.99` post-processing factor and inherited assumptions.
- **v1.2 — August 28, 2026:** published a separately validated 25,341-prime modulus-specific workload; reported a corrected 43.200-day operation-model schedule and 27.47% same-workload scheduling ablation; reopened clean-room reproduction while retaining the physical-runtime caveats.

The historical v1.0 article/specification/figure digests remain in `publication-manifest-v1.json`; the withdrawal is frozen by `publication-manifest-v1.1.json`; the replacement article, specification, period list, and retained history are recorded in `publication-manifest-v1.2.json`.
