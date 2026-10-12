# M10.5 consumer compiler reproduction — 2026-10-12

## Finding

The known host compiler regression reproduces. The existing source benchmark records **9.562208 ms warm (1.688× the 5.664125 ms baseline)** and **93.114542 ms cold (1.402× the 66.404584 ms baseline)**. Both scoped budget rows fail. The comparator reports exact recorded environment and measurement identity for those two rows; this is not a complete release qualification or a same-session baseline A/B. In particular, host load and filesystem caches are uncontrolled.

The consumer report of “2.5× slower” remains unverified: no comparator, consumer app, timing protocol or version matrix has been supplied. The retained baseline is our historical Crumbs source benchmark, not another styling library. These results support a relationship to M10.5's unresolved compiler cost, but do not establish the reported ratio or its root cause.

## Measurements

All aggregates use the median of five independent process medians, nearest rank. Each process retains six samples per fixture and phase. Independent processes run serially; nothing is dropped or rerun for a pass.

| Measurement | Recipe | Consumer button |
| --- | ---: | ---: |
| Source/Bun cold | 92.615667 ms | 91.665500 ms |
| Source/Bun warm | 9.562208 ms | 8.503500 ms |
| Published 1.1.1 / Node 24 cold | 77.769875 ms | 77.696250 ms |
| Published 1.1.1 / Node 24 warm | 9.161750 ms | 8.806041 ms |
| Published 1.1.1 / Bun cold | 86.555375 ms | 86.273750 ms |
| Published 1.1.1 / Bun warm | 8.699584 ms | 7.733584 ms |

The source gate takes the maximum fixture median in each process before aggregating, so its cold selector is 93.114542 ms rather than either individual fixture's cohort median. All five source processes exit zero under the older benchmark smoke ceilings; the unchanged scoped M10.5 comparator independently rejects both cold and warm rows. See [comparison.json](comparison.json) and [benchmark-summary.json](benchmark-summary.json).

Source measurements use the existing package-root warm cwd protocol and the committed benchmark. Published measurements use a separate fixture-root cwd, copied fixtures, compiled CJS and the retained registry package. Do not use the published numbers as substitutions for the source budget row or infer a source/compiled speedup from these different protocols. First-transform timers exclude startup and module import, but include lazy compiler initialization. This is direct compiler evidence, not Metro build or edit/reload latency.

## Published artifact and profiling

All 185 files of the retained registry package are checked against the earlier independently verified installed-file receipt. Its 105 JavaScript files match current workspace dist exactly. The isolated app reuses locked dependency directories; it does not resolve a fresh npm dependency graph. Versions: Crumbs 1.1.1, Vanilla Extract CSS 1.20.1, integration 8.0.10, css-to-react-native 3.2.0, Effect 4.0.0-rc.115, React 19.2.3, RN 0.85.3. Node is genuine 24.15.0; Bun is 1.4.2. [Artifact parity](artifact-parity.json), [consumer identity](consumer-identity.json).

Published Node and Bun cohorts alternate order across five pairs. All 240 published cold/warm outputs have exact per-fixture hash parity across phases, processes and runtimes. The separate five-process Node profile wraps only the public Vanilla Extract integration compile boundary before loading Crumbs; no installed file is modified. Each timed warm transform calls that boundary once. Recipe compile median is **5.351958 ms** within a **8.511042 ms** full-transform profile; button compile median is **4.341583 ms** within **7.403833 ms**. Profiling changes execution and omits the cold-child sequence, so it is diagnostic attribution only. It corroborates compilation as the largest measured boundary; it neither proves which change caused the historical regression nor justifies a cache or compiler replacement. All profiled output hashes match the unprofiled cohorts. [Published/profile summary](published-summary.json).

## Reproduction

The original source command, run in five fresh processes from the recorded checkout:

```sh
CRUMBS_BENCH_WARM_TRANSFORM_CWD=package-root CRUMBS_BENCH_JSON_OUTPUT=/absolute/output/benchmark-1.json bun packages/css/bench/native-styles.bench.ts
```

For the separate published workload, create a temporary app containing `package.json` with a name/version, the retained fixtures at `readme/` and `styles/`, and a resolved installation of Crumbs 1.1.1 with the versions above. Copy [worker.cjs](worker.cjs) into that app root. Run `node worker.cjs measure` and `bun worker.cjs measure` serially in five alternating pairs. Run `node worker.cjs profile` in five additional fresh processes. The worker verifies hash parity and exits after each cohort. The existing packet used retained registry bytes and dependency links as recorded in consumer-identity.json; a new npm install can change transitive resolution and must retain its own lockfile/identity.

`verify.py` independently rederives medians, source selectors and output parity from every retained raw report. It also checks the packet inventory. All raw samples remain in the numbered JSON files. Scratch logs and the temporary install are outside the repository.

## Scope and next slice

Source revision: c763d9a7b7ea7f7c4f4cd5ab8fb63a42026bc3ad. Existing `.superpowers/` and `apps/storybook/ios/` untracked paths are preserved. No product code, public API, dependencies, baselines, budgets, release exceptions or publication changes. No complete host suite, Metro build, SDK 57 consumer install, native or device-performance qualification was run. Existing v1.1.1 release remains published; this packet creates no new performance waiver.

**Next recommended slice: M10.5 — reproduce the consumer's reported 2.5× slowdown with their comparator and app.** Match Node, Expo/Metro, dependencies and fixtures; separate cold compilation, warm transforms, dependency edits and Metro cache hits. Profile that matched case before choosing one API-preserving remediation. The observed cold source-row failure also needs attribution before any claim that compiler performance is fixed.
