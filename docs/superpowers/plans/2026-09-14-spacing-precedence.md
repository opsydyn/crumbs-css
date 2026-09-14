# Spacing precedence implementation plan

**Goal:** Normalize token and literal spacing before ordered native merging, implementing ADR D2 and continuing M0.2/M0.5.

**Scope:** Physical padding/margin sides, their horizontal/vertical aliases, and gap's row/column pair. Single token shorthands expand to canonical longhands during compilation. Existing multi-value literal CSS padding/margin conversion remains supported. Logical/RTL layout, border/flex shorthands, mixed multi-value token expressions and native structured values remain separate work. Android stays deferred until last.

- [x] Add independent value regressions and shrinking generated declaration-sequence tests; observe the precedence failure before implementation.
- [x] Add compiled same-rule and cross-composition token/literal conflicts, retained/missing-token checks, and native alias coverage.
- [x] Normalize both token and literal declarations to the same longhand keys before merging, without a new runtime normalization pass or dependencies.
- [x] Verify focused and full package checks, public Expo consumer exports, Storybook types, docs and existing local benchmarks.
- [x] Document the emitted-key migration and remaining coverage limits, commit only this slice and recommend the next roadmap item.

Preserve pending release-version edits. Do not claim complete M0.2 coverage for unrelated shorthand families or native/device performance qualification.
