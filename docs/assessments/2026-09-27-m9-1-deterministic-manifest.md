# M9.1 deterministic design-system manifest qualification

**Status:** Qualified; M9.1 complete

**Date:** 2026-09-27

**Roadmap:** [M9.1](../roadmap.md)

**Specification:** [M9.1 deterministic manifest design](../superpowers/specs/2026-09-27-m9-1-deterministic-manifest-design.md)

**Receipt and generated artifact:** [qualification.json](../evidence/2026-09-27-m9-1-deterministic-manifest/qualification.json), [manifest.json](../evidence/2026-09-27-m9-1-deterministic-manifest/manifest.json)

## Result

M9.1 now emits canonical schema-v1 JSON from explicitly selected token,
component, and compiled-style roots through the opt-in
`@opsydyn/crumbs-css/tooling/manifest` entrypoint. The public records and output
are plain TypeScript data and JSON. Effect 4 Schema is internal to the tooling
entrypoint; ordinary application imports need no Effect import.

The checked-in fixture covers two token contracts, public and private token
visibility, internal and unresolved aliases, component slots and variants,
defaults and state constraints, deprecation/replacement annotations, composed
public/private style dependencies, compiler-observed capabilities, and legacy
references that remain unresolved. Fixture file digests are recorded in the
receipt beside the canonical manifest digest. No theme values or absolute
checkout paths are emitted.

## Acceptance evidence

| M9.1 acceptance item | Evidence |
| --- | --- |
| Build a manifest from public/private tokens, aliases, a component contract and compiled styles | `manifest.json` contains two token contracts, eight token records, two alias records, one component, and one style module. The component retains its public slots, variants, defaults, state constraints, and lifecycle data. |
| Decode v1 and retain contract, dependency, origin, lifecycle and coverage data | The qualification fixture is assembled through `assembleManifest`, which validates with the v1 decoder. The receipt records four declared roots, unresolved references, compiler-observed capability classification, 2 relocated package roots, 4 loaded token contracts, 2 component recipes, 2 style compiles, and the output SHA-256. |
| Reordered roots and another absolute package root produce identical bytes | The repeatable command loads token and component fixtures from two distinct temporary package roots, compiles styles from both, reverses the token-contract roots, and fails unless output bytes and digests match. All declaration origins are relative to the fixture package. The resulting SHA-256 is `f0a2c63671380a2d80890512adc7566fbfdf9145b5d4a2685191d7bb56d84c33`. |
| Invalid identities, paths, references, data and schema versions fail closed | Focused schema and adapter tests cover unsupported versions, malformed identities/domains, non-JSON values, non-finite numbers, unsafe origins, dangling or contradictory alias/dependency links, alias cycles, lifecycle replacements, missing compiler origins, module identities, and coverage-root consistency. |
| Packed formats resolve while ordinary runtime graphs exclude tooling | The packed receipt resolves 14 package subpaths, including manifest tooling ESM/CommonJS/types, and audits 27 ESM/CommonJS/metadata graph entries. Ordinary theme graphs admit only React; the `tokens` runtime graph has no external dependencies. `bun run playground:distribution --m8-3-check` passed the declared iOS/web production distribution checks. |
| Production metadata and ordinary behavior remain unchanged | The compiler-sidecar regression compares ordinary transformed production code and `__crumbsModule` byte-for-byte with the sidecar-enabled transform. The complete package suite passed. |

## Verification

- `bun test packages/css/test/manifest-*.test.ts`: 25 tests passed, 251
  assertions across six files.
- `bun run manifest:qualify`: passed; package build, deterministic fixture
  comparison, packed export resolution, runtime graph audit and the M8.3 iOS/web
  distribution gate completed. The receipt contains 14 resolved exports and 27
  runtime graph entries.
- `bun run check`: package build and typecheck passed; 929 CSS package tests
  passed with 40,431 assertions across 149 files, and the Storybook test passed
  with seven assertions.
- `bun run docs:build`: passed; 21 documentation pages built, including the
  manifest guide.

Android remains `not-run` and parked because no device is available. This
qualification does not claim Android rendering, device performance,
accessibility acceptance, publication, or release-policy approval.

## Next

**M9.2** is next: compare manifests locally and at release time to identify
breaking contract changes, private-surface policy violations, and statically
known affected consumers while reporting analysis limits.
