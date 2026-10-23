# Architecture decisions

ADRs record consequential architectural choices, their alternatives, and their verification criteria. The roadmap records delivery order; an ADR's status does not describe implementation progress.

**Current release status (2026-10-23):** npm and GitHub publish **1.3.0**, including the native inspector. The [accepted M10.5 compiler-baseline decision](../evidence/2026-10-18-m10-5-v12-rebaseline/README.md) supersedes the blocked-publication states in the dated investigation history below. The [1.3.0 publication record](../releases/1.3.0.md) records subsequent normal release qualification. Rejected compiler prototypes remain rejected; this reconciliation introduces no compiler change or new budget exception.

| Record | Status | Date | Delivery |
| --- | --- | --- | --- |
| [Adopt a native design-system compiler architecture](adopt-native-design-system-compiler.md) | Proposed | 2026-09-06 | [Design-system roadmap](../roadmap.md) |
| [Separate mandatory theme resolution from optional runtime state](separate-mandatory-theme-resolution-from-optional-runtime-state.md) | Rejected | 2026-10-06 | M10.5 runtime-boundary candidate |
| [Anchor M10.5 runtime-budget revisions in Expo consumer evidence](anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md) | Accepted | 2026-10-06 | [M10.5 runtime-budget policy](../roadmap.md) |
| [Stage a private compiler-free contract kernel](stage-a-private-compiler-free-contract-kernel.md) | Proposed | 2026-10-17 | M10.5 pure-contract kernel design |
| [Bind runtime admission to artifact provenance](bind-runtime-admission-to-artifact-provenance.md) | Proposed | 2026-10-17 | M10.5 runtime provenance design |

## Conventions

- Store decisions here using descriptive slug filenames and explicit status/date metadata.
- New drafts are **proposed**. Record acceptance explicitly after review; drafting a document does not accept its detailed contracts or authorize all implementation work.
- Record later amendments and implementation evidence with dates. Superseding decisions must link in both directions.
- Each decision includes constraints, alternatives, affected paths, migration work, and checkable acceptance criteria.
- Link future implementation PRs and relevant code entrypoints back to the governing ADR.
- Keep future plans outside `src/content/docs/`, whose pages describe the shipped consumer API.

The [assessment](../assessments/2026-09-06-design-system-assessment.md) preserves the evidence behind the first decision. Neither proposed APIs nor unchecked roadmap items are current package guarantees.

The accepted M10.5 consumer-evidence ADR includes a [2026-10-08 conditional expanded-runtime scope amendment](anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md#2026-10-08--accepted-conditional-expanded-runtime-byte-scope). Four caps are approved for later complete admission; current registry/enforcement stay active while the implementation plan awaits review.

The accepted runtime-budget ADR also carries a [proposed consumer-scoped release-enforcement amendment](anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md#2026-10-08--proposed-consumer-scoped-host-release-enforcement): 11 blocking developer-workflow checks and 10 advisory runtime proxies, retaining all measurements and numerical contracts. It is not accepted or active. The conditional byte candidate was rejected and removed; the earlier statement that its plan awaits review is historical, with the [rejection assessment](../assessments/2026-10-08-m10-5-expanded-runtime-remediation.md) recording the later outcome.

The consumer-scoped release-enforcement proposal above was **accepted on 2026-10-08** after explicit review. The [dated accepted amendment](anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md#2026-10-08--accepted-consumer-scoped-release-enforcement) replaces the unactivated conditional byte-admission requirement. Implementation remains pending review of its single-task inline plan; current enforcement is still all 21 rows passing.

2026-10-08: consumer-scoped M10.5 enforcement is implemented in the [accepted Expo evidence ADR](anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md#2026-10-08--consumer-scoped-host-policy-implemented). Numerical contracts remain unchanged; current host qualification is separate.

2026-10-18: the [dated compiler-reuse decision](adopt-native-design-system-compiler.md#compiler-reuse-decision--2026-10-18) retains shipping fresh compilation and parks new reuse remediation. It updates the existing retention history; the parent remains proposed and the accepted release policy is unchanged. No new cache or release exception is adopted.


2026-10-18: the owner subsequently [approved the worker-lifetime compiler contract](adopt-native-design-system-compiler.md#approved-worker-lifetime-compiler-contract--2026-10-18), narrowly replacing fresh compiler-service-error equivalence and reopening compiled-text reuse design. Mutable-input proof, fresh authoring and all release budgets remain binding. The [complete written design](../superpowers/specs/2026-10-18-m10-5-worker-scoped-compiled-text-design.md) awaits review; no candidate or publication is adopted and the parent ADR remains proposed.


2026-10-18: the owner approved the complete worker-scoped cache design at `090c4fd`. Its [single implementation plan](../superpowers/plans/2026-10-18-m10-5-worker-scoped-compiled-text.md) awaits review; native/inline execution and one outcome commit are retained. This approval does not qualify performance or publication.

2026-10-18: execution of the approved worker-scoped plan [rejected its session-transport candidate](../assessments/2026-10-18-m10-5-worker-scoped-compiled-text.md). Expo's supervising cache key includes the session token, invalidating ordinary caches. Shipping code/artifacts are restored; host gates and publication block remain unchanged.
