# M10.5 entrypoint package-group A/B

- Date: 2026-10-04
- Roadmap: M10.5
- Source revision measured: 0611321ca161d3bdb1dd7d4ad5d30cc1887d0b4d
- Status: diagnostic comparison; no production source, API, threshold, or baseline change
- Evidence: [qualification matrix](../evidence/2026-10-04-m10-5-package-group-ab/qualification.json)

## Result

No tested tsdown grouping both shares theme and theme/core runtime references and preserves the lean-core build contract. Keep the current split. The current package split also passes mixed Provider/hook rendering in the Node consumer, despite separate exported function references.

| Layout | theme/core graph ESM / CJS | theme graph ESM / CJS | theme/core shared refs | theme-to-focused-entry refs |
| --- | ---: | ---: | ---: | ---: |
| Current split | 64,549 / 65,408 B | 164,215 / 171,842 B | 0 / 21 | 23 / 23 |
| Pair theme + theme/core | 159,443 / 164,543 B | 160,442 / 165,984 B | 21 / 21 | 0 / 23 |
| Group all six theme entries | 131,044 / 138,518 B | 165,167 / 174,456 B | 21 / 21 | 23 / 23 |

The pair layout increases the theme/core graph by 94,894 B ESM and 99,135 B CJS. Grouping all six entries increases it by 66,495 B and 73,110 B. Both candidates fail the existing ESM and CJS assertions that theme/core remains independent of optional feature chunks. Their package build and declaration generation succeed; public runtime export names remain unchanged and all theme-entry declarations are byte-identical to the current build.

## Runtime behavior and initialization

The package-shaped probe resolves the published specifiers through package export maps and confirms consumer and package use the same React 19.2.3 peer. For each layout, all six mixed provider/hook combinations render the expected theme value under both Node 22.0.0 and Node 24.15.0. The current split therefore works for these tested Node SSR combinations even though 21 shared reference-valued exports differ between theme and theme/core. Crumbs uses a global Symbol registry for the theme store; the observed behavior is consistent with that shared runtime store, but does not prove Metro, Hermes, cross-realm, or multiple-React-copy behavior.

| Layout | Node 22 ESM / CJS | Node 24 ESM / CJS |
| --- | ---: | ---: |
| Current split | 8.143 / 4.854 ms | 4.579 / 3.611 ms |
| Pair theme + theme/core | 7.020 / 4.739 ms | 3.538 / 3.307 ms |
| Group all six theme entries | 7.957 / 4.918 ms | 4.574 / 3.457 ms |

Each result is one 15-process diagnostic cohort after one excluded warm-up. Existing initialization limits are 7.553/4.083 ms for Node 22 and 3.067/2.444 ms for Node 24. Only the pair's Node 22 ESM median is below its limit; every layout exceeds at least one limit. Do not treat this as timing qualification or change existing budgets from this cohort.

The current split's runtime-isolation and theme-runtime-resolver identity tests passed (50 tests, 180 expectations). Each grouping candidate passed 48 and failed two expectations, both the ESM/CJS lean-core independence assertions. The retained consumer probe and raw graph/init/identity records are linked from the qualification file.

## Decision and next slice

Retain the existing package grouping and do not promise exported function-reference identity across theme and theme/core based on this result. The tested provider/hook behavior is more useful evidence than reference equality, while the feature-independent core assertion remains a hard packaging constraint.

Next bounded roadmap slice: **M10.5 Expo/Metro mixed-entry interoperability qualification** — run the same provider/hook entry combinations through the internal Expo consumer and its actual Metro resolver, preserving package export conditions and a single React peer. Record bundle identity and render behavior. Treat a Metro bundle or Node render as host evidence; Expo runtime, Hermes, simulator/device, and Android acceptance remain separate, with Android last.
