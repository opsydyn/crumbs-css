# M8.5 release policy and developer preflight

M8.5 aligns release automation with the documented manual npm publication gate.
The current package version remains `0.1.1-alpha.1`. Release-please creates
version pull requests, tags and GitHub Releases without npm credentials or
publication steps. The dedicated workflow runs from `main` and accepts only a
published GitHub Release tag matching the package version and checked-out
commit. It requires `NPM_TOKEN`, a frozen Bun install, `release:check`, and npm
provenance. Prerelease channels use their first named identifier as the npm
dist-tag; stable versions use `latest`.

The package compatibility matrix now states that pre-1.0 alpha APIs and
artifacts may change between releases only with breaking-change release notes,
matrix updates, and migration guidance. After `1.0.0`, public APIs and
published artifact formats follow SemVer. Stable deprecations carry a
replacement and migration path for at least one minor release before removal
in a major release. The public compatibility page summarizes the same policy.

`bun run release:preflight --tag v<version>` lets a developer validate the
release tag, exact checked-out commit, and npm dist-tag locally without
publishing. Workflow contract tests assert the manual gate and ensure
release-please cannot publish.

## Verification

- `bun test packages/css/test/release-policy.test.ts`: 6 tests and 36
  assertions passed.
- `bun run typecheck`: passed.
- `bun run release:check`: passed, including package build, typecheck, tests,
  native-style benchmark, and npm pack dry run.
- `bun run docs:build`: passed; 20 pages built.
- Both modified workflow files parsed as YAML. The successful local preflight
  probe used an isolated temporary Git repository and tag; the existing
  `v0.1.1-alpha.1` tag was also correctly rejected against the later M8.5
  checkout.

The GitHub-hosted workflow, repository secrets, and registry publication were
not exercised. No package was published, package version or release tag was
changed, device test was run, or push was made.
