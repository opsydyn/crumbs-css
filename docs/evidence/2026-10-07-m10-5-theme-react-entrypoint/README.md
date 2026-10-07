# M10.5 focused theme React entrypoint

This packet records a scratch-only test of an additive `./theme/react` subpath. It exports `ThemeProvider`, `useTheme`, `useThemeSelector`, `useThemedStyle`, `useThemedStyles`, and the `ResolvedThemeStyles` type from the current `theme-runtime` implementation. The existing `./theme/core` entrypoint remains untouched.

## Result

The candidate is rejected as a remedy for the approved M10.5 graph budgets. The existing `theme/core` outputs match the official current-source artifacts byte-for-byte; the new path reduces the standalone graph but remains far over its inherited target.

| Entry | Format | Current `theme/core` | Focused candidate | Approved maximum | Reduction | Candidate result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `theme/core` / `theme/react` | ESM | 64,549 B | 50,416 B | 17,271 B | 21.9% | Fail |
| `theme/core` / `theme/react` | CJS | 65,408 B | 50,620 B | 17,641 B | 22.6% | Fail |

The candidate is 2.92× the ESM maximum and 2.87× the CJS maximum. Both existing `theme/core` and compatibility `theme` graph artifacts match the official host gate byte-for-byte, so all four theme-graph failures remain and the official initialization entry is unchanged.

The import-only, fresh-process medians show modest changes from `theme/core` to `theme/react`:

| Runtime / format | `theme/core` | `theme/react` | Median change |
| --- | ---: | ---: | ---: |
| Node 22 ESM | 8.336 ms | 8.042 ms | −3.5% |
| Node 22 CJS | 3.520 ms | 3.336 ms | −5.2% |
| Node 24 ESM | 2.769 ms | 2.635 ms | −4.8% |
| Node 24 CJS | 2.236 ms | 2.071 ms | −7.4% |

All sample ranges overlap. These measurements are an exploratory entrypoint comparison, not the official compatibility-theme initialization gate.

## Qualification

- Candidate package build and declaration build passed.
- Package type-check passed with the temporary consumer fixture in `packages/css/test`.
- React server-render smoke passed in both directions across the focused and legacy entries, with one shared React peer instance.
- `bun pm pack --dry-run` included `theme-react.mjs`, `theme-react.cjs`, and their declaration files.
- Five graph scans were deterministic. Each graph contains one local artifact, has React as its only external, and has zero nonliteral loads.
- Full package tests, Metro qualification, device work, and the full host matrix were not run against this candidate because the graph candidate failed its deterministic threshold screen.

The full raw graph and process samples are in [theme-react-measurements.json](theme-react-measurements.json). The [scratch candidate patch](repro/theme-react-candidate.patch) changes only the package export map, build entry list, and one new re-export module. The reproduction scripts and type fixture are in [repro](repro/).

## Reproduction

Apply the patch only in a disposable checkout at the recorded base revision, install its frozen dependencies, and build the package:

```sh
git apply --check --unidiff-zero docs/evidence/2026-10-07-m10-5-theme-react-entrypoint/repro/theme-react-candidate.patch
git apply --unidiff-zero docs/evidence/2026-10-07-m10-5-theme-react-entrypoint/repro/theme-react-candidate.patch
bun install --frozen-lockfile
bun run --filter @opsydyn/crumbs-css build
```

Copy `repro/theme-react-entrypoint-consumer.ts` temporarily into `packages/css/test/`, then run the package type-check. For the graph and initialization matrix, set `CRUMBS_AUDIT_NODE_FLOOR` and `CRUMBS_AUDIT_NODE_CURRENT` to the exact Node 22.0.0 and Node 24.15.0 executables recorded in the raw JSON, then run `bun docs/evidence/2026-10-07-m10-5-theme-react-entrypoint/repro/measure-theme-react.ts`. Run `node docs/evidence/2026-10-07-m10-5-theme-react-entrypoint/repro/cross-entrypoint-smoke.mjs` with the package and application resolving to one React peer instance.

The tested base source revision was `897f372`; its product-source content digest is `23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd`. The existing core artifact hashes also match the official [final host-budget report](../2026-10-07-m10-5-final-host-budget-gate/README.md).
