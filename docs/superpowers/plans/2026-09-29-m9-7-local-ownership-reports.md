# M9.7 Local Ownership Metadata and Report Adapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local, versioned ownership map and deterministic owner attribution for Crumbs design-system reports.

**Architecture:** Keep team ownership in a standalone tooling document keyed by stable token/component IDs. A pure API resolves recognized references against explicitly supplied M9.1 manifests and returns one versioned envelope containing the source report, attribution records, and coverage limits. A local CLI reads only the named files; actual editor/design-tool integrations remain optional consumers of the JSON contract.

**Tech Stack:** TypeScript, Effect 4 Schema (private tooling boundary), Bun, `fast-check`, tsdown, packed ESM/CommonJS/declaration consumers.

**Spec:** [M9.7 local ownership and report adapters design](../specs/2026-09-29-m9-7-local-ownership-reports-design.md)

## Global Constraints

- Use Effect 4 Schema internally and `fast-check` for useful generated invariants. Add no dependency.
- Preserve manifest v1 and all M9.2–M9.6 source report schema versions.
- Ownership assignments target exactly one manifest token or component ID; owner IDs must exist in the ownership document.
- Resolve assignments only against token and component records in explicitly supplied manifests; do not infer owners from paths, names, Git, or hosted services.
- Report statuses are `assigned`, `unassigned`, or `unresolved`; unresolved records include the exact reason codes in the spec.
- The API performs no file reads, directory discovery, import resolution, or input mutation. The CLI reads only named files.
- Keep ownership schemas, filesystem orchestration, and report adapters out of ordinary React Native app runtime entrypoints.
- Do not add hosted accounts, external telemetry, a concrete editor/design-tool integration, release changes, publication, or Android/device acceptance.
- Android/device acceptance remains parked.
- Commit each implementation task. After each commit, report its hash, focused evidence, and the next numbered M9.7 task; at close recommend M10.1 and keep Android parked.

## Review Focus

- Baseline and current manifests may repeat a stable entity ID while reporting a domain change; pin ownership to the stable ID without suppressing or rejecting the compatibility finding in Task 2.
- Policy subject strings can represent declarations or measurements; pin entity attribution to rule semantics so a coincidentally equal string cannot claim a team in Task 3.
- A failing DTCG import result has no top-level format/version tags; pin its normalized `crumbs.dtcg-import-result` v1 source descriptor in Task 4.
- A style-explanation token variable may lack a contract in nested values; pin exact manifest-variable matching and unresolved behavior in Task 4.
- Reports can declare provider versions that do not match the supplied manifests; reject those inputs with a path-qualified CLI error in Task 6.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `packages/css/src/tooling/ownership/model.ts` | Plain ownership, attribution, owned-report, analysis-limit, and supported-source-report types/constants. |
| `packages/css/src/tooling/ownership/schema.ts` | Private Effect 4 Schema decoders for the strict ownership document and owned-report envelope. |
| `packages/css/src/tooling/ownership/entity-index.ts` | One-pass token/component identity and token-variable indexes from explicitly supplied manifests. |
| `packages/css/src/tooling/ownership/report-adapters.ts` | M9.2 compatibility, M9.4 policy, and M9.5 migration report reference extraction. |
| `packages/css/src/tooling/ownership/dtcg-adapter.ts` | M9.6 success/failure result normalization and token/diagnostic references. |
| `packages/css/src/tooling/ownership/style-explanation-adapter.ts` | M9.3 declared/active/changed token-variable references. |
| `packages/css/src/tooling/ownership/annotate.ts` | Pure source-format dispatch, exact entity resolution, envelope assembly, coverage limits, and resource guards. |
| `packages/css/src/tooling/ownership/canonical-json.ts` | Deterministic owned-report canonical encoding. |
| `packages/css/src/tooling/ownership.ts` | Small public barrel of plain types, constants, decoders, annotation API, and canonical encoder. |
| `packages/css/test/ownership-*.test.ts` | Focused schema, index, adapter, API, property, CLI, and qualification tests. |
| `packages/css/fixtures/m9-7-ownership/` | Checked-in manifests, ownership maps, and supported report inputs for deterministic qualification. |
| `packages/css/package.json`, `packages/css/tsdown.config.ts` | Register the isolated `./tooling/ownership` ESM, CommonJS, and declaration targets. |
| `scripts/packed-runtime-graph.ts`, `packages/css/test/pack-consumer-contract.test.ts`, `packages/css/test/metro-tree-shaking-contract.test.ts` | Prove packed consumer support and ordinary app-runtime isolation. |
| `scripts/m9-7-ownership-annotate.ts`, `scripts/m9-7-ownership-qualification.ts`, root `package.json` | Explicit-file CLI, deterministic fixture qualification, and root scripts. |
| `docs/src/content/docs/how-to/annotate-design-system-ownership.mdx` | Ownership-map authoring, command usage, statuses, and coverage limitations. |
| `docs/src/content/docs/index.mdx`, `docs/src/content/docs/reference/package-entrypoints-and-apis.mdx`, `packages/css/README.md` | Link the guide and document the tooling subpath. |
| `docs/evidence/2026-09-29-m9-7-ownership/qualification.json`, `docs/assessments/2026-09-29-m9-7-local-ownership.md`, `docs/roadmap.md` | Deterministic receipt, observed assessment, and M9.7 closeout after gates pass. |

