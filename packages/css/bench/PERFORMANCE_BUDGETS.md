# Performance budget protocol

`budgets.json` is the versioned registry for Crumbs performance gates. It names every required M1 domain even when evidence is missing. Schema validity, registry readiness, and a current performance run are separate conclusions.

Run `bun run budgets:validate` to decode the registry, re-derive recorded values from retained JSON evidence, and report pending work. This command succeeds when the document and recorded evidence agree; it does not run workloads or qualify current performance. Run `bun run budgets:readiness` when checking whether every required baseline is recorded and every threshold has explicit approval. It fails while any threshold is pending or any baseline is missing or diagnostic. No command in M1.8a claims that the current checkout passes performance budgets.

## Recording a baseline

1. Define one bounded scenario, measure, unit, direction, and environment class. Keep compiler engines, module formats, runtime kinds, and device/build modes separate when their counters are not equivalent.
2. Run at least five independent repetitions sequentially. Record source revision and hashes, runtime/compiler/device identity, warmup, sample count, measurement phase, and uncontrolled conditions. Retain raw JSON under `docs/evidence`.
3. Add a closed evidence selector and the derived median to the registry. `budgets:validate` must reproduce the exact value. Diagnostic evidence remains diagnostic even when it has a numeric result.
4. Represent unavailable work as `missing` with a reason. Never substitute host, browser, development, lifecycle-count, compiler-output, or synthetic evidence for a named native or release scenario.

## Approving a threshold

Review the raw repetitions, min/median/max noise envelope, product requirements, and equivalent prior runs. Record both an absolute maximum and a maximum regression percentage, plus reviewer identity, UTC approval time, and retained review evidence. A result must satisfy both limits. Changing either limit is a reviewable policy change.

Set the registry to `active` only after every required baseline is recorded and every threshold is approved. The schema rejects active registries with incomplete entries and pending registries whose entries are all complete. Activation readiness still does not prove the current checkout passes: scenario adapters must produce comparable current measurements, verify environment compatibility, and evaluate both limits before a performance qualification can pass.

## Current state

The registry contains 17 metrics across all nine required domains. Runtime footprint, cold/warm transforms, and 10,000-token editor/compiler metrics have reproducible recorded host baselines. Retained-memory evidence is diagnostic because it lacks forced-GC release-device provenance. JS frames, UI frames, allocations, and incremental rebuilds have no qualifying baseline. Every threshold is pending reviewer approval. Existing benchmark smoke ceilings remain historical local checks and are not M1.8 budgets.

## Host comparison and review packets

Run `CRUMBS_AUDIT_NODE_FLOOR=/absolute/path/to/node-v22.0.0 bun run measure:host-budgets <output-directory>` after a complete package build. The command runs the Effect/runtime boundary matrix, five independent native-style benchmark processes, and five fresh editor measurements at every scale sequentially. It retains raw reports, an adapted benchmark summary, a baseline comparison, and a threshold review packet.

Comparison adapters require matching runtime/compiler identities and scenario contracts. The benchmark fingerprint includes environment, protocol, fixture hashes and sampling shape; editor comparison includes its exact generated manifest; runtime comparison includes Effect/build/protocol and Node identities. A mismatch reports incomplete before evaluating thresholds. Current medians are compared with the recorded baseline and, once approved, must satisfy both the absolute ceiling and the relative regression ceiling.

The review packet derives min/median/max envelopes and mechanical candidates using the larger of the observed maximum or the median plus twice the observed deviation, with a minimum ten-percent review margin and upward rounding. These values remain candidates. High-noise metrics are called out for isolation or remeasurement, and deterministic byte/count metrics require an explicit allowed-growth decision. The tool never edits or activates `budgets.json`.
