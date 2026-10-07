# M10.5 contract-derived `theme/token` public-surface review

**Recommendation: admit `@opsydyn/crumbs-css/theme/token` as an additive, opt-in alpha subpath.** This review records the admission decision; it does not add a package export or publish a release. Those changes belong to a separate implementation slice. Keep the broad `theme/core` and compatibility APIs intact.

## User progress and distinct capability

When a design-system team authors a simple native style map, it wants each token reference to retain the domain from its `createTokenContract` declaration, so TypeScript can reject color/length mismatches and values outside the selected React Native property's type. The current `theme/core` APIs resolve token styles, but the existing string-based token-reference constructor does not carry that contract-derived domain into the style property. The candidate adds that capability for leaf styles without requiring recipes, conditions, component contracts, or extensions.

This is more than a second route to the same theme hook: it adds contract-derived property compatibility and a smaller focused runtime boundary. The consumer chooses it explicitly by import path. Existing imports, behavior, and the default entrypoint remain unchanged.

## Evidence and limits

The private candidate derives the token's domain and value from the branded contract reference. Its type fixtures accept compatible color, length, opacity, and finite-enum tokens and reject seven unsafe or unsupported cases. Runtime tests cover contract ownership, missing values, malformed references, accessor rejection, flat-style limits, stable resolution reuse, and interoperability with existing theme providers across ESM and CommonJS.

Five candidate builds are byte-identical at 13,631 bytes ESM and 13,821 bytes CommonJS. Those are smaller than the current `theme/core` artifacts at 64,549 and 65,408 bytes. The comparison values of 17,271 and 17,641 bytes are not approved budgets for this subpath. The candidate package build, typecheck, packed export/declaration checks, and package suite pass (1,515 passed, one Node-22-only skip, zero failed); Storybook typecheck and 23 tests pass. Expo 56 web export includes the dogfood component across 914 Metro modules. This proves type/build and web-bundle integration, not native rendering or Hermes performance.

The official M10.5 host gate remains **11 pass, nine fail, and one incomplete**. The existing startup, warm-transform, and `theme/core`/compatibility graph failures are unchanged. The candidate has no approved entrypoint budget, no candidate-specific native iOS/Android runtime result, and no release-Hermes performance result. The accepted M10.5 budget policy remains in force: package-host, app-bundle, runtime, simulator/emulator, and physical-device evidence stay distinct. Physical-device acceptance remains deferred.

## Admission boundary

The proposed surface is intentionally limited to flat maps of native primitive values and direct contract-derived token references: `ThemeProvider`, `useTokenStyles`, `resolveTokenStyles`, `createTokenStyles`, and `themeToken`. It does not replace `theme/core` or add arrays, nested style groups, conditions, recipes, slots, component extensions, or a performance guarantee. Keep new consumer documentation out of the shipped API reference until the implementation slice exists.

The existing review rule against adding a narrow path solely to evade package-host checks is preserved. The reason to admit this path is the distinct type-safety capability for contract-derived token styles; its graph-size measurements are supporting diagnostic evidence only. Adding the path will not close M10.5 or waive, replace, or relabel any existing host metric.

## Next action and stop condition

Implement the additive path with package build/declaration wiring, export-map coverage, positive and negative type fixtures, runtime/provider interoperability checks, and matching consumer documentation. Then run the packed Expo consumer on available iOS Simulator and Android Emulator software contexts; keep physical-device work deferred. Preserve every current host limit and selector. Treat candidate graph bytes as diagnostic until a separate per-metric budget review is explicitly approved.

If the focused API cannot preserve existing provider interoperability and package isolation, or if native software-context checks reveal a behavioral mismatch, keep the subpath private and revise or withdraw the admission recommendation before publishing.

See the [contract-derived candidate evidence](../evidence/2026-10-07-m10-5-theme-token-contract-derived/README.md) and [accepted M10.5 runtime-budget policy](../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md).