## Task 1: Define the ownership data contract and schema

**Files:**
- Create: `packages/css/src/tooling/ownership/model.ts`
- Create: `packages/css/src/tooling/ownership/schema.ts`
- Test: `packages/css/test/ownership-schema.test.ts`

**Interfaces:**
- `DesignSystemOwnership` is `{ readonly format: "crumbs.design-system-ownership"; readonly schemaVersion: 1; readonly owners: ReadonlyArray<OwnershipOwner>; readonly assignments: ReadonlyArray<OwnershipAssignment> }`.
- `OwnershipOwner` is `{ readonly id: string; readonly displayName: string }`; `OwnershipAssignment` is `{ readonly entityId: string; readonly ownerId: string }`.
- IDs and display names are non-empty, trimmed, control-free strings. Entity IDs are matched byte-for-byte later; do not parse a guessed ID grammar.
- Export model constants `DESIGN_SYSTEM_OWNERSHIP_FORMAT`, `DESIGN_SYSTEM_OWNERSHIP_VERSION`, `DESIGN_SYSTEM_OWNED_REPORT_FORMAT`, `DESIGN_SYSTEM_OWNED_REPORT_VERSION`, and the exact analysis-limit and unresolved-reason code unions from the spec.
- Internal `decodeDesignSystemOwnership(input: unknown): DesignSystemOwnership` uses `makeDataCodec`; no Schema/Codec/AST object is exported. Empty `owners` and `assignments` arrays are valid for incremental adoption.

