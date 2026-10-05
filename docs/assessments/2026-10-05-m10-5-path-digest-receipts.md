# M10.5 — immutable path-digest receipts A/B

Status: completed private experiment. No shipping cache, API, dependency, default, threshold or production-admission gate changes.

## Question and selected design

The previous receipt-sharing candidate regressed despite reading fewer logical bytes. This approved bounded slice tests whether digest-only consumers can avoid receipt buffer copies/equality checks while preserving the sampler and independent validation passes. This isolates one candidate API change; it does not isolate every timing cost.

Two private operations return immutable primitives: `guardReceiptFileDigest(path)` returns a digest string, and `guardReceiptMatches(path, bytes)` returns a byte-match boolean. Path mode never exposes sampler-owned buffers to these consumers. It compares the input view with correct byte offset/length without allocating another request buffer. Identity file receipts, loaded-artifact hashes, entry checks and source inventory use these operations in the owned candidate copy. Generic fingerprint hashing and UTF-8 configuration parsing retain their existing paths.

The first admitted file is still read and hashed twice. Repeated lookups recanonicalise the logical/canonical path identity; metadata, directories, domain checks and resolution are not cached. Before configuration/eligibility/inventory share one map; eviction closes/restarts it before disposal; the map closes before compilation. A fresh map captures post-build inventory/eligibility, then closes before native evaluation. Every early/error return closes its outstanding map. Sampling instability drains resources and falls fresh; original build/native errors retain their handling. Neither filesystem atomicity, mtime-based validation nor cross-request caching is claimed.

The benchmark adds a path-mode flag to the existing scoped sampler and keeps the older buffer consumers for controls. Exact source replacements, named function boundaries, logical operation counts and generated syntax reject supported-shape drift. The tests exercise owned generated modules, including a binary-exposure trap and real byte edits between first/second samples before and after compilation in both modes.

## Measurement and controls

One artifact supports three explicit variants: **baseline** disables receipt sharing; **buffer** shares defensive buffer receipts; **path** shares digest/match primitives. Profiling remains enabled in every variant. The baseline uses the same path-wrapper fallback, so it is not byte-for-byte prior baseline code. Both controls are necessary: beating a rejected buffer candidate does not prove the original guards improved.

The fixed matrix executes three workloads × five blocks × fresh/immediate/repeat × three variants at capacity 8: **135 processes / 10,035 transforms**. Each variant comparison has 3,345 transform pairs; retained/fresh comparisons total 6,690. Odd blocks reverse variant order, giving three forward/two reversed blocks. Analyse paired process medians and treat small deltas cautiously; this is partial counterbalancing, not a calibrated host-performance budget. Child flags, genuine Node version/executable hash, measured probe bytes, candidate provenance, full receipts, clocks, logical reads, context/probation bounds, close/disposal and observed process exit are replay-checked.

Node v24.15.0, Bun 1.4.2, macOS arm64, esbuild 0.27.7 and integration 8.0.10 remain unchanged. Captured Expo stock configuration replays development CSS transforms directly. This is not a new Metro bundle/HMR qualification, Node-floor host budget, Hermes or device measurement. Shipping inventory is unchanged. Sampled RSS is endpoint evidence, not a peak, allocator-release promise or selected memory ceiling. The inherited matrix runner has no child-completion watchdog; unattended hang recovery remains a tooling follow-up.

## Result

Five-process warm median milliseconds. Ratios are medians of paired per-block process ratios, not ratios of the aggregate medians.

| Workload | Mode | Baseline | Buffer | Path | Path/baseline | Path/buffer |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| seven-entry | fresh | 10.119 | 10.371 | 10.083 | 1.005 | 0.975 |
| seven-entry | immediate | 35.172 | 42.257 | 38.139 | 1.080 | 0.903 |
| seven-entry | repeat | 36.581 | 43.339 | 39.086 | 1.076 | 0.907 |
| hot-scan | fresh | 10.219 | 10.275 | 10.126 | 1.004 | 0.990 |
| hot-scan | immediate | 36.346 | 42.515 | 39.037 | 1.075 | 0.916 |
| hot-scan | repeat | 36.339 | 42.745 | 38.776 | 1.055 | 0.902 |
| 32-entry | fresh | 10.059 | 9.880 | 10.447 | 1.045 | 1.032 |
| 32-entry | immediate | 39.345 | 50.072 | 45.881 | 1.171 | 0.921 |
| 32-entry | repeat | 39.004 | 45.518 | 42.631 | 1.095 | 0.941 |

All complete source/input/native-metadata/Metro-result comparisons match, native values stay current, exclusive phase clocks conserve time and logical byte groups conserve totals. Buffer/path samplers retain the same sampling and canonicalisation requirements. These figures describe complete transforms; no specific copy, canonicalisation or sampling cost is inferred from an unmeasured allocation/CPU profile. Fewer logical bytes do not establish less physical disk IO.

Path digests improve observed retained warm transform medians roughly **6–10% relative to buffer receipts**, but remain roughly **6–17% slower than the same-artifact baseline guard control**. Reject this candidate as an overall performance improvement. Fresh controls range up to about 4.5% across variants and demonstrate host variability; do not attribute small differences solely to the API change or treat these medians as a calibrated overhead bound. The result rules out selecting this implementation on the measured workloads; it does not prove every immutable receipt design ineffective.

## Verification and evidence boundaries

The primitive and generated-consumer tests each ran RED→GREEN. The exact patch initially matched the `hash` prefix in `hashes.get` as well; the conservative uniqueness check rejected it, and a full statement match repaired the private patch before measurement. Seventeen focused checks cover owned buffer mutation, offset views, pass closure/error restoration, symlink retargets, preserved timestamps, generated syntax and before/after sampling fallback. The generated path candidate also executes the 42 existing identity/session/property checks, including 500 independent resource traces.

Twenty-one supplementary full-transform controls run after timed collection: syntax repair, preserved-mtime entry edit, buffer conflict, unknown option, retained mid-build instability, loaded-artifact edit and package rename in all variants. Eighteen match complete fresh references. Package rename requires worker restart: retention disables with package-info-changed, metadata remains equal, and in-process source/input/result can differ from a newly loaded worker because integration retains package info. Full control receipt bytes and restored-file hashes are archived. Do not infer a production admission pass from these controlled checks.

Final package/types/docs, negative controls, archive replay and review are recorded in `verification.json`. Task 5's configuration/graph, receipt, development HMR and multi-worker shutdown blockers remain open. Android remains last.

## Reproduction and next slice

Run `bun packages/css/bench/context-reuse/guard-path-digest-ab.ts <empty-owned-root>` for the fixed matrix; `--smoke` selects a separate nine-process pilot. It builds owned copies with installed packages. Replay the pinned archive with `python3 docs/evidence/2026-10-05-m10-5-path-digest-receipts/verify.py`; optional `--live` checks original shipping/candidate paths. Measured receipt paths remain unmodified, and replay needs no network/npm installation.

Recommend **M10.5 — configuration/graph invalidation gate diagnosis**: reproduce and localise alias retarget, workspace-package import and symlink-retarget failures against independent fresh Metro results. Distinguish resolver/watch invalidation, integration caches and retained-context state before changing behaviour. This targets a concrete admission blocker; further guard optimisations stay private and unselected. Android remains last.
