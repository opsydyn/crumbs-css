# M9.3 Development Style Explanations Assessment

**Disposition:** M9.3 is qualified for its checked-in fixture, package exports, and available host matrix. Android and physical-device acceptance remain not-run and parked.

## Delivered behavior

The dedicated `@opsydyn/crumbs-css/devtools` entrypoint exposes the typed `explainStyle` API and report types. Compiler provenance is emitted in a versioned `__crumbsDev` sidecar by default for development transforms; production omits it unless `includeStyleExplanations: true` is explicitly set. The ordinary theme, styling, and root entrypoints remain separate from the Effect 4 Schema-backed devtools implementation.

The checked-in fixture report demonstrates a final `opacity` winner of `0.8` over an overridden `0.25`, expansion of `paddingHorizontal` to physical left/right declarations, token identity and resolved values, and a plan-derived transition from token value `8` to `16` affecting the explicit `card` export. It uses package-relative module and source identities and canonical JSON. The report and fixture digests are recorded in the [qualification receipt](../evidence/2026-09-27-m9-3-style-explanations/qualification.json).

## Qualification evidence

- `bun run check` passed: package build and TypeScript checks passed; the CSS suite reported 1,014 tests and 43,403 expectations across 165 files, and Storybook reported 1 test and 7 expectations.
- `bun run docs:build` passed with 22 generated pages, including the new [style explanation guide](../src/content/docs/how-to/explain-native-styles.mdx).
- `bun scripts/m9-3-style-explanations-qualification.ts` generated deterministic canonical report and fixture hashes with complete coverage for this fixture and no absolute paths or timestamps.
- `bun run playground:distribution --m8-3-check` passed for 15 packed export targets and 29 runtime graphs. Packed consumer type checking, production iOS/web exports, and paired tree-shaking checks passed. Android was not-run.
- The focused M9.3 and packed-runtime tests and `git diff --check` passed; exact results are retained in the receipt.

## Limits

`explainStyle` analyzes only the supplied compiled module, export path, and current/previous snapshots. Transition and affected-path results are derived from the compiler's dependency and resolution plans; they are not observations of a React render, runtime cache behavior, UI update, or device state. Complete coverage describes the captured metadata for this fixture and does not establish complete provenance for every possible consumer module or value.

The Expo distribution checks provide packed production export evidence on iOS and web. No Android toolchain, Android consumer run, physical device, native visual review, accessibility acceptance, publication, or release was performed or claimed. The separate diagnostic benchmark is not a performance gate.

## Result

M9.3's implementation, deterministic fixture evidence, documentation, focused tests, package isolation, and available iOS/web distribution checks meet the planned exit criteria. M9.4 remains the next unstarted roadmap item: versioned policy presets and incremental adoption.
