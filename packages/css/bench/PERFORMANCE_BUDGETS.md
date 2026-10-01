# Performance budget protocol

`budgets.json` is the versioned registry for Crumbs performance gates. It names every required M1 domain even when evidence is missing. Schema validity, registry readiness, and a current performance run are separate conclusions.

Run `bun run budgets:validate` to decode the registry, re-derive recorded values from retained JSON evidence, and report pending work. This command succeeds when the document and recorded evidence agree; it does not run workloads or qualify current performance. Run `bun run budgets:readiness` when checking whether every active baseline is recorded and every active threshold has explicit approval. It fails while an active threshold is pending or an active baseline is missing or diagnostic. Entries in the separate `diagnostics` collection are verified and reported but do not participate in active readiness or threshold review.

## Recording a baseline

1. Define one bounded scenario, measure, unit, direction, and environment class. Keep compiler engines, module formats, runtime kinds, and device/build modes separate when their counters are not equivalent.
2. Run at least five independent repetitions sequentially. Record source revision and hashes, runtime/compiler/device identity, warmup, sample count, measurement phase, and uncontrolled conditions. Retain raw JSON under `docs/evidence`.
3. Add a closed evidence selector and the derived median to the registry. `budgets:validate` must reproduce the exact value. Diagnostic evidence remains diagnostic even when it has a numeric result.
4. Represent unavailable work as `missing` with a reason. Never substitute host, browser, development, lifecycle-count, compiler-output, or synthetic evidence for a named native or release scenario.

## Approving a threshold

Review the raw repetitions, min/median/max noise envelope, product requirements, and equivalent prior runs. Record both an absolute maximum and a maximum regression percentage, plus reviewer identity, UTC approval time, and retained review evidence. A result must satisfy both limits. Changing either limit is a reviewable policy change. Deterministic emitted bytes and compiler-instantiation counts use zero-growth limits. Timings and process-memory measurements use bounded margins selected for their observed noise. Runtime initialization is split by Node runtime and module format, excludes one warmup process, retains 15 fresh-process samples, and compares medians while preserving individual outliers in evidence.

Set the registry to `active` only after every active required baseline is recorded and every active threshold is approved. The schema rejects active registries with incomplete active entries and pending registries whose active entries are all complete; diagnostic-only entries do not affect that state. Activation readiness still does not prove the current checkout passes: scenario adapters must produce comparable current measurements, verify environment compatibility, and evaluate both limits before a performance qualification can pass.

## Current state

The registry contains 25 active metrics across all nine required domains and
one diagnostic-only entry. Twenty-one active metrics covering runtime-footprint,
transform, incremental-rebuild, and 10,000-token editor/compiler workloads have
reproducible recorded host baselines and approved thresholds. Six are the
current split emitted-graph gates:
`runtime.theme-core.{esm,cjs}.graph-bytes`,
`runtime.tokens.{esm,cjs}.graph-bytes`, and
`runtime.theme-compatibility.{esm,cjs}.graph-bytes`. They use five sequential
artifact scans and zero-growth limits. The historical
`effect.runtime.cjs.graph-bytes` selector is now a verified diagnostic with its
selector, value and evidence retained; its old zero-growth comparison remains
separately visible and never contributes to current-functionality
qualification.

The incremental-rebuild baseline now follows the expanded M2.7-aware protocol:
three dependency-only receipts (plain token, nested `.css.ts`, and workspace
source) prove parent invalidation before one excluded warmup and five retained
direct edits. The controls are retained correctness evidence and are excluded
from the direct-edit median. The reconciled median is 123.9505 ms; its existing
approved ceiling remains 137.506 ms with a 10% relative limit.

Retained-memory evidence is diagnostic because it lacks forced-GC release-device
provenance. JS frames, UI frames, and allocations have no qualifying baseline
or threshold. These four active gates keep the registry pending and prevent
whole-registry performance qualification. Existing benchmark smoke ceilings
remain historical local checks and are not M1.8 budgets.

