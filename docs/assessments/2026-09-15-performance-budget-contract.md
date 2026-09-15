# M1.8a: performance budget contract and protocol

M1.8a introduces a versioned internal Effect Schema contract and committed registry for all performance domains required by the ADR: JS and UI frame time, allocations, retained memory, runtime footprint and initialization, cold and warm transforms, incremental rebuilds, and editor/compiler cost. This is tooling-only code; it does not enter public declarations or runtime bundles.

The schema rejects unknown fields and versions, invalid or duplicate identifiers, absent domains, non-finite values, recorded baselines below the five-repetition minimum, approved thresholds without a recorded baseline, and active registries with incomplete entries. Approved thresholds require both an absolute ceiling and maximum regression percentage plus reviewer, UTC time, and evidence. Missing and diagnostic baselines can only carry pending thresholds.

Recorded numbers use closed selectors rather than free-form query strings. `bun run budgets:validate` re-derives all twelve recorded values from the retained M1 evidence and currently reports no drift. `bun run budgets:readiness` deliberately fails: all 17 thresholds await review, four baselines are missing, and retained memory remains diagnostic. Both commands report `performanceQualification: not-run`; registry readiness cannot stand in for a current performance run.

The [living protocol](../../packages/css/bench/PERFORMANCE_BUDGETS.md) defines scenario identity, sequential independent repetitions, raw evidence, environment equivalence, reviewer approval, and the rule that both absolute and relative limits must pass. The committed registry is valid but remains `thresholds-pending-review`. Historical local benchmark smoke ceilings are not promoted into M1.8 budgets.

Package build, typecheck and tests pass, including negative version/shape/state transitions, exact evidence re-derivation, and CLI exit semantics. Documentation builds successfully. No dependency, public API, runtime behavior, push or publication is introduced. Preexisting release version edits remain excluded. Native Android stays last.

Next recommended slice: M1.8b, add current-measurement adapters and comparison reports for the already recorded host/editor domains, then prepare a threshold review packet from retained noise envelopes without activating the registry. Begin only after approval.
