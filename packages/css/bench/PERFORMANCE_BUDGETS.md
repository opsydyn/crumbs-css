# Performance budget protocol

`budgets.json` is the versioned registry for Crumbs performance gates. It names every required M1 domain even when evidence is missing. Schema validity, registry readiness, and a current performance run are separate conclusions.

Run `bun run budgets:validate` to decode the registry, re-derive recorded values from retained JSON evidence, and report pending work. This command succeeds when the document and recorded evidence agree; it does not run workloads or qualify current performance. Run `bun run budgets:readiness` when checking whether every required baseline is recorded and every threshold has explicit approval. It fails while any threshold is pending or any baseline is missing or diagnostic.

## Recording a baseline

1. Define one bounded scenario, measure, unit, direction, and environment class. Keep compiler engines, module formats, runtime kinds, and device/build modes separate when their counters are not equivalent.
2. Run at least five independent repetitions sequentially. Record source revision and hashes, runtime/compiler/device identity, warmup, sample count, measurement phase, and uncontrolled conditions. Retain raw JSON under `docs/evidence`.
3. Add a closed evidence selector and the derived median to the registry. `budgets:validate` must reproduce the exact value. Diagnostic evidence remains diagnostic even when it has a numeric result.
4. Represent unavailable work as `missing` with a reason. Never substitute host, browser, development, lifecycle-count, compiler-output, or synthetic evidence for a named native or release scenario.

## Approving a threshold

Review the raw repetitions, min/median/max noise envelope, product requirements, and equivalent prior runs. Record both an absolute maximum and a maximum regression percentage, plus reviewer identity, UTC approval time, and retained review evidence. A result must satisfy both limits. Changing either limit is a reviewable policy change. Deterministic emitted bytes and compiler-instantiation counts use zero-growth limits. Timings and process-memory measurements use bounded margins selected for their observed noise. Runtime initialization is split by Node runtime and module format, excludes one warmup process, retains 15 fresh-process samples, and compares medians while preserving individual outliers in evidence.

Set the registry to `active` only after every required baseline is recorded and every threshold is approved. The schema rejects active registries with incomplete entries and pending registries whose entries are all complete. Activation readiness still does not prove the current checkout passes: scenario adapters must produce comparable current measurements, verify environment compatibility, and evaluate both limits before a performance qualification can pass.

## Current state

The registry contains 26 metrics across all nine required domains. Twenty-two
runtime-footprint, transform, incremental-rebuild, and 10,000-token
editor/compiler metrics have reproducible recorded host baselines and approved
thresholds. Six of those are the current split emitted-graph gates:
`runtime.theme-core.{esm,cjs}.graph-bytes`,
`runtime.tokens.{esm,cjs}.graph-bytes`, and
`runtime.theme-compatibility.{esm,cjs}.graph-bytes`. They use five sequential
artifact scans and zero-growth limits. The historical
`effect.runtime.cjs.graph-bytes` selector remains separately visible and
continues to fail against its old compatibility baseline when current output
is compared.

Retained-memory evidence is diagnostic because it lacks forced-GC release-device
provenance. JS frames, UI frames, and allocations have no qualifying baseline
or threshold. The registry therefore remains pending and cannot produce
whole-registry performance qualification. Existing benchmark smoke ceilings
remain historical local checks and are not M1.8 budgets.

## Host comparison and review packets

Run `CRUMBS_AUDIT_NODE_FLOOR=/absolute/path/to/node-v22.0.0 bun run measure:host-budgets <output-directory>` after a complete package build. The command runs the Effect/runtime boundary matrix, the isolated 15-sample runtime-initialization matrix, an Expo/Metro direct-edit run, five independent native-style benchmark processes, and five fresh editor measurements at every scale sequentially. It retains raw reports, an adapted benchmark summary, a baseline comparison, and a threshold review packet. The Metro run binds a localhost port and performs reversible edits, so its host must permit local server and file-watcher operation.

Run `bun run build && bun run measure:runtime-graph-budgets <output-directory>` for the focused M4.6 split graph comparison. The adapter scans `theme-core`, `tokens`, and compatibility `theme` in ESM and CJS five times, retains artifact hashes, compares the six admitted zero-growth metrics, and reports the retained historical `runtime-emitted-bytes` comparison separately. The graph fingerprint uses the Bun/build-tool and host identity that determines the emitted artifacts; the current Node version is retained as evidence but is not an equivalence blocker for this emitted-byte scan. A split-gate failure exits non-zero; the expected historical compatibility failure does not.

Comparison adapters require matching runtime/compiler identities and scenario contracts. The benchmark fingerprint includes environment, protocol, fixture hashes and sampling shape; editor comparison includes its exact generated manifest; Effect-boundary comparison includes Effect/build/protocol and Node identities; runtime initialization includes runtime/format, host and sampling protocol; Metro comparison includes Expo/Metro/RN identities, the direct-edit protocol and exact fixture hashes. A mismatch reports incomplete before evaluating thresholds. Current medians are compared with the recorded baseline and must satisfy both the absolute ceiling and the relative regression ceiling.

Run `bun run measure:metro-incremental <output.json>` for the focused Metro scenario. It warms one cleared iOS development graph, excludes one direct-edit warmup, then records five direct `.css.ts` edits from file write through a 75 ms watcher-settle interval and receipt of the updated full bundle. Every receipt must contain all four newly compiled padding longhands, omit the previous values, change the bundle hash, and restore both edited files. A dependency-only control is diagnostic: Metro 0.84 updates the dependency module but leaves the importing baked `.css.ts` transform stale. That control is not admitted as incremental-rebuild evidence and remains an M2.7 correctness requirement.

The review packet preserves approved decisions beside their min/median/max envelopes and derives mechanical candidates only for recorded metrics still awaiting review. Candidates use the larger of the observed maximum or the median plus twice the observed deviation, with a minimum ten-percent review margin and upward rounding. High-noise metrics and approved zero-growth policies remain visible. The tool never edits or activates `budgets.json`.