- [ ] **Step 1: Write failing tests** named `rejects unsupported ownership tags`, `rejects duplicate owner and entity IDs`, `rejects unknown owner references`, `rejects unsafe text and accessor-bearing values without invoking getters`, and `accepts an empty ownership map for incremental adoption`. Assert `effect/Schema` values do not appear in the model's public types.
- [ ] **Step 2: Run** `bun test packages/css/test/ownership-schema.test.ts`. Expected: FAIL because the ownership model and decoder do not exist.
- [ ] **Step 3: Implement** the model and strict Effect 4 Schema decoder. Reject duplicate owner IDs, duplicate entity assignments, owner references not declared in `owners`, malformed text, and unsupported format/version values.
- [ ] **Step 4: Run** `bun test packages/css/test/ownership-schema.test.ts`. Expected: all schema boundary tests pass and no caller getter runs.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: define design system ownership schema`.

## Task 2: Build exact manifest entity indexes and resolve assignments

**Files:**
- Create: `packages/css/src/tooling/ownership/entity-index.ts`
- Test: `packages/css/test/ownership-entity-index.test.ts`
- Test: `packages/css/test/ownership-entity-index.property.test.ts`

**Interfaces:**
- `OwnershipEntityIndex` is internal and contains `byId: ReadonlyMap<string, "token" | "component">` plus `tokenIdsByVariableName: ReadonlyMap<string, ReadonlyArray<string>>`.
- `buildOwnershipEntityIndex(manifests: ReadonlyArray<DesignSystemManifest>): OwnershipEntityIndex` rejects an empty manifest list and duplicate package name/version inputs. It indexes token and component IDs only; module paths are not entities.
- Repeated stable IDs across different manifest versions represent one ownership entity when their identity kind and token contract/path are consistent. Accept a token's domain, lifecycle, or source-origin change under the same stable ID so compatibility reports can still be annotated. Reject token/component kind conflicts and inconsistent token identity/path records.
- `resolveOwnershipEntity(entityId: string, ownership: DesignSystemOwnership, index: OwnershipEntityIndex): OwnershipAttribution` returns `assigned` with `{ id, displayName }`, `unassigned`, or `unresolved` with `entity-not-in-supplied-manifests`.
- Build token variable names only with the existing `tokenVariableName(contract, path)` helper; preserve every exact match so callers can reject ambiguous resolution.

- [ ] **Step 1: Write failing tests** for token/component matches, absent entities, missing owner assignments, duplicate package manifests, repeated identical IDs, changed-domain IDs shared by baseline/current, contradictory token identity/path records, token/component kind collisions, and exact token-variable lookup.
- [ ] **Step 2: Run** `bun test packages/css/test/ownership-entity-index*.test.ts`. Expected: FAIL because the index and resolver are absent.
- [ ] **Step 3: Implement** a single-pass index using `Map` lookups; preserve stable identity across the baseline/current domain-change case and fail only for actual identity ambiguity.
- [ ] **Step 4: Run** focused tests and `fast-check` properties for manifest-order independence, exact-match behavior, and no attribution for a non-matching ID. Expected: identical IDs resolve identically regardless of manifest order.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: resolve ownership against manifest identities`.

## Task 3: Annotate compatibility, policy, and migration reports

**Files:**
- Create: `packages/css/src/tooling/ownership/annotate.ts`
- Create: `packages/css/src/tooling/ownership/report-adapters.ts`
- Modify: `packages/css/src/tooling/ownership/model.ts`
- Modify: `packages/css/src/tooling/ownership/schema.ts`
- Test: `packages/css/test/ownership-reports.test.ts`

**Interfaces:**
- `SupportedSourceReport` is the union of `ManifestCompatibilityReport`, `DesignSystemPolicyReport`, `SourceMigrationReport`, `CrumbsDtcgImportResult`, and `StyleExplanationReport`.
- `annotateDesignSystemReport(input: { readonly ownership: DesignSystemOwnership; readonly manifests: ReadonlyArray<DesignSystemManifest>; readonly report: SupportedSourceReport }): OwnedReport` produces a detached envelope. This task implements the first three source report formats; Task 4 adds DTCG and style-explanation dispatch.
- `OwnedReport.source` is `{ readonly format: string; readonly schemaVersion: number; readonly data: SupportedSourceReport }`. `OwnedReport.ownership` is the owner format/version pair. `OwnershipAttribution` is the discriminated union in the spec; pointers refer to `source.data`.
- Validate compatibility, policy, and migration inputs with their existing v1 decoders (`decodeManifestCompatibilityReport`, `decodeDesignSystemPolicyReport`, and `decodeSourceMigrationReport`) before extracting references. Compatibility findings map `entityId`. Policy findings/exception diagnostics map to manifest entities only for `entity.deprecated` and `consumer.private-token`; all other rule subjects remain unresolved even if their text happens to equal a manifest ID. Migration diagnostics map `entityId` only when present. All pointers are RFC 6901 escaped.
- Include `explicit-manifests-only`; include `manifest-unresolved-references` when any supplied manifest has unresolved references; include `report-subject-unresolved` when any attribution is unresolved.

