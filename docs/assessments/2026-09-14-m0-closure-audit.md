# M0 regression and composition closure audit — 2026-09-14

Audited source revision: `b23ee66`. The working-tree release manifest/package version and lockfile edits predate this audit and are excluded. The original [assessment](2026-09-06-design-system-assessment.md) is historical; this document records current verification and the limits of promotion.

## Decision

Close **M0.1**, the durable regression task for the original E1–E7 counterexamples. Keep **M0.2 open**: direct generic `NativeStyle` references still fail public authoring typechecks. M0 as a whole remains in progress; M0.9 native Android acceptance remains deferred by the user. M1 Effect contracts are not started by this audit.

Each original failure is covered by committed value/error assertions, rather than generated-code substrings alone. Before-fix failures below come from the historical slice execution records; this audit reruns current qualification, not all historical builds. Closure of the original counterexamples is narrower than accepting every React Native property, composition form, package identity or device journey.

## Original counterexamples and retained evidence

| Finding | Current regression and expected behavior | Repair and before-fix evidence | Qualification boundary |
| --- | --- | --- | --- |
| E1 composition types/order | `native-style-types.ts` accepts base/override arrays; `native-composition.test.ts` asserts later conflicting color, multiple/nested/repeated bases and winning token values against independent models. | `2129e50`; [composition execution](../roadmap.md#2026-09-14--ordered-native-composition-first-m02-slice): four regressions plus positive composition typechecks failed before repair. | Original array counterexample repaired. Direct generic reference gap remains below. Direct upstream vanilla-extract compositions retain upstream semantics. |
| E2 transforms/shadowOffset | `structured-compiler.test.ts` checks actual ordered transform arrays, numeric shadow offsets and scalar siblings, imported bases, helpers/variants/recipes, both emitters and whole-value replacement properties. `native-style-types.ts` admits the supported static subset. | `5ed3af3`; [structured compiler execution](../roadmap.md#2026-09-14--static-structured-compiler-compatibility): all five initial authored-input regressions failed before repair. | Static documented subset only. Unsupported structured values and animated authoring fail explicitly; raw runtime native values are separate. |
| E3 nested runtime corruption | `structured-runtime.test.ts` preserves transform array shape/order/reference, scalar siblings, input immutability, structured-only values and genuine tagged/legacy variant maps; `structured-runtime-types.ts` checks primitive results. | `0835497`; [structured runtime execution](../roadmap.md#2026-09-14--structured-runtime-resolution-and-primitive-result-types): four initial runtime and eight primitive result-type regressions failed. | Nested runtime values remain opaque. Ambiguous unmarked maps prefer native style shapes; symbol map identity does not survive JSON. |
| E4 eager compiler imports | `runtime-isolation.test.ts` verifies both emitted runtime graphs and CommonJS import denial while resolving real tokens. `runtime-bundle-contract.test.ts` rejects compiler dependencies, missing maps and wrong platform evidence. | `06dda18`; three old-build graph/denial regressions failed. [Packed/workspace qualification](../evidence/2026-09-14-runtime-isolation/qualification.json). | Runtime `/theme` boundary only; root/style/Metro/compiler are build-time imports. Bundle isolation is separate from initialization/device performance. |
| E5 token validation/order | `css-to-rn.test.ts` rejects the exact transition-token case with context and checks both same-field token/literal directions. `theme-token-admission.test.ts` tests property parity, exact reference shape, own lookup and non-execution of accessors. | First token admission/order slice and `a27b316`; [token execution plan](../superpowers/plans/2026-09-14-m0-token-declarations.md), [reference execution](../roadmap.md#2026-09-14--exact-native-token-reference-admission) retain red cases. | Shape/property admission only. Token domains/provider association remain M3; complete schemas are M1. |
| E6 cross-contract rebinding | `theme-contract-ownership.test.ts` rejects sanitized flat/nested collisions while preserving original metadata, checks atomic failure, frozen paths, exact-path reuse, imported contracts and shrinking collisions. | `d6a5c82`; four initial ownership regressions failed. [Ownership execution](../roadmap.md#2026-09-14--atomic-legacy-token-ownership). | Exact raw-path ownership is local to an authoring instance/compiled graph; distinct providers/package copies need M3 identity. |
| E7 ordinary string loss | `ordinary-exports.test.ts` preserves named primitive strings/empty strings/data/undefined/negative zero and ordinary tag-shaped records, and rejects unsupported data with coded file/export-path diagnostics. | `ab72f6b`; all four initial export regressions failed. [Export execution](../roadmap.md#2026-09-14--ordinary-named-export-contract). | Dense data subset only. Shared identity/descriptors and legacy ordinary strings equal to registered handles remain outside the contract. |

Test paths in the table are under `packages/css/test/`. The named historical anchors are execution records, not a claim that historical logs were rerun today. Required compiler fixtures no longer silently skip: [M0.8 qualification](../evidence/2026-09-14-durable-fixtures/qualification.json) includes actual missing-file test/benchmark controls.

## M0.2 completed contracts and remaining gap

Independent reference suites now cover ordered base graphs, physical spacing/axes/gap, widths/colors, radii, numeric native flex, spacing aliases and inset aliases. They run reproducible shrinking declaration and compiled-composition properties. Supported literal/token output competes on canonical fields before merging. The side-border admission suite aligns unsupported compound/style fields with types and actionable diagnostics. Alpha migration requirements are recorded in [compatibility](../../packages/css/COMPATIBILITY.md).

Public typechecking of the [retained reproducer](../evidence/2026-09-14-m0-closure-audit/direct-native-reference.css.ts) exits 2 with two errors: `style(generic)` and `styleVariants({ direct: generic })` reject the `NativeStyle` returned by `style({ opacity: 0.5 })`. Array-wrapped `style([generic])` and the array variant entry are accepted. This is a reference/type admission defect, not evidence that the authored opacity value or transpiled compiler output is invalid. There are no casts, ignored diagnostics or `@ts-expect-error` directives in the reproducer. It deliberately remains outside the package test/typecheck glob so it can retain the failure without pretending the gate is green.

Command from the repository root:

```sh
./node_modules/.bin/tsgo --noEmit --strict --skipLibCheck --module preserve --moduleResolution bundler --target es2022 docs/evidence/2026-09-14-m0-closure-audit/direct-native-reference.css.ts
```

Until repaired, wrap generic references in arrays. Complete primitive View/Text/Image direct references have existing positive tests; literal-only/widened legacy results, mixed-reference unions, recursive aliases and static inline negative contracts must remain intact during the repair. M0.2 cannot close on a green package suite that omits this positive direct-reference contract.

## Current qualification and deferred assurance

[Machine-readable qualification](../evidence/2026-09-14-m0-closure-audit/qualification.json) records current package build/typechecking/tests, consumer results, source revision and the known failing probe. Current package qualification passes 235 tests / 8,573 assertions across 35 files. Storybook and workspace consumer typechecking, fresh iOS/Android/web JavaScript exports and runtime maps, and the 20-page docs build are checked separately. Packed Metro qualification refreshes the current local tarball in the retained isolated npm Expo consumer; its existing SDK dependency installation is reused, so this is not a fresh dependency-bootstrap qualification.

These gates do not qualify native layout, device RTL, release Hermes measurements, editor budgets, accessible journeys, release publication or Android native acceptance. Android remains last. Historical iOS Maestro evidence is retained separately and was not rerun. E8 domains/provider association, E9 optimization, E10 honest measurement and the broader E11 CI/distribution/release-policy work remain owned by later roadmap tasks.

Next bounded slice: repair direct generic NativeStyle reference typing with positive package/packed Node16/Bundler contracts and both-emitter regressions, preserving existing inline negatives. Then rerun M0.2 closure review. Begin only after user approval.
