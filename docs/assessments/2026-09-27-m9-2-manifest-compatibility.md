# M9.2 manifest compatibility qualification

**Status:** Qualified; M9.2 complete

**Date:** 2026-09-27

**Roadmap:** [M9.2](../roadmap.md)

**Specification:** [M9.2 manifest compatibility design](../superpowers/specs/2026-09-27-m9-2-manifest-compatibility-design.md)

**Receipt and report:** [qualification-v1.json](../evidence/2026-09-27-m9-2-manifest-compatibility/qualification-v1.json), [manifest-compatibility-report-v1.json](../evidence/2026-09-27-m9-2-manifest-compatibility/manifest-compatibility-report-v1.json)

## Result

M9.2 adds local, explicit-file checking and comparison through
`bun run manifest:check`. Check mode reports supplied consumer edges that
target private provider tokens. Compare mode reports public token and component
contract changes between a baseline and current manifest. Consumers are
attached only when explicitly supplied and when their external dependency
edges carry stable target IDs. The tool does not scan the repository, infer
omitted consumers, calculate SemVer, or make a release decision.

The schema-v1 report API is exported only from
`@opsydyn/crumbs-css/tooling/manifest`. Packed ESM, CommonJS, and declarations
were qualified; ordinary package runtime entries remain isolated from this
tooling API.

## Qualification evidence

| M9.2 acceptance item | Evidence |
| --- | --- |
| Detect declared public token and component contract changes | Compare fixture reports removal of `color.legacy`, a `color.surface` domain change, and a changed Button default. The first two are errors; the default change is a warning. |
| Check private dependencies and identify statically known consumers | Check mode reports the explicit web-app edge to private `space.internal`. Compare mode attributes the changed/removed token edges to the supplied mobile app and the private edge to the supplied web app. No component consumer is invented. |
| State coverage and analysis limits | Both modes report `explicit-coverage` and `component-use-unavailable`. Manifest v1 does not record consumer use of component slots or variants. Consumer attribution applies only to supplied manifests and proven stable token edges. |
| Keep the public boundary tooling-only | The packed comparison API resolves in ESM, CommonJS, and typed Node/Bundler consumers from the tooling subpath. The package build and runtime-graph checks passed; no schema runtime export was added to ordinary app entrypoints. |
| Keep reports reproducible and machine-local data out | The checked-in report SHA-256 is `00b4a7b1233b70c007505bc663480e2ffc86ae8d9947116668ca115986646842`; the check report SHA-256 is `38ef8c8e2a6fda4caeaf773f7a9a87f34e29a6572a5ede066a131d340b8e3e0e`. The receipt records hashes for the baseline, current, and two consumer fixture files. Reports and receipts contain no absolute paths or timestamps. |

The checked-in fixture comparison has three errors and one warning. Check mode
has one private-token error. The supplied consumer identities are
`@acme/mobile-app@2.1.0` and `@acme/web-app@2.0.0`. The report's severity
levels describe findings; they are not a SemVer classification.

## Verification

- Focused manifest and packed gates passed: 73 tests, 923 assertions across
  15 files.
- `bun run typecheck` passed. `bun run check` passed the package build and
  typecheck, 959 CSS tests with 41,066 assertions across 156 files, and the
  Storybook test with seven assertions.
- `bun run docs:build` passed; 21 documentation pages were built.
- `bun run manifest:qualify` passed. The M9.1 manifest qualification reported
  14 packed exports and 27 runtime graphs with manifest SHA-256
  `f0a2c63671380a2d80890512adc7566fbfdf9145b5d4a2685191d7bb56d84c33`.
- `bun run playground:distribution --m8-3-check` passed packed export,
  runtime graph, consumer typecheck, and paired tree-shaking checks for iOS and
  web production exports. This run used source revision `6eb95ab` with the
  documentation-only Task 6 changes present (`dirty: true`); the packed-package
  hash was `81260d41277dc5cfa356227a1d7c0a85551dca65c5e55c24414e9e634d5601af`.
  The previously retained [M8.3 qualification receipt](../evidence/2026-09-27-m8-3-runtime-resolution/qualification.json)
  documents the full platform matrix. Android was `not-run`.
- The documented `manifest:check` example returned exit status `1` with exactly
  one `consumer.private-token-dependency` finding and two analysis limits.
- `git diff --check` passed.

## Limits and next work

Analysis covers only the declared roots and explicit consumer files. Manifest
v1 cannot establish which consumers use component slots or variants, and
unresolved references remain limits rather than guessed identities. The CLI
does not integrate with release automation and does not decide whether a
version change is SemVer-breaking.

The iOS/web result is packed production-bundle qualification, not device
rendering or native interaction acceptance. Android remains `not-run` and
parked because no device is available. No package was published, and no release
was made.

**Next:** M9.3 — add development-only explanations for resolved values,
matching conditions, override winners, dependencies, and recomputation causes.