- [ ] **Step 1: Write failing tests** for each supported format/version, every finding/diagnostic pointer, assigned/unassigned/unresolved rows, baseline-only removed-token attribution, a `token.domain-changed` finding whose stable ID exists in baseline and current manifests, provider package/version mismatch, `entity.deprecated` and `consumer.private-token` eligibility, a non-entity policy rule whose subject deliberately equals a manifest ID, unknown entity IDs, missing migration IDs, source-data preservation, and duplicate attribution pointer rejection.
- [ ] **Step 2: Run** `bun test packages/css/test/ownership-reports.test.ts`. Expected: FAIL because the owned-report model and report adapters are absent.
- [ ] **Step 3: Implement** source-format validation and the compatibility, policy, and migration reference adapters. Normalize each source discriminator into `source.format` and `source.schemaVersion`; never rewrite source findings.
- [ ] **Step 4: Run** the focused report tests and add a property asserting owner-map ordering does not change the same report's attributions. Expected: all references have a stable pointer and only explicitly eligible subjects receive entity attribution.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: annotate compatibility and governance reports`.

## Task 4: Add DTCG and style-explanation report adapters

**Files:**
- Create: `packages/css/src/tooling/ownership/dtcg-adapter.ts`
- Create: `packages/css/src/tooling/ownership/style-explanation-adapter.ts`
- Modify: `packages/css/src/tooling/ownership/annotate.ts`
- Test: `packages/css/test/ownership-adapters.test.ts`

**Interfaces:**
- `adaptDtcgImportResult(report: CrumbsDtcgImportResult): ReportReferenceSet` attributes successful sidecar token provenance by `tokenId`, plus diagnostics by `crumbsTokenId` when present. Both success and failure use source descriptor `crumbs.dtcg-import-result` version `1`; document-only diagnostics are unresolved.
- `adaptStyleExplanationReport(report: StyleExplanationReport, index: OwnershipEntityIndex): ReportReferenceSet` visits `dependencies.declaredTokens`, `activeTokens`, and `changedTokens`, matching each exact variable name against the manifest token index. Missing matches use `entity-not-in-supplied-manifests`; multiple matches use `variable-name-ambiguous`.
- Add a private Effect 4 Schema decoder for the DTCG operation-result union because the existing tooling decodes the import request, not its success/failure output. Validate `ok`, diagnostics, and (on success) the import tags, payload, and sidecar, including the sidecar contract used to qualify supplied manifests.
- The existing style-explanation decoder's data-depth limit is 64. Add `OWNERSHIP_MAX_REPORT_REFERENCES = 100_000`; at the boundary, accept exactly 100,000 references, then fail with a typed `OwnershipResourceLimitError` carrying stable code `ownership.resource-limit-exceeded` rather than truncating attributions. The CLI adds the input path to this diagnostic.

