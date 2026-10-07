# M10.5 token-only React runtime feasibility

**Result: the graph-size screen passes; the prototype is not ready for public adoption.** A disposable `./theme/token` runtime fits below the existing `theme/core` graph ceilings while preserving the current `theme/core` output exactly. However, the prototype lets callers choose a token’s value type independently of the token contract, so its type safety is not yet strong enough for the design-system API.

## Candidate boundary

The scratch candidate exposes `ThemeProvider`, `useTokenStyles`, `resolveTokenStyles`, `createTokenStyles<TStyle>()`, and `themeToken<TValue>()` from a new `@opsydyn/crumbs-css/theme/token` path. It resolves flat style records containing string/number literals and direct token references. It rejects nested style objects, arrays, conditions, recipes, component recipes, and extensions. Runtime resolution checks token ownership for domain contracts, rejects missing values, and avoids executing accessor properties.

The candidate reuses the existing `Symbol.for("crumbs.css.theme-store-context.v1")` provider context. ESM and CJS render checks passed for both a `theme/core` provider with the candidate hook and the candidate provider with a `theme/core` hook. The path imports React as its only external and has no Effect runtime dependency.

## Graph screen

Five independent package builds emitted identical candidate hashes and sizes. The packed graph audit found one local artifact per format and React as the only external:

| Entry | Format | Candidate bytes | Existing ceiling | Headroom |
| --- | --- | ---: | ---: | ---: |
| `theme/token` | ESM | 13,176 | 17,271 | 4,095 |
| `theme/token` | CJS | 13,366 | 17,641 | 4,275 |
| Existing `theme/core` | ESM | 64,549 | 17,271 | -47,278 |
| Existing `theme/core` | CJS | 65,408 | 17,641 | -47,767 |

The existing `theme/core` ESM/CJS bytes and SHA-256 hashes match the retained M10.5 host report exactly. The candidate does not change that entrypoint or satisfy its failures. The ceilings above are used only as a feasibility comparison for the new path; no budget is admitted for `theme/token`. No startup-time or Expo/Hermes performance claim was measured.

## Type-contract gap

`createTokenStyles<TStyle>()` catches a token reference whose declared value type does not fit the selected style property. But `themeToken<TValue>(varName)` takes a plain string and lets its caller choose `TValue`. The compile fixture demonstrates that `themeToken<string>("--crumbs-space")` can be assigned to a color property even when that contract token resolves to a number. Runtime ownership does not establish the token’s TypeScript value type.

Before this becomes a public enterprise API, derive a reference’s value type from its actual typed token contract and check compatibility with the native style property. Keep untyped legacy contracts explicit rather than silently asserting a value type. Expo/Storybook dogfooding should then verify the consumer ergonomics and practical path before package admission.

## Qualification boundary

The scratch package build, typecheck, packed export/declaration checks, cross-entry provider tests, and full package suite passed: 1,514 tests passed, one Node-22-only test was skipped, and none failed. The five-build graph packet is reproducible from the recorded base revision and candidate patch.

This is not a new M10.5 host qualification. The current official result remains **11 pass, nine fail, one incomplete**; the four initialization failures, warm-transform failure, and four existing theme graph failures remain open. No product source, API, dependency, baseline, ceiling, or enforcement rule changed. Metro/Expo consumer qualification and physical-device acceptance remain unperformed for this candidate; physical-device work stays deferred.

See the [evidence packet](../evidence/2026-10-07-m10-5-theme-token-only/README.md), five-build measurements, and exact encoded [scratch candidate patch](../evidence/2026-10-07-m10-5-theme-token-only/repro/theme-token-only-candidate.patch.b64).
