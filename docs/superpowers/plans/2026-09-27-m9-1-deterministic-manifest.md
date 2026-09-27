# M9.1 Deterministic Design-System Manifest Implementation Plan

**Status:** Implemented and qualified; M9.1 complete

**Date:** 2026-09-27

**Roadmap:** M9.1 in [roadmap.md](../../roadmap.md)

**Spec:** [M9.1 deterministic manifest design](../specs/2026-09-27-m9-1-deterministic-manifest-design.md)

## Goal

Emit a deterministic, versioned package manifest from explicit token-contract, component-recipe, and compiled-style roots. Preserve the ordinary runtime graph and the production __crumbsModule record.

## Architecture

Add an opt-in tooling manifest entry. Normalize existing token and component descriptors instead of copying their contract rules. Capture style dependencies, capabilities, and source/property origins from the final compiler output through a separate tooling sidecar. Validate and encode the plain-data manifest with Effect 4 Schema; keep Effect and compiler dependencies out of ordinary app imports. Record explicit roots, unresolved references, and manifest lifecycle annotations. Emit stable JSON without timestamps or machine paths.

## Global constraints

- Implement on codex/m9-1-manifest-design, based on the current local main commit 058ae13.
- Work only on M9.1 files. Preserve the original checkout's pre-existing release-version edits and do not stage worktree dependency symlinks.
- Use test-first steps for every implementation task: add a focused failing test, run it and confirm the intended failure, implement the smallest change, then rerun the focused tests.
- Keep package name/version, contract compatibility versions, compiler/artifact versions, and manifest schema version as distinct fields. Reuse the existing internal Effect dependency; add no dependency or peer dependency.
- Keep concrete theme values, absolute paths, timestamps, generated class names, and compiler tooling out of the manifest and production runtime metadata.
- Include private-token visibility for governance, but never include resolved theme values. Unknown or legacy references must be explicitly unresolved; do not invent stable identities.
- Keep capability claims limited to compiler-admitted primitive/property data. Android, device rendering, accessibility acceptance, publishing, and release-policy changes remain out of scope.
- Commit each completed task as its own slice. After each commit, report its validation and recommend the next M9.1 slice. Do not publish or push.

## Review focus

- Reordered inputs and a different absolute package root produce byte-identical manifest output.
- Token identities, domains, aliases, visibility, component public surfaces, defaults, and lifecycle annotations derive from supplied source descriptors.
- Style dependency edges and capability records describe final composed output, while source/property provenance stays package-relative.
- Unknown, legacy, or external references are visible as such and never acquire fabricated IDs.
- A new manifest tooling import does not alter __crumbsModule, ordinary runtime dependency graphs, or ordinary production Metro bundles.
- ESM, CommonJS, and declaration targets for the new packed subpath resolve from an installed package.

## File map