- [ ] **Step 1: Write failing tests** for valid and malformed DTCG success/failure payloads, failure-result format normalization, DTCG diagnostics with/without `crumbsTokenId`, a style-explanation dependency containing only a generated variable name, exact manifest-variable matching, missing and ambiguous variables, unsupported report versions, RFC 6901 escaping of `~` and `/`, and exactly 100,000 versus 100,001 references.
- [ ] **Step 2: Run** `bun test packages/css/test/ownership-adapters.test.ts`. Expected: FAIL because these adapters are absent.
- [ ] **Step 3: Implement** the private DTCG result decoder and normalized source descriptor, then style token-variable lookup using Task 2's index; extend the pure dispatch without adding DTCG or devtools exports to app entrypoints.
- [ ] **Step 4: Run** adapter tests plus `bun test packages/css/test/dtcg-schema.test.ts packages/css/test/style-explanation-schema.test.ts`. Expected: supported data is attributed exactly; absent evidence remains unresolved; over-limit input fails explicitly.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: attribute DTCG and style explanation outputs`.

## Task 5: Canonicalize and publish the isolated ownership API

**Files:**
- Create: `packages/css/src/tooling/ownership/canonical-json.ts`
- Create: `packages/css/src/tooling/ownership.ts`
- Modify: `packages/css/src/tooling/ownership/schema.ts`
- Modify: `packages/css/package.json`
- Modify: `packages/css/tsdown.config.ts`
- Modify: `scripts/packed-runtime-graph.ts`
- Create: `packages/css/test/ownership-export.test.ts`
- Modify: `packages/css/test/pack-consumer-contract.test.ts`
- Modify: `packages/css/test/metro-tree-shaking-contract.test.ts`

**Interfaces:**
- Public `@opsydyn/crumbs-css/tooling/ownership` exports plain model types/constants, `decodeDesignSystemOwnership`, `decodeOwnedReport`, `annotateDesignSystemReport`, and `encodeCanonicalOwnedReport`. It does not export Effect Schema objects or internal indexes/adapters.
- The package export resolves to `dist/tooling-ownership.mjs`, `dist/tooling-ownership.cjs`, and `dist/tooling-ownership.d.mts`, with the generated `.d.cts` companion. Register `tooling-ownership` in tsdown's `toolEntries` and classify `./tooling/ownership` as `compiler-tooling` in the packed graph.
- Canonical encoding sorts object keys and attribution/limit arrays, preserves arrays inside source report data, and emits one trailing newline. It enforces the `makeDataCodec` depth limit and the 100,000-reference limit.

- [ ] **Step 1: Write failing tests** for canonical bytes under owner/assignment/manifest permutation, stable RFC 6901 pointers, unchanged source arrays, strict owned-report decoding, and exact ESM/CommonJS/type export targets. Add a runtime-graph canary for `crumbs.design-system-owned-report`.
- [ ] **Step 2: Run** `bun test packages/css/test/ownership-canonical.test.ts packages/css/test/ownership-export.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/metro-tree-shaking-contract.test.ts`. Expected: FAIL because encoding and package export are absent.
- [ ] **Step 3: Implement** canonical encoding, owned-report decode validation, and the narrow public barrel. Register the `tooling-ownership` build entry and explicit package export; do not edit ordinary runtime entrypoints.
- [ ] **Step 4: Run** `bun run build` and the focused ownership/export/runtime tests. Expected: independent ESM, CommonJS, and declaration consumers pass while ordinary runtime graphs remain free of ownership tooling.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: export isolated ownership report tooling`.

## Task 6: Add the explicit-file ownership annotation command

**Files:**
- Create: `scripts/m9-7-ownership-annotate.ts`
- Modify: root `package.json`
- Create: `packages/css/test/ownership-cli.test.ts`

**Interfaces:**
- `OwnershipAnnotateOptions` is `{ readonly ownershipPath: string; readonly manifestPaths: ReadonlyArray<string>; readonly reportPath: string; readonly format: "text" | "json" }`.
- `parseOwnershipAnnotateArgs(args: ReadonlyArray<string>): OwnershipAnnotateOptions` accepts Bun's leading `--`, requires `--ownership`, one or more repeatable `--manifest`, and `--report`, accepts one optional `--format text|json`, and rejects duplicates/unknown options/positionals.
- `executeOwnershipAnnotateCommand(options: OwnershipAnnotateOptions): { readonly ownedReport: OwnedReport; readonly exitCode: 0 }` reads only those named files, qualifies provider/contract versions against supplied manifests, and calls the public API. JSON uses `encodeCanonicalOwnedReport`; text reports counts and RFC 6901 locations.
- Register root script `ownership:annotate` as `bun scripts/m9-7-ownership-annotate.ts`.

