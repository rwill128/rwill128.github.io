---
layout: post
title: "Cross-layer scheduling for an approximate-residue RSA-2048 factoring circuit"
date: 2026-08-28
description: "A reproducible operation-level scheduling candidate, its 42.760-day model result, and the physical assumptions that remain unverified."
version: "1.0"
---

# Cross-layer scheduling for an approximate-residue RSA-2048 factoring circuit

**A methods note and open reproduction challenge**

Resource estimates for cryptographically relevant quantum algorithms are long chains of conditional statements. A circuit construction determines logical operations. A compilation model turns them into primitive resources. A scheduler maps those resources onto a processor. A fault-tolerant architecture supplies timing, factories, movement, and failure rates. A striking number at the end is only as strong as every link before it.

This note reports a candidate improvement at one link in that chain: operation-level scheduling. It combines the approximate-residue factoring construction published by Craig Gidney in 2025 with the time-efficient high-rate neutral-atom capacity model published by Cain *et al.* in 2026. The central idea is to keep independent residue lanes closed over their compute, shared-accumulator update, and cleanup stages, allowing local work to overlap the serial accumulator bottleneck.

Under the model specified below, a full 25,330-job schedule evaluates to **42.7602176638 expected days**. A simpler same-allocation ablation falls from **94.1304296981 to 55.3889675300 days**, a **41.157% reduction**, when closed-lane pipelining replaces a phase-separated schedule.

Those are operation-schedule results. They are not a demonstrated physical runtime, and they are not a verified improvement over a state-of-the-art routed implementation. The public high-rate architecture does not specify the concrete code blocks, logical operators, mixed parallel-measurement gadgets, placement, movement paths, decoder latency, or factory interfaces needed to route this circuit. Factory and reliability sensitivity can erase the apparent advantage.

The purpose of publishing this note is therefore not to announce a 42.76-day factorization machine. It is to make the narrower result independently reproducible—and falsifiable—from a clean implementation.

## Claim ladder

The work makes three deliberately separate claims.

| Claim | Statement | Status |
|---|---|---|
| C1 | With the cycle-12 circuit and allocation fixed, closed-lane accumulator pipelining reduces the pre-fanout estimate from 94.130 to 55.389 days. | Verified within the operation model |
| C2 | The corrected exact-CCZ residue candidate has a feasible 25,330-job operation schedule evaluating to 42.760 days. | Reproduced by a complete trace and separate verifier |
| C3 | The candidate factors RSA-2048 in about 42.760 physical days at a footprint comparable to 102,000 atoms. | Not established |

The null hypothesis for C3 is that routing, factory contention, communication, decoding, and whole-run failure costs consume the apparent advantage.

## Published starting points