The historical `runtime-emitted-bytes` entry is now in the top-level
`diagnostics` collection, has no active threshold, and remains evidence-verified
and visible in diagnostic comparisons. Registry v2 keeps it outside active
threshold review and readiness. `budgets:validate` reports 25 active metrics
and `diagnosticOnlyMetrics: ["runtime-emitted-bytes"]`; readiness remains false
because of the four active gates. See the [M10.5 readiness audit](../../../docs/assessments/2026-09-30-m10-5-performance-registry-readiness.md)
for the earlier finding and the [registry membership correction assessment](../../../docs/assessments/2026-09-30-m10-5-performance-registry-membership.md)
for the corrected contract.

## Host comparison and review packets

Run `CRUMBS_AUDIT_NODE_FLOOR=/absolute/path/to/node-v22.0.0 bun run measure:host-budgets <output-directory>` after a complete package build. The command runs the Effect/runtime boundary matrix, the isolated 15-sample runtime-initialization matrix, an Expo/Metro direct-edit run, five independent native-style benchmark processes, and five fresh editor measurements at every scale sequentially. It retains raw reports, an adapted benchmark summary, a comparison for recorded metrics, diagnostic-only comparisons and a threshold review packet. The Metro run binds a localhost port and performs reversible edits, so its host must permit local server and file-watcher operation.

Run `bun run build && bun run measure:runtime-graph-budgets <output-directory>` for the focused M4.6 split graph comparison. The adapter scans `theme-core`, `tokens`, and compatibility `theme` in ESM and CJS five times, retains artifact hashes, compares the six admitted zero-growth metrics, and reports the retained historical `runtime-emitted-bytes` comparison separately. The graph fingerprint uses the Bun/build-tool and host identity that determines the emitted artifacts; the current Node version is retained as evidence but is not an equivalence blocker for this emitted-byte scan. A split-gate failure exits non-zero; the expected historical compatibility failure does not.

Comparison report format v2 separates host/toolchain identity from measurement identity. Each metric records `environment` and `measurementIdentity` as `exact` or `mismatch`, with field paths in `environmentDifferences` and `measurementIdentityDifferences`. An environment mismatch takes precedence in the result label, but both difference lists are retained; an exact environment with changed workload, fixture, source, or protocol reports `incomplete-measurement-identity-mismatch`. Neither incomplete result evaluates thresholds.

The benchmark fingerprint includes environment, protocol, fixture hashes and sampling shape; editor comparison includes compiler/host identity separately from its exact generated manifest and source/package identity; Effect-boundary comparison separates runtime/build identity from build protocol; runtime initialization separates runtime/format and host identity from its sampling protocol; Metro comparison separates Expo/Metro/RN identity from its direct-edit protocol and fixture hashes. The cold-transform adapter canonicalises fixture paths to package-relative paths and recognises only the exact retained legacy/current ordering descriptions as equivalent: the cold worker uses the fixture root as its process cwd in both protocols. The warm-transform adapter preserves the ordering difference because the warm call's cwd changed. All other protocol and fixture differences fail closed. Comparable current medians must satisfy both the absolute ceiling and the relative regression ceiling.

Run `bun run measure:metro-incremental <output.json>` for the focused Metro scenario. It warms one cleared iOS development graph, records three dependency-only invalidation receipts, excludes one direct-edit warmup, then records five direct `.css.ts` edits from file write through a 75 ms watcher-settle interval and receipt of the updated full bundle. Every direct receipt must contain all four newly compiled padding longhands, omit the previous values, change the bundle hash, and restore both edited files. The dependency receipts prove that plain-token, nested `.css.ts`, and workspace-source parents rebuild; they remain separate correctness samples and are excluded from the direct-edit median.

The review packet preserves approved decisions beside their min/median/max envelopes and derives mechanical candidates only for recorded metrics still awaiting review. Diagnostic baselines are checked for complete optional selector/value metadata and evidence re-derivation, but are excluded from active threshold approval. Candidates use the larger of the observed maximum or the median plus twice the observed deviation, with a minimum ten-percent review margin and upward rounding. High-noise metrics and approved zero-growth policies remain visible. The tool never edits or activates `budgets.json`.
