# Single fresh whole-slice review — M11.5

Reviewer: gpt-6-astra, fresh context, read-only, no delegated review. Source digest `e79b7d3f945d4d1d2146c08cc9f1ab86fc516daeff68030efc989040ea1059df`, planning HEAD `ed6c499`.

## Strengths

- Type-only authoring preserves factory arguments/component props and rejects invalid witnesses and union/excess configs.
- Descriptor admission uses data properties, immutable copies and independent compiler validation; aliases remain distinct from separate calls.
- Reconstruction occurs at module scope; controls/theme/interaction/lifetime proof is separate from release performance.
- Independently verified all 77 authored files, 1,961 evidence files and 2,171 integrity bindings; saved diff exactly reproduces against planning HEAD.
- Independent package TypeScript and nine authoring/admission tests passed. Current initial/increased-font iOS/Android images inspected. Native/export/budget workloads were not rerun.

## Critical

None.

## Important

1. **Depth-32 accepted arguments fail capture** — `packages/css/src/compiler/runtime-extension-data.ts:7` checks depth before distinguishing leaves/containers. Verified 32 arrays wrapping null: authoring passes, capture throws compatibility resource-limit; 31 passes. Move container-depth check after leaves, retain visited accounting; cover depth32 capture/emission acceptance and depth33 rejection.
2. **ESM reexports bypass CJS named-link proof** — `packages/css/src/compiler/runtime-extension-linkage.ts:204` validates CJS only when the resolved endpoint itself is CJS. Verified facade.mjs `export { missing as make } from './actual.cjs'`, where actual.cjs only exports other: both probes pass, genuine Node24.15.0 import throws missing-name SyntaxError. Validate the chain or conservatively reject unverifiable ESM-to-CJS edges; avoid adding an optional parser peer to the compiler.
3. **Receipts can bind the wrong consumer target** — linkage lines166/175. Verified legacy main `./runtime`: runtime.js exports make/runtime.ios.js only other; esbuild proves runtime.js, actual Metro0.87.1 selects runtime.ios.js. Also probe's added ios condition selects react-native.ios while Expo56 selects default; probe's development branch exports make while genuine Node24.15.0 selects default/other and fails. Use actual supported conditions/main fields/platform resolution, or fail closed on ambiguity. Missing shadow candidates must remain receipts so later creation invalidates proof. Existing conditional-export test line41 reinforced incorrect ios assumptions.

## Minor

4. **Later compiler failures lose compatibility diagnostic/location** — `packages/css/src/transformer.ts:527`. Capture wraps failures, lowering/linkage do not. Verified nonexistent runtime package transformation returns bare ExtensionError/unresolved-import without stylesheet/export location or CRUMBS_CSS_UNSUPPORTED_EXPORT. Compilation fails correctly but classification/context is lost. Normalise at public compiler boundary, retaining inner reason.

## Recommendations

Fix the three Important findings in the authorised single repair pass with RED/GREEN tests and refreshed bindings. Keep unchanged warm/incremental failures under M10.5; no waiver or optimisation requested.

## Declined to judge

- Physical/spoken-reader/browser/live-authored-HMR/release-FPS acceptance: explicitly deferred scope.
- Release/publication readiness and existing M10.5 failures: separate work.
- Arbitrary Proxy/unrelated-realm behaviour and arbitrary runtime-factory purity: outside protocol contract.
- Final dependency restoration and commit integrity: intentionally pending after this review.

## Verdict

**Ready to merge: No, before repairs.** Core API/identity/reference workflow are sound; depth and static linkage gaps require repair before reliable advertised behaviour. Authoring hashes stayed unchanged throughout the review. This is the review of the pre-repair cohort, not a second review or final-artifact waiver.