The algorithmic starting point is [Gidney's approximate-residue construction](https://arxiv.org/abs/2505.15917), using the accompanying [Zenodo source snapshot](https://doi.org/10.5281/zenodo.15347487). The candidate uses the [Ekerå–Håstad short-discrete-logarithm route to factoring](https://arxiv.org/abs/1702.00249), a 1,708-qubit shared exponent register, residue period width 20, a 31-bit shared accumulator, and window parameters

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

The architectural comparison point is the time-efficient model in [Cain *et al.*, arXiv:2603.28627v1](https://arxiv.org/abs/2603.28627): 97 days at approximately 102,000 physical qubits, a 1 ms stabilizer-measurement cycle, distance 20, and logical parallelism `P = 1160`. That paper applies carry-lookahead depth as a full-circuit proxy to a different wide-arithmetic construction. Its 97-day point is a preliminary estimate, not a concrete routed reference circuit.

Lookup primitive counts are tied to [Qualtran](https://github.com/quantumlib/Qualtran) commit `096a2d009059faee0cfae462c3d59cb055300eb9`. Factory sensitivity uses the exact in-place quantum carry-lookahead-adder Toffoli expression from [Draper *et al.*](https://arxiv.org/abs/quant-ph/0406142).

The complete source hashes are recorded in the accompanying [machine-readable reproduction specification](reproduction-spec-v1.json).

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

The required residue-product capacity is therefore

```text
target_bits = 2048 * 244 = 499712.
```

The idealized estimate obtained by dividing this target by 20 understates the required number of residues because actual 20-bit primes are smaller than `2^20`. The corrected workload enumerates primes in `[2^19, 2^20)`, takes them in descending order, and chooses the smallest count `J` satisfying

```text
sum(log2(p) for p in selected_primes) >= 499712.
```

This produces 25,330 jobs with 499,714.6416576 bits of product capacity. The prime enumeration and capacity sum are outputs to be independently derived, not trusted constants.

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

This matters because multiplying the largest level by the number of levels overcounts magic depth. Re-extracting it level by level reduced the router component by 25% relative to the scheduler's frozen proxy. The reported 42.760-day schedule retains the larger proxy rather than claiming the uncompiled reduction.

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

Distribute the 25,330 jobs as evenly as possible across 30 lanes. Ten lanes receive 845 jobs and twenty receive 844. The scheduling policy is deterministic, closed-lane, and first-ready-first-served at the accumulator.

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
M = 67,561,490.42827663 surgery rounds per attempt.
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
expected_attempt_multiplier = 4 / (1 - failure).
```

For this candidate, the derived values are 101,320 accumulator additions, `m = 25`, failure `0.0246837139`, and multiplier `4.1012336788`.

At code distance 20 and a 1 ms measurement cycle, one surgery round corresponds to `(2d/3)` measurement cycles. Expected operation-level days are

```text
days = (M + fanout)
     * expected_attempt_multiplier
     * (2 * 20 / 3)
     * 0.001
     / 86400
     = 42.7602176638.
```

The full trace contains 25,330 job records, 30 terminal resets, and one header. A verifier recomputing the schedule from the intervals observed 1,142/1,160 CCZ width, 8,212/8,216 processor logical occupancy, and exact prime capacity above the target.

## The clean scheduling ablation

The 41.157% result is a separate, cleaner comparison. It holds the cycle-12 circuit, number of jobs, stage durations, retry multiplier, and processor allocation fixed.

The phase-separated control completes all lane-local A/C batches, then all B services, then the terminal reset:

```text
ceil(jobs / lanes) * (A + C)
+ jobs * B
+ terminal.
```

The closed-lane schedule instead overlaps A and C work with B service while respecting the same lane and accumulator constraints. Under that frozen allocation, the phase-separated estimate is 94.1304296981 days and the closed-lane estimate is 55.3889675300 days before the later exact-CCZ and residue-capacity corrections.

This is a comparison against our own same-allocation control, not against a published implementation. It establishes that scheduling, rather than a different circuit or a larger machine, accounts for that particular reduction.

## Factory and reliability sensitivity

The 42.760-day value assumes operation resources are available when scheduled. To bound magic-state demand, the exact in-place QCLA Toffoli count used here is

```text
T(n) = 10n
     - 3 popcount(n)
     - 3 popcount(n - 1)
     - 3 floor(log2(n))
     - 3 floor(log2(n - 1))
     - 7.
```

Applying that expression to every modeled add and comparison produces 13.359 billion expected CCZ states. For `P = 1160`, a central 240-cycle batch model has 1.337× average throughput headroom. Perfect overlap retains 42.760 raw days. Fully serializing factory production gives 74.751 raw days, or 83.057 days per success at an imposed 90% whole-run survival target.

The conclusion is fragile:

| Sensitivity | Raw days | Days per success or implication |
|---|---:|---:|
| 240-cycle batches, perfect overlap | 42.760 | Operation-level lower envelope |
| 240-cycle batches, fully serialized | 74.751 | 83.057 at 90% survival |
| 360-cycle batches, fully serialized | 90.747 | 100.830 at 90% survival |
| 240-cycle serialized at nominal 0.1% physical error | 74.751 | 303–324, depending on block-hazard proxy |

Within the independent-error proxy, physical error must be approximately 0.0664% or lower to reach 90% survival. Correlated surgery, movement faults, burst contention, and decoder effects are not represented. The sensitivity analysis is a decision boundary, not a physical error proof.

## Why the physical claim remains open

The public time-efficient architecture supports a coarse capacity transfer: 1,142 is below `P = 1160`, and 8,212 is below the modeled 8,216 logical processor capacity. But an explicit route requires information the public v1 paper does not supply:

- parity-check matrices and logical-operator representatives for the proposed distance-20, 30%-rate code blocks;
- a mapping from the 8,212 live logicals to concrete blocks and physical supports;
- a high-rate surgery gadget for the mixed parallel-Pauli-measurement pattern;
- operation-zone coordinates, movement paths, collision constraints, and stabilizer timing;
- a concrete `P = 1160` factory layout and refill interface;
- decoder, feed-forward, and classical-bandwidth latency.

Consequently, the strongest defensible conclusion is:

> A substantially shorter logical operation schedule exists under the stated model. Whether it becomes a physical speedup depends on unresolved architecture and reliability assumptions.

## Clean-room reproduction protocol

This article and `reproduction-spec-v1.json` are the intended inputs to an independent implementation. The reproducer should not use the author scheduler, generated trace, verifier, or saved output JSON.

Before implementation, the reproducer should record:

1. source hashes and environment;
2. its interpretation of every timing rule;
3. included and excluded costs;
4. tests and pass thresholds;
5. any ambiguity that could materially affect the result.

It should then independently construct:

- actual-prime residue capacity;
- small-instance exact blocked-lookup witnesses;
- primitive lookup counts from the frozen Qualtran revision;
- stage durations from the frozen source models;
- a full schedule and a separately implemented verifier;
- the same-allocation phase-separated control;
- factory and reliability sensitivity.

The reproduction passes C2 if discrete workload and resource counts agree exactly, both implementations produce feasible schedules, makespans agree within 1%, no operation category is omitted, and any disagreement is documented without changing the frozen specification.

A different feasible schedule within tolerance is acceptable and may be stronger evidence than byte-for-byte agreement. Failure to reproduce is also a useful result if the discrepancy identifies an assumption hidden in this note.

## Frozen source identifiers

| Source | Frozen identifier |
|---|---|
| Gidney 2025 code archive | Zenodo 15347487; MD5 `80544b9dfbfe3612cb3727518160c588`; SHA-256 `e627abdeb91e880ec8500a3015ab59eb09c3171e1c8f8d9c5eab96728064c94d` |
| Qualtran | commit `096a2d009059faee0cfae462c3d59cb055300eb9`; archive SHA-256 `9acab01aa39cb50b6d000e7cb85f368a1e22607baf256f64a9788d78f3bc67df` |
| Cain *et al.* | arXiv:2603.28627v1 source SHA-256 `24728ea4b54e03407440a5c094d170708a3102dc0166006525c84c48645c1953` |
| Draper *et al.* QCLA | arXiv source SHA-256 `4b09a9526eebea36140738d706ba9b90ce0db0d184cee6dc221b5961b7f75549` |

## Scope and status

This is an open technical methods note, not a peer-reviewed result. The implementation that produced the reported numbers passed 121 tests and 32 subtests, including a separately implemented full-trace verifier. That evidence motivated publication, but it is not a substitute for clean-room reproduction.

Version 1.0 freezes the method and claims as of August 28, 2026. Corrections should be published as new versions with an explicit change log rather than silently changing the reproduction target.

The article, specification, and figure digests are recorded in `publication-manifest-v1.json` beside this source.
