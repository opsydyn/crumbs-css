# Architecture decisions

ADRs record consequential architectural choices, their alternatives, and their verification criteria. The roadmap records delivery order; an ADR's status does not describe implementation progress.

| Record | Status | Date | Delivery |
| --- | --- | --- | --- |
| [Adopt a native design-system compiler architecture](adopt-native-design-system-compiler.md) | Proposed | 2026-09-06 | [Design-system roadmap](../roadmap.md) |
| [Separate mandatory theme resolution from optional runtime state](separate-mandatory-theme-resolution-from-optional-runtime-state.md) | Rejected | 2026-10-06 | M10.5 runtime-boundary candidate |
| [Anchor M10.5 runtime-budget revisions in Expo consumer evidence](anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md) | Proposed | 2026-10-06 | [M10.5 runtime-budget policy](../roadmap.md) |

## Conventions

- Store decisions here using descriptive slug filenames and explicit status/date metadata.
- New drafts are **proposed**. Record acceptance explicitly after review; drafting a document does not accept its detailed contracts or authorize all implementation work.
- Record later amendments and implementation evidence with dates. Superseding decisions must link in both directions.
- Each decision includes constraints, alternatives, affected paths, migration work, and checkable acceptance criteria.
- Link future implementation PRs and relevant code entrypoints back to the governing ADR.
- Keep future plans outside `src/content/docs/`, whose pages describe the shipped consumer API.

The [assessment](../assessments/2026-09-06-design-system-assessment.md) preserves the evidence behind the first decision. Neither proposed APIs nor unchecked roadmap items are current package guarantees.
