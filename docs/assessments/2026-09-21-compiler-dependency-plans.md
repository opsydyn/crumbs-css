# M4.2 compiler dependency plans

Date: 2026-09-21
Status: implemented and locally qualified
Scope: versioned per-export token dependency plans and a pure selective
runtime resolver with recomputation and output-invalidation receipts.

## Emitted plan

Generated native modules now emit `__crumbsModule` version 2. The descriptor
retains the sorted surviving token list and adds a frozen version-1
`dependencyPlan`. Each entry contains a canonical export path and the token
variables required by that style leaf. The compiler derives entries from the
final class styles after composition and lowering, so overridden declarations
do not create false dependencies. Style-variant leaves, recipe bases, variant
branches and compound styles retain separate paths.

The plan is immutable, sorted and deduplicated. Its internal descriptor remains
compiler metadata; it is not an external artifact envelope or a React
subscription protocol. The native module descriptor version changes from 1 to 2
because the generated shape has changed.

## Selective resolver

`createThemeDependencyResolver(styles, dependencyPlan)` builds a stateful pure
resolver for one immutable style module. The first transition resolves all
planned token paths. Later transitions compare the active contract identity and
only token names declared by the plan, resolve the affected paths, and preserve
the previous output references for unaffected paths. A missing path or
unsupported plan version fails closed.

Each transition returns `recomputations`, `notifications` and `changedTokens`.
`recomputations` counts planned output paths evaluated for that transition;
`notifications` counts affected paths whose resolved value changed and therefore
would be candidates for a future consumer invalidation. It does not count React
renders, native frames or actual subscriptions. M4.4 owns consistent
dependency-aware subscriptions.

The resolver treats mutation as outside the contract. A new theme object with
the same contract and identical declared values can preserve all output
references, while a changed token only affects the entries that declare it. The
generated path shape must match the runtime export object.

## Qualification

- Canonical plan tests cover duplicate-path merging, token sorting and frozen
  nested data.
- Compiler emission tests cover style-variant paths, recipe base/branch paths,
  descriptor versioning and frozen generated metadata.
- Runtime tests cover first resolution, same-snapshot reuse, unrelated-token
  updates, affected-path recomputation, notification receipts, structural
  sharing, missing paths and emitted-plan integration.
- Package typechecking and the focused compiler/runtime/public API tests pass at
  this stage; full package and documentation gates remain required before the
  commit.

No device evidence, subscription acceptance, publication or push occurred.
Protected release/version edits remain outside this slice.
