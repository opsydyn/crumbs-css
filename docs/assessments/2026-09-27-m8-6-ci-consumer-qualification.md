# M8.6 reproducible CI and consumer qualification

M8.6 makes app changes subject to the repository's package and consumer gates.
The pull request workflow no longer excludes `apps/**`; docs-only changes remain
path-ignored. CI installs the complete workspace using `bun install
--frozen-lockfile` and no longer edits the root workspace manifest before
installing.

The CI job builds and typechecks the package, then runs `bun run test`. That
script runs the Crumbs package suite, including the pinned Expo SDK 56 / React
Native 0.85 contract and required-fixture regressions, plus the Storybook test
suite. CI also runs `bun run app:typecheck` and the packed Expo distribution
qualification. The latter installs the packed Crumbs, token, and component
artifacts into a separate app, typechecks it, and requires iOS and web bundle
maps with installed package provenance. Missing compiler fixtures or either
required platform map cause a failure. Android exports and device acceptance
remain parked.

The monorepo dependency graph is frozen by `bun.lock`. The packed Expo runner
creates a separate temporary npm lock and records resolved direct dependencies
and its hash in the M8.1 receipt. CI does not retain that temporary lock as an
artifact, so this gate does not claim identical transitive npm resolution
across different registry snapshots.

## Verification

- `bun test packages/css/test/ci-workflow-contract.test.ts` — 1 test passed, 8
  assertions. The test parses the workflow and checks its path, install, and
  consumer-gate contract; it was first run against the old workflow and failed
  because app changes were ignored.
- Focused compatibility and fixture suites — 37 tests passed, 110 assertions,
  including the locked Expo/RN version contract and missing compiler/iOS/web
  fixture failures.
- `bun install --frozen-lockfile --dry-run` — passed with all four workspaces
  present in the resolved install graph. The local Bun was 1.4.2; CI remains
  pinned to Bun 1.3.11. A live install was not run because this managed worktree
  uses dependency symlinks into the primary checkout.
- `bun run check` — passed: 901 package tests and 1 Storybook test, with build
  and typecheck steps successful.
- `bun run app:typecheck` — passed for the Storybook consumer.
- `bun run playground:distribution --check` — passed for packed artifacts and
  iOS/web Expo bundles with required source-map provenance. Android was not run.
- CI YAML parsing and `git diff --check` passed.

No GitHub-hosted workflow run or push occurred, so remote Actions execution has
not yet been observed. No dependency versions or support ranges were widened;
the current lockfile remains unchanged.
