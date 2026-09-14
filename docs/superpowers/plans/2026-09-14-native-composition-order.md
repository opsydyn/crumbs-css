# Native composition order implementation plan

**Goal:** Repair Crumbs composition authoring types and preserve ordered native inputs through compilation, as the first bounded M0.2 slice.

**Spec:** [Native compiler ADR, D2](../../decisions/adopt-native-design-system-compiler.md) and [roadmap M0.2](../../roadmap.md).

**Architecture:** Capture each inline rule as its own vanilla-extract class and register the composition's authored sequence explicitly. Preserve repeated bases and nested sequences instead of relying on vanilla-extract's merged inline rules and deduplicated browser class lists. The existing native emitter then merges converted declarations in that captured order. This is a legacy-pipeline repair, not the M2 IR migration.

**Constraints:** Work on the existing `codex/m0-token-declarations` branch. Preserve unrelated release-version edits. Android acceptance is deferred until last by the user and remains incomplete. No new dependencies, publication or performance claims.

- [x] Reproduce conflicting bases/literals/tokens, nested composition and repeated bases using value assertions against a separately implemented reference evaluator.
- [x] Add positive and negative composition type fixtures for generic and primitive helpers and style variants; run the typecheck red.
- [x] Preserve authored composition order and widen composition inputs without widening primitive inline property sets.
- [x] Run focused tests with reproducible generated cases, then package, playground, Storybook type and docs checks sequentially where builds share output.
- [x] Update API documentation and roadmap with exact coverage and remaining token shorthand/native structured-value limits. Commit the slice and recommend the next bounded repair.

Literal padding shorthand/longhand conflicts are covered through existing conversion. Token shorthand normalization is a separate follow-up: this slice covers token/literal conflicts on the same native property and must not claim all of M0.2 complete.