| File | Responsibility |
| --- | --- |
| packages/css/src/tooling/manifest/model.ts | Plain-data manifest v1 types and normalized record shapes. |
| packages/css/src/tooling/manifest/schema.ts | Effect Schema validators/codecs for manifest and input records. |
| packages/css/src/tooling/manifest/canonical-json.ts | Stable normalization and compact JSON encoding. |
| packages/css/src/tooling/manifest/contracts.ts | Token/component descriptor projection and explicit root/lifecycle validation. |
| packages/css/src/tokens/domains.ts and packages/css/src/theme-token.ts | Internal token-contract metadata projection for the tooling adapter, without ordinary-entrypoint re-exports. |
| packages/css/src/components/index.ts | Recipe descriptor projection for defaults and public state constraints if the tooling adapter needs an internal helper. |
| packages/css/src/tooling/manifest/assemble.ts | Merge descriptors and compiler sidecars into one manifest. |
| packages/css/src/tooling/manifest.ts | Opt-in public tooling entrypoint. |
| packages/css/src/compiler/manifest-sidecar.ts | Compiler-only projection of final IR, provenance, dependency and capability data. |
| packages/css/src/transformer.ts | Capture the sidecar from the existing compile pass without adding it to runtime JS. |
| packages/css/tsdown.config.ts | Build the tooling entry in ESM, CommonJS, and declarations. |
| packages/css/package.json | Declare ./tooling/manifest targets only. |
| package.json | Add the repository-local manifest qualification command. |
| scripts/packed-runtime-graph.ts | Classify the manifest subpath as compiler tooling. |
| packages/css/test/manifest-*.test.ts | Schema, adapters, property tests, sidecar, assembly, and package entry tests. |
| packages/css/fixtures/m9-1-manifest/ | Public/private token, alias, component, and style fixtures. |
| scripts/m9-1-manifest-qualification.ts | Produce deterministic qualification evidence from the fixture and packed package. |
| docs/evidence/2026-09-27-m9-1-deterministic-manifest/qualification.json | Retain exact identities, fixture inputs, output digest, export resolutions, and runtime graph results. |
| docs/assessments/2026-09-27-m9-1-deterministic-manifest.md | Explain qualified behavior and the analysis boundary. |
| packages/css/README.md and docs/src/content/docs/how-to/generate-design-system-manifests.mdx | Document manifest generation and the tooling-only import boundary. |
| docs/roadmap.md | Mark M9.1 complete only after the declared gates pass; recommend M9.2 next. |

## Task 1: Define manifest v1 and canonical encoding

**Files:** Create model.ts, schema.ts, canonical-json.ts, manifest-schema.test.ts, and manifest-canonical-json.property.test.ts under the paths above.

- [x] Add failing schema tests for a valid minimal v1 manifest, unsupported versions, unknown fields, invalid identities/domains, non-JSON values, and non-finite numbers.
- [x] Add fast-check properties showing equivalent records with permuted object keys and set-valued collections normalize to the same bytes. Include empty and nested records and Unicode identity/path segments.
- [x] Implement the versioned plain-data model, Effect Schema validation, documented ordinal sorting, fixed key order, compact UTF-8 JSON, and one final newline.
- [x] Confirm Effect Schema values do not appear in the public manifest type declarations; the encoded result remains JSON data.
- [x] Run: bun test packages/css/test/manifest-schema.test.ts packages/css/test/manifest-canonical-json.property.test.ts
- [x] Commit: feat: add manifest v1 schema and canonical encoder

## Task 2: Project token and component contracts and assemble declared roots

**Files:** Create contracts.ts, assemble.ts, and manifest-contract-adapters.test.ts. Modify packages/css/src/tokens/domains.ts, packages/css/src/theme-token.ts, or packages/css/src/components/index.ts only where a tooling-safe descriptor is needed.

- [x] Add failing tests for stable token identity, domain, public/private visibility, alias target/fallback/origin, component identity, public slots/variants/extension points, public state constraints, and defaults limited to declared public axes.
- [x] Test explicit package-relative source origins and export paths, duplicate/conflicting identities, path traversal, alias/replacement cross-reference validation, lifecycle annotation targets, external replacement IDs, and explicit unresolved references.
- [x] Add adapter functions that project normalized data from supplied token contracts and component recipes. Do not duplicate authoring validation or expose registry iteration through ordinary runtime entrypoints.
- [x] Add manifest assembly for explicit roots and lifecycle annotations. Omit theme values and undeclared private component details; preserve private-token visibility for dependency policy.
- [x] Confirm a valid fallback alias may refer outside the supplied roots and is represented as external or unresolved rather than rejected as a broken internal link.
- [x] Run: bun test packages/css/test/manifest-contract-adapters.test.ts packages/css/test/manifest-schema.test.ts
- [x] Run: bun run typecheck
- [x] Commit: feat: collect design-system contracts into manifests

## Task 3: Capture compiled style manifest sidecars

