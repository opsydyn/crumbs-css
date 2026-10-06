# M10.5 startup and emitted-graph feasibility

- Date: 2026-10-06
- Roadmap: M10.5
- Status: design assessment; no production candidate selected
- Constraints: preserve current synchronous public APIs; no threshold or baseline changes

## Recommendation

Do not repeat static module extraction, enable package-wide minification, or add deferred loading as the next production optimization. The rejected extraction preserved the contracts but slightly increased every theme graph and showed no paired first-use improvement. The tested minified build reduced graph size substantially, but still failed every theme graph ceiling and all four startup ceilings. No measured, non-breaking candidate currently has a credible path to the approved limits.

Keep the current APIs and limits unchanged while resolving whether these historical Node/package-graph limits remain the right product gate for the expanded API. The Node import measurements do not establish React Native or Hermes startup impact. A future target change needs separate, representative Expo consumer evidence and explicit approval.

## User progress and evidence

When a React Native team imports Crumbs for a screen, it needs predictable bundle contribution and fast first use while retaining the synchronous token, recipe, and component contracts it already consumes. The current alternative is to use the compatibility `theme` or `theme/core` entry; both still exceed their approved package-graph ceilings. The dogfood Expo app can provide consumer-shaped bundle evidence, but the candidate Expo bundle was not archived, and candidate Metro/native checks did not run after the host gate rejected it.

The unchanged host comparison for the static-boundary candidate reports 11 passes, 9 failures, and one Expo environment mismatch. All four startup metrics, warm full-transform, and all four theme graph metrics fail. The comparison is [retained with its raw reports](../evidence/2026-10-06-m10-5-runtime-boundary/host-budgets/comparison.json).

| Host startup workload | Historical median | Candidate median | Result |
| --- | ---: | ---: | --- |
| Node 22 ESM | 6.294 ms | 8.599 ms | Fail |
| Node 22 CJS | 3.402 ms | 5.209 ms | Fail |
| Node 24 ESM | 2.556 ms | 4.732 ms | Fail |
| Node 24 CJS | 2.037 ms | 3.646 ms | Fail |

These startup samples import the compatibility `theme` artifact. The Node timings include package module evaluation but exclude process startup; they do not measure Hermes, Metro, native rendering, or first screen paint.

| Emitted graph | Approved absolute maximum | Control | Static-boundary candidate |
| --- | ---: | ---: | ---: |
| `theme/core` ESM | 17,271 B | 64,549 B | 64,899 B |
| `theme/core` CJS | 17,641 B | 65,408 B | 65,747 B |
| `theme` ESM | 44,017 B | 164,215 B | 164,730 B |
| `theme` CJS | 44,764 B | 171,842 B | 172,137 B |

The candidate added 295–515 B per graph. Its 240 paired import-plus-first-use samples across 16 runtime/format/scenario cohorts stayed within control spread, so they established neither a regression beyond that spread nor a qualifying improvement. The results and source archive are in the [candidate evidence archive](../evidence/2026-10-06-m10-5-runtime-boundary/README.md).

Earlier package-wide minification is also insufficient: it left `theme/core` at 35,294/35,515 B and compatibility `theme` at 87,082/89,799 B for ESM/CJS, all above their unchanged limits. Its four startup metrics also failed. See the [minification qualification](../evidence/2026-10-02-m10-5-minification/qualification.md).

## Semantic and initialization attribution

The current entrypoints' reachable behavior explains why simply moving source into smaller files does not shrink the emitted graphs:

