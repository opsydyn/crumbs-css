# M10.5 focused ThemeProvider and hook entrypoint

- Date: 2026-10-07
- Roadmap: M10.5
- Status: scratch candidate rejected as a host-budget remediation
- Constraints: preserve existing exports and semantics; leave approved host budgets unchanged

## Decision

Do not promote the additive `@opsydyn/crumbs-css/theme/react` entrypoint as the M10.5 runtime-graph remedy. A narrow re-export of `ThemeProvider`, `useTheme`, `useThemeSelector`, `useThemedStyle`, and `useThemedStyles` trims 21.9% of ESM graph bytes and 22.6% of CJS graph bytes from `theme/core`, but its graphs remain about 2.9 times their approved maxima. The existing `theme/core` graph remains byte-identical to the official current-source artifact, so this candidate does not repair any binding metric.

The small import-only initialization improvements are exploratory and noisy: all four core/candidate sample ranges overlap. The candidate compatibility `theme` graph matches the approved artifact hashes and byte counts exactly, so the official initialization entrypoint is unchanged. This is not a demonstrated initialization fix.

## Candidate and checks

The disposable candidate adds `./theme/react` as an additive subpath with ESM, CJS, and declaration exports. It leaves `./theme/core`, `./theme`, their declarations, and all implementation files unchanged. `theme/react` simply re-exports the focused provider and hook symbols from the existing `theme-runtime` module; it does not extract or simplify their implementation.

The package build and declaration build passed. A temporary package consumer type-check passed for `ThemeProvider`, `useThemedStyles`, and `ResolvedThemeStyles`; `bun pm pack --dry-run` included the candidate runtime and declarations. A React server-render smoke check passed in both directions: a provider from `theme/core` with hooks from `theme/react`, and a provider from `theme/react` with hooks from `theme/core`. The smoke harness explicitly resolves both builds to one React peer instance, as a React application must.

Five deterministic scans reported one local artifact per format and React as the only external. Both existing `theme/core` and compatibility `theme` graphs match the official host-budget packet exactly. The focused graph is still 50,416 bytes ESM and 50,620 bytes CJS, against unchanged maxima of 17,271 and 17,641 bytes.

The import-only 15-process medians improved between the existing core entry and the candidate by 3.5–7.4% across Node 22/24 and ESM/CJS. The measurement ranges overlap in every cell. These are not the official initialization workload or a qualification result.

## Scope and next slice

No production API, implementation, dependency, baseline, threshold, or enforcement rule changed. The complete M10.5 host result remains 11 pass, nine fail, and one incomplete; physical-device work remains deferred. Full package tests and Metro qualification were not repeated because the candidate missed the deterministic graph gate by a wide margin.

See the [evidence and reproduction packet](../evidence/2026-10-07-m10-5-theme-react-entrypoint/README.md), including raw samples and the exact scratch patch.

**Next recommended roadmap slice: M10.5 — assess whether a separately typed token-only React runtime can shed recipe, component-contract, and extension-validation code without weakening the existing `theme/core` behavior.** Keep the current entrypoints and budgets binding; stop at a design/cost screen if a specialized additive API cannot plausibly fit the current graph ceiling.
