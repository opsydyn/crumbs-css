# M8.1 separately packed design-system qualification

M8.1 qualifies the distribution boundary for a token package and a component package that consume Crumbs only through installed tarballs. The standalone Expo app installed three local npm artifacts from outside the monorepo, typechecked its public component usage, and exported production JavaScript bundles with source maps for iOS and web. Both source maps resolved the required files under the staged app's `node_modules`; the inventory rejects repository or external sources, missing files, symlinked packages, and authored `.css.ts` sources. A final review found and closed those three fail-open cases before acceptance.

## Artifact identity

The final qualification ran from source revision `390c0c1800949763c99cc987817143f6b52a430d` with a dirty working tree containing the final-review guard fixes. Exact package tarball hashes identify the tested artifacts. The retained app and package artifacts are under `/private/var/folders/wv/3m5dhh6x5pv9w0fbfzymldnw0000gn/T/crumbs-packed-distribution-FYtuGA`.

| Package | Version | SHA-256 |
| --- | --- | --- |
| `@opsydyn/crumbs-css` | `0.1.1-alpha.1` | `0e8a0ee9bdb4c6422d056fada912077c27e99b8841e0faa8ffd826c79fd3bc1c` |
| `@acme/design-tokens` | `1.0.0` | `51432cd6967e1c75d79f5cc0b58c424866e91df6bca41c97aa197c64184f8a78` |
| `@acme/ui` | `1.0.0` | `a18ec133f38faf76a32cd1d11235a3c918674972a84c2946d4d5168aeb73659c` |

The app used Expo `56.0.4`, React `19.2.5`, React Native `0.85.3`, React DOM `19.2.5`, React Native Web `0.21.2`, and TypeScript `6.0.3`. The complete resolved direct-dependency list and generated npm lockfile hash are retained in the [qualification receipt](../evidence/2026-09-26-m8-1-packed-design-system/qualification.json).

## Checks and evidence

`bun run playground:distribution --check` passed after the final-review fixes. It built and packed all three packages, installed them into a fresh temporary Expo app, verified package names, versions and materialized install paths, typechecked the app, and ran separate Expo production exports for iOS and web. Each platform produced one source map containing installed Crumbs, token and UI sources. The native map included `ActionCard.styles.native.js`; the web map included `ActionCard.styles.web.js`. Metro's web-only `__prelude__` identifier is treated as a virtual source and cannot satisfy package provenance. No Android export ran.

`bun test packages/css/test/packed-distribution-contract.test.ts` passed with 23 tests and 47 assertions. The suite covers package identity/path checks, same-root package symlinks, required style outputs, regular and indexed maps, Metro root-relative and virtual sources, external, missing, and directory paths, missing platform/package evidence, malformed maps, repository/worktree leakage, virtual URL leakage and authored stylesheet source leakage.

`bun run check` passed: the Crumbs build and typecheck passed, 864 CSS tests passed with 0 failures, and the Storybook test passed. The packed Expo check includes the staged consumer app typecheck.

The machine-readable hashes, resolved versions, installed package paths, map inventories, source revision and dirty status are in [`qualification.json`](../evidence/2026-09-26-m8-1-packed-design-system/qualification.json). `apps/playground/README.md` now distinguishes this three-package qualification from the existing single-Crumbs-tarball mode.

## Scope limits

This proves packed installation, TypeScript compatibility and JavaScript bundle provenance on the recorded Expo baseline. It does not prove native device rendering, startup, accessibility, device performance or Android support. No package was published. Android remains parked for the final native step.