| Cost | Current owner and contract | Feasibility under the no-breaking-change constraint |
| --- | --- | --- |
| Generic token/style dispatch | `resolveThemeTokens` and `resolveThemeStyles` in `theme-runtime.ts` handle ordinary styles and arrays, recipes, sprinkles maps, component recipe versions 1/2/3, and extension version 1. They synchronously validate and recurse through descriptor slots. | The validators and nested dispatch are mandatory dependencies of the existing generic resolver. Dropping them or deferring them behind an asynchronous loader changes the current contract. |
| Compatibility feature surface | `theme` exposes conditions, expressions, recipe/sprinkles resolvers, token scopes, dependency planning, React integration, and generic resolution. The candidate ESM graph contains six reachable files; its recipe-resolver chunk is 65,931 B, entry 46,079 B, expressions 25,762 B, and conditions 14,671 B. | The static compatibility entry exposes these synchronous functions. Renaming or splitting source files does not remove their reachable output. A narrower additive entry might help new consumers, but cannot make the existing `theme` gate pass. |
| Module-evaluation state | `theme-runtime.ts` initializes shared React contexts and the symbol-registered resolution `WeakMap` at module scope. Token-scope context serves compatibility APIs; theme-store context and resolution cache support the common provider/resolver path. | Lazy construction could move work to the first provider/resolution call, but does not remove emitted code. The paired import-plus-first-use diagnostic showed no improvement for the attempted extraction. Context identity, import order, and first-use cost would need to remain characterized. |

The earlier ESM source-map attribution located substantial payload in the theme runtime, component and extension validators, and conditions; those spans are directional source-family estimates, not exact deltas against the historical baseline. The latest graph report records exact emitted file sizes and hashes but does not contain fresh per-source maps. The earlier profile sampled only six Crumbs frames across 512 retained CPU samples, too sparsely to assign the startup gap to a function. See the [source-profile assessment](2026-10-02-m10-5-source-profile.md) and [graph triage](2026-10-03-m10-5-runtime-budget-failure-triage.md).

## Candidate review

| Candidate | Evidence | Disposition |
| --- | --- | --- |
| Extract state and resolution owners into static modules | The full candidate preserved exports, descriptor validation, focused binding identity, mixed-entry provider/hook behavior, and isolation. Every theme graph grew slightly; startup still failed; paired first-use was neutral within control spread. | Rejected for production. |
| Minify theme output | Actual package-shaped minified output cut the theme graphs by roughly half, but remained about twice each approved limit and retained all four startup failures. | Insufficient by itself. |
| Dynamically defer synchronous features | Dynamic imports would change synchronous calls or shift cost into first use. Retaining the synchronous implementation in the reachable package graph does not close the size gap. | Not an admissible candidate under current API constraints. |
| Remove component/extension validation from generic resolution | Current public descriptor versions rely on these validators, and existing malformed-input, identity, and error behavior is characterized. | Breaking change; excluded. |

The current graphs are about 3.7 times the old `theme/core` and `theme` limits. Meeting them would require roughly a 73% reduction from the current unminified graphs. Even the tested minified graphs remain roughly twice the limits. This does not prove that every future representation is impossible; it does show that another source-file extraction or minification pass lacks an evidence-backed route to qualification.

Warm full-transform remains a separate failed compiler metric, and the Metro comparison remains incomplete because its Expo baseline and current environment differ. Neither is explained or repaired by theme-runtime attribution. Physical-device, spoken-reader, and exhaustive native acceptance remain separate; physical-device work is deferred.

## Next decision

The next bounded item should decide how M10.5 treats these limits alongside the current synchronous API and the React Native product target. The review should compare:

1. Keep the existing APIs and limits binding, leaving the performance gate open until a materially different candidate is evidenced.
2. Keep existing APIs and add a separately measured, additive narrow entry for consumers with a demonstrated common-case need; this would not pass the current `theme` or `theme/core` limits.
3. Keep existing APIs and define replacement performance targets only after measuring representative Expo/Hermes consumer bundles and startup, preserving the current results as historical evidence.

Breaking removal of descriptor behavior is out of scope. Do not alter current limits before the decision is reviewed. Recommended next slice: **M10.5 runtime-budget and public-API policy ADR**, scoped to preserving compatibility and deciding whether a dogfood Expo/Hermes measurement should precede any target revision. The ADR intent summary must be confirmed before drafting.