**Files:** Create packages/css/src/compiler/manifest-sidecar.ts and packages/css/test/manifest-compiler-sidecar.test.ts. Modify packages/css/src/transformer.ts and add the fixture styles under packages/css/fixtures/m9-1-manifest/.

- [x] Add a failing compiler fixture with a composed style that uses public and private tokens, includes an overridden token declaration, and spans distinct exports/properties.
- [x] Assert the sidecar maps surviving dependencies to stable token IDs when known, marks legacy/unresolved references explicitly, and retains module/export/property source origins with package-relative paths.
- [x] Assert capability records contain only primitive/property pairs admitted by the captured IR and are labelled as compiler-observed data.
- [x] Build the sidecar from the same final composition/IR used by the normal transformer. Do not append it to emitted JavaScript or change __crumbsModule.
- [x] Compare normal transform output and __crumbsModule before/after the sidecar path; assert byte-identical production code and metadata for the fixture.
- [x] Assert changing the temporary absolute package root does not change normalized source IDs or manifest output.
- [x] Run: bun test packages/css/test/manifest-compiler-sidecar.test.ts
- [x] Commit: feat: capture compiler manifest sidecars

## Task 4: Expose and qualify the opt-in tooling entrypoint

**Files:** Create packages/css/src/tooling/manifest.ts and packages/css/test/manifest-export.test.ts. Modify packages/css/tsdown.config.ts, packages/css/package.json, scripts/packed-runtime-graph.ts, and the packed export/runtime graph tests.

- [x] Add failing packed-consumer assertions for ./tooling/manifest in ESM, CommonJS, and types. Load the public encoder/decoder from the installed artifact and round-trip the fixture manifest.
- [x] Add ./tooling/manifest to the compiler-tooling graph classification and confirm every packed local import resolves inside the installed package.
- [x] Build the dedicated entry in both JS formats and the existing declaration graph. Do not re-export it from root, theme, theme/core, or tokens.
- [x] Assert ordinary runtime graphs and ordinary Expo Metro bundles remain free of Effect and compiler/tooling modules; the tooling graph may use the already bundled internal Effect dependency and approved compiler dependencies.
- [x] Run: bun test packages/css/test/manifest-export.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/packed-runtime-graph.test.ts
- [x] Run: bun run build
- [x] Commit: feat: expose manifest tooling entrypoint

## Task 5: Qualify, document, and close M9.1

**Files:** Add the qualification script, receipt, and assessment listed in the file map. Add a repository-local manifest:qualify command in package.json. Update packages/css/README.md, add docs/src/content/docs/how-to/generate-design-system-manifests.mdx, and update docs/roadmap.md.

- [x] Add a repeatable qualification command for the checked-in M9.1 fixture. Record package/compiler/artifact identity, schema version, declared roots, unresolved references, resolved packed exports, runtime graph classes, and output SHA-256; do not include absolute checkout paths.
- [x] Generate two manifests with reordered roots and from distinct temporary absolute roots, then assert byte equality and matching digests. Keep fixtures and receipt hash-linked. Run: bun run manifest:qualify.
- [x] Document the explicit-root workflow, lifecycle annotations, unresolved-reference reporting, compiler-only capability claims, and the fact that ordinary consumers need no Effect import.
- [x] Run focused manifest tests, then run: bun run check
- [x] Run: bun run docs:build
- [x] Run: bun run playground:distribution --m8-3-check. Confirm ESM/CommonJS/types plus ordinary iOS/web runtime graph boundaries. Record Android as not-run and keep it parked.
- [x] Review the receipt and assessment against every M9.1 acceptance item in the spec. Only then mark M9.1 complete and M9.2 next in docs/roadmap.md.
- [x] Commit: docs: qualify M9.1 deterministic manifest

After M9.1 implementation and qualification are complete, merge codex/m9-1-manifest-design into local main as previously requested. Do not push or publish.

## Execution handoff

All five tasks are complete and individually committed. M9.1 is qualified; the next recommended roadmap item is M9.2. The local merge-back to main follows the approved handoff.
