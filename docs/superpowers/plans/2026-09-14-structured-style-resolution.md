# Structured style resolution implementation plan

**Goal:** Repair M0.3 runtime classification and primitive result typing, following ADR D1/D2.

**Architecture:** Give Crumbs-authored variant maps an internal symbol marker, capture it as serializable export-kind metadata before vanilla-extract serialization, and restore it on emitted maps. Keep their public string keys/types unchanged. Resolve marked maps explicitly. Retain a conservative legacy fallback that recognizes valid native structured values before testing map entries. Native nested values remain opaque and keep their references; nested token evaluation and end-to-end structured-value compilation belong to M0.4/M2.

- [x] Reproduce scalar loss/transform corruption, structured-only styles, genuine variant maps and type erasure with independent values and type fixtures.
- [x] Preserve compiled variant-map identity across serialization, including native-property-like variant names and object spread; add integration regressions.
- [x] Fix classification and preserve primitive object/array result types in direct resolvers, hooks and namespace resolution.
- [x] Run shrinking structured-value properties, full package qualification, consumer exports, Storybook types, docs and existing local budgets.
- [x] Document legacy ambiguity and compiler/runtime coverage boundaries, update roadmap, commit the slice and recommend M0.4.

No new dependency or public authoring helper. Preserve release-version edits. Android remains deferred until last. Do not claim native structured values survive CSS conversion until M0.4 establishes that contract.
