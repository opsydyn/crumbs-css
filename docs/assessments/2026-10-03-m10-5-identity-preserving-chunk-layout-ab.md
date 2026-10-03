# M10.5 identity-preserving compatibility-entry chunk-layout A/B

- Date: 2026-10-03
- Roadmap: M10.5
- Source revision: `693d77d`
- Status: single-entry candidate rejected; no production changes
- Machine-readable results: [qualification.json](../evidence/2026-10-03-m10-5-identity-chunk-ab/qualification.json)

## Question and method

The existing theme build emits five entrypoints together so the compatibility `theme` entry and focused feature paths share runtime module instances. A previous one-entry scratch build was faster and smaller, but it had not checked focused export compatibility or cross-entry identity. This paired experiment rebuilt the current five-entry layout and a one-entry `theme` layout from the same source revision with tsdown 0.21.10, Rolldown 1.0.0-rc.17, Node 22 target, ESM and CJS, minification off, and source maps off. Both builds used the package runtime dependency policy. The scratch build configuration did not modify the package build or generated distribution.

The compatibility export surface is identical at 39 keys in both formats. The current multi-entry build also preserves strict value identity across all 23 same-named compatibility/focused bindings in both formats. Retaining the original focused entries beside the single compatibility file keeps their export surfaces intact, but all 23 overlapping bindings then fail strict identity in ESM and CJS.

Re-exporting focused APIs from the one-file compatibility bundle preserves identity for `recipes` and `sprinkles`, but those focused graphs grow substantially. A compatibility-only facade cannot preserve the full focused `conditions` or `expressions` surfaces: `theme` does not export `traceNativeConditionBranches` or 22 expression APIs. Supplementing those names from their existing feature entries would still make each facade load the full compatibility graph.

## Graph and focused-entry results

| Format | Current multi-entry `theme` | One-file candidate | Change |
| --- | ---: | ---: | ---: |
| ESM | 164,751 B | 158,556 B | −6,195 B (−3.8%) |
| CJS | 172,447 B | 160,146 B | −12,301 B (−7.1%) |

The measured focused facade roots were:

| Format | Focused entry | Current graph | One-file facade graph | Increase |
| --- | --- | ---: | ---: | ---: |
| ESM | `theme/recipes` | 71,743 B | 158,764 B | +87,021 B (+121.3%) |
| ESM | `theme/sprinkles` | 12,464 B | 158,611 B | +146,147 B (+1,172.6%) |
| CJS | `theme/recipes` | 74,588 B | 160,599 B | +86,011 B (+115.3%) |
| CJS | `theme/sprinkles` | 13,893 B | 160,258 B | +146,365 B (+1,053.5%) |

These are paired scratch graph totals, not replacements for the admitted package graph-budget reports. The focused facade figures cover only `recipes` and `sprinkles`; the compatibility file lacks all the exports needed to stand alone as a `conditions` or `expressions` facade.

## Runtime initialization

The unchanged `probeBoundary` runtime probe measured one excluded warmup and 15 retained fresh processes per runtime and format. It excludes process startup, forces garbage collection before and after module evaluation, and checks a `resolveThemeTokens` result. All 128 warmup/sample probes passed their runtime receipt.

| Runtime and format | Current layout | One-file candidate | Change | Existing absolute limit | Candidate |
| --- | ---: | ---: | ---: | ---: | --- |
| Node 22.0.0 ESM | 7.978 ms | 6.339 ms | −20.5% | 7.553 ms | Below |
| Node 22.0.0 CJS | 4.473 ms | 3.907 ms | −12.7% | 4.083 ms | Below |
| Node 24.15.0 ESM | 4.251 ms | 3.217 ms | −24.3% | 3.067 ms | Above |
| Node 24.15.0 CJS | 3.288 ms | 2.749 ms | −16.4% | 2.444 ms | Above |

The timing deltas are diagnostic only: the candidate fails the focused-entry identity/API gates and still exceeds both Node 24 limits. They do not qualify the package or change any approved host result.

## Decision

Keep the current multi-entry layout. The single-entry graph improves compatibility initialization, but separating focused outputs breaks the established function-identity contract; routing focused exports through the compatibility bundle harms focused import costs and does not cover the complete focused APIs. No source, export map, build configuration, threshold, baseline, or workload was changed. M10.5 remains open, and `theme/core`, token graph, Metro/editor, visual, accessibility, and native-device gates remain separate. Android remains parked for the final device-specific roadmap work.

Next recommended roadmap slice: **M10.5 source-level runtime optimization** — reduce the measured resolver and component-contract costs while preserving the compatibility and focused export/identity contracts and all approved limits. Keep `theme/core` and token graph failures separate; Android remains last.