- [ ] **Step 1: Write failing CLI tests** for argument parsing, repeated manifests, JSON/text equivalence, default text output, explicit-path-only reads, valid success with unresolved references, provider/version mismatch, malformed files, unreadable files, unknown options, and exit codes 0/2.
- [ ] **Step 2: Run** `bun test packages/css/test/ownership-cli.test.ts`. Expected: FAIL because the command and parser are absent.
- [ ] **Step 3: Implement** the parser, explicit file readers, path-qualified diagnostics, and deterministic text formatter. Check declared provider package/version requirements against the supplied manifests, including the DTCG sidecar contract; do not discover files or write files.
- [ ] **Step 4: Run** the CLI tests using temporary fixture files. Expected: only named files are read; JSON and text describe the same attributions; unresolved statuses still exit 0.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: add local ownership annotation command`.

## Task 7: Qualify the feature, document it, and close M9.7

**Files:**
- Create: `packages/css/fixtures/m9-7-ownership/`
- Create: `scripts/m9-7-ownership-qualification.ts`
- Create: `packages/css/test/ownership-qualification.test.ts`
- Modify: root `package.json`
- Create: `docs/src/content/docs/how-to/annotate-design-system-ownership.mdx`
- Modify: `docs/src/content/docs/index.mdx`
- Modify: `docs/src/content/docs/reference/package-entrypoints-and-apis.mdx`
- Modify: `packages/css/README.md`
- Create: `docs/evidence/2026-09-29-m9-7-ownership/qualification.json`
- Create: `docs/assessments/2026-09-29-m9-7-local-ownership.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- `ownership:qualify` runs `bun run build && bun scripts/m9-7-ownership-qualification.ts` against checked-in ownership, manifest, and report fixtures; its receipt records fixture/output digests, report families, attribution counts, and gates without absolute paths or timestamps.
- The guide documents the map shape, stable IDs, local command, attribution statuses, explicit inputs, report coverage, optional adapter contract, and no-hosted-service boundary.
- The roadmap marks M9.7 complete and recommends M10.1 only after all required gates pass. Android/device acceptance remains not-run and parked.

- [ ] **Step 1: Write failing qualification tests** for expected report-family coverage, repeat-run byte identity, fixture digest stability, absence of absolute paths/timestamps, and visible unassigned/unresolved counts.
- [ ] **Step 2: Run** `bun test packages/css/test/ownership-qualification.test.ts`. Expected: FAIL because the qualification fixture and runner are absent.
- [ ] **Step 3: Add** minimal checked-in fixtures for compatibility, policy, migration, style explanation, DTCG success and failure, plus assigned/unassigned/unresolved cases; implement the deterministic qualification runner and root script.
- [ ] **Step 4: Run** `bun run ownership:qualify` twice. Expected: identical `docs/evidence/2026-09-29-m9-7-ownership/qualification.json` bytes and complete fixture coverage.
- [ ] **Step 5: Document** the CLI/API and package boundary; write the assessment from observed evidence; update the roadmap only after gates pass.
- [ ] **Step 6: Run** `bun run check`, `bun run docs:build`, `bun run ownership:qualify`, `bun scripts/playground-distribution.ts --m8-3-check`, and `bun test packages/css/test/ownership-*.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/metro-tree-shaking-contract.test.ts`. Expected: all applicable package, type, test, docs, qualification, and distribution gates pass; Android/device remains explicitly not-run.
- [ ] **Step 7: Run** `git diff --check`; stage only M9.7 fixtures, qualification, docs, evidence, and roadmap; commit as `docs: qualify M9.7 ownership reports`.

## Completion and handoff

After each implementation-task commit, report the hash, focused evidence, and the next M9.7 task number. At close, report the qualification gates and links to the receipt/assessment, recommend M10.1 as the next roadmap item, and state that Android/device acceptance remains parked. Do not publish or alter release automation.
