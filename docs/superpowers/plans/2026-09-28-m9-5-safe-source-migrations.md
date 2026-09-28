# M9.5 Safe Source Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, tooling-only token and component-recipe migrations for explicitly supplied TypeScript sources, with dry-run as the default and fail-closed writes.

**Architecture:** Validate a separate versioned migration map against explicit M9.1 baseline/current manifests, then use the TypeScript parser to plan minimal static source edits. Keep the planner pure and return ordinary typed records; a local CLI owns explicit file reads and per-file atomic writes after whole-invocation preflight. Publish the API only through `./tooling/migrations` and qualify its boundary from React Native runtime graphs.

**Tech Stack:** TypeScript compiler API, Bun, Effect 4 Schema, fast-check, Node `crypto`/`fs`, tsdown, packed ESM/CommonJS/type consumers.

**Spec:** `docs/superpowers/specs/2026-09-28-m9-5-safe-migrations-design.md`

## Global Constraints

- Preserve M9.1 manifest v1, M9.2 compatibility-report v1, and M9.4 policy/report formats; migration map and report are independently versioned v1 records.
- Only inspect explicitly named migration, baseline/current manifest, and `.ts`/`.tsx` source files; do not expand globs, discover directories, load `tsconfig`, create a TypeScript program, or resolve arbitrary modules.
- Require the migration provider name to match both manifest package names; validate each old ID in baseline and each replacement ID in current; token domains must match; declared lifecycle replacements must agree; component slot maps must include every old slot and target a current slot.
- Parse with TypeScript ASTs, make only recognized non-overlapping source-span edits, preserve all other bytes, and leave unsupported or ambiguous sources untouched.
- Planning accepts source text and metadata only. The CLI defaults to dry-run; `--write` writes nothing unless all named files pass preflight, then atomically replaces each named file. A later filesystem error may leave earlier per-file atomic replacements applied and must be reported honestly.
- Reports use canonical JSON, deterministic relative paths, SHA-256 digests, stable findings, and no absolute paths or implicit timestamps. A clean report covers only explicitly supplied files and recognized syntax.
- Use Effect 4 Schema only at the tooling boundary; public data is plain TypeScript. Keep TypeScript an optional `>=5.9 <6` peer for consumers of the migration tooling subpath, not a React Native runtime dependency.
- Each implementation task ends with focused verification and its own commit. After each commit, report the commit and evidence and recommend the next M9.5 task. Do not publish. Android and device acceptance remain parked.

## Review Focus

- A stale or contradictory mapping, mismatched provider, changed token domain, or lifecycle target that disagrees with the map must fail before parsing sources; pin in Task 1.
- Import aliases, a changed contract import with unmapped token paths, shadowing, computed access, and destructuring must never receive guessed rewrites; pin in Task 2.
- A same-named recipe in a different file, ambiguous manifest export origin, unsupported extension shape, or unresolved resolver flow must not be treated as the mapped component; pin in Tasks 3 and 4.
- If one explicit source is blocked, a different clean source in the same `--write` invocation must remain byte-identical; pin in Task 5.
- Duplicate normalized file paths, parse failures, unreadable inputs, and writes that fail after preflight must produce deterministic status/exit codes without reporting unapplied edits as written; pin in Task 5.

## File Map

| Path | Responsibility |
| --- | --- |
| `packages/css/src/tooling/migrations/model.ts` | Plain migration, diagnostic, plan, and report types plus stable format/code identifiers. |
| `packages/css/src/tooling/migrations/schema.ts` | Strict Effect 4 Schema decoders for migration-map and report v1. |
| `packages/css/src/tooling/migrations/validate.ts` | Validate map identity, manifests, lifecycle replacements, domains, complete slot mappings, and binding conflicts. |
| `packages/css/src/tooling/migrations/canonical-json.ts` | Deterministic report encoding. |
| `packages/css/src/tooling/migrations/ast.ts` | Parse one explicit TS/TSX source, identify safe local bindings, validate edit spans, apply non-overlapping edits, and calculate digests. |
| `packages/css/src/tooling/migrations/token-codemod.ts` | Plan token import and static token-path edits. |
| `packages/css/src/tooling/migrations/component-codemod.ts` | Plan recipe, extension, and statically traced resolver-slot edits. |
| `packages/css/src/tooling/migrations/plan.ts` | Pure whole-invocation planner and sorted plan/report composition. |
| `packages/css/src/tooling/migrations.ts` | Public tooling-only export surface; no schema/codec objects or TypeScript AST types escape. |
| `scripts/m9-5-migrations.ts` | Strict explicit-file CLI, text/JSON rendering, preflight, and per-file atomic writes. |
| `packages/css/test/migration-*.test.ts` | Schema, validation, AST, planner, property, CLI, export, and qualification tests. |
| `packages/css/fixtures/m9-5-migrations/` | Small baseline/current manifests, migration maps, token/recipe sources, consumers, and expected reports. |
| `scripts/m9-5-migrations-qualification.ts` | Deterministic fixture qualification and digest receipt. |
| `packages/css/package.json`, `packages/css/tsdown.config.ts`, root `package.json` | Export/build the isolated migration subpath and register local commands. |
| `docs/src/content/docs/how-to/migrate-design-system-sources.mdx`, `packages/css/README.md` | Migration-map format, dry-run workflow, syntax limits, and coverage boundary. |
| `docs/evidence/2026-09-28-m9-5-safe-migrations/`, `docs/assessments/2026-09-28-m9-5-safe-migrations.md`, `docs/roadmap.md` | Fixture evidence, observed qualification, and M9.5 closeout. |

---

### Task 1: Define migration and report contracts and validate manifest replacements

**Files:**
- Create: `packages/css/src/tooling/migrations/model.ts`
- Create: `packages/css/src/tooling/migrations/schema.ts`
- Create: `packages/css/src/tooling/migrations/validate.ts`
- Create: `packages/css/src/tooling/migrations/canonical-json.ts`
- Test: `packages/css/test/migration-schema.test.ts`
- Test: `packages/css/test/migration-validation.test.ts`

**Interfaces:**
- Map format/version: `crumbs.source-migration` / `1`; report format/version: `crumbs.source-migration-report` / `1`.
- `SourceImportBinding` is `{ moduleSpecifier: string; importedName: string }`. `SourceTokenMigration` is `{ fromId; toId; fromImport; toImport }`. `SourceComponentMigration` is `{ fromId; toId; fromImport; toImport; slots: Readonly<Record<string, string>> }`. `SourceMigration` has `format`, `schemaVersion`, non-empty `id`, positive `revision`, provider package name, and required `tokens` and `components` arrays with at least one total mapping.
- `decodeSourceMigration(input: unknown): SourceMigration`; `decodeSourceMigrationReport(input: unknown): SourceMigrationReport`; `encodeCanonicalSourceMigrationReport(report): string`.
- `ValidatedSourceMigration` contains the decoded map and the exact baseline/current token/component records keyed by `fromId`/`toId`. `validateSourceMigration({ migration, baseline, current }): ValidatedSourceMigration` requires equal provider/baseline/current package names, old IDs in baseline, target IDs in current, equal token domains, exact old-slot coverage, existing new slots, lifecycle replacement agreement when present, no external replacement, and no conflicting binding rewrite. Unknown fields fail.
- `SourceMigrationPlan` is `{ report: SourceMigrationReport; outputs: ReadonlyArray<{ path: string; source: string; changed: boolean }> }`. The report contains `format`, `schemaVersion`, migration `{ id, revision }`, provider `{ name, baselineVersion, currentVersion }`, sorted file records (`path`, status: `unchanged | ready | blocked | written | write-failed`, `beforeSha256`, `afterSha256`, `proposedEditCount`, `appliedEditCount`), sorted diagnostics (`code`, `message`, optional relative `path`, `line`, `column`, and `entityId`), and analysis limits. Always emit the `explicit-files-only` coverage limit. A pure plan uses `unchanged | ready | blocked` and zero applied counts; only the CLI may finalize `written`/`write-failed` statuses. Planner input paths are normalized relative display paths, never resolved filesystem paths. No machine path or implicit time is represented.
- Diagnostic codes are fixed as `source.parse-error`, `source.unsupported-syntax`, `source.ambiguous-binding`, `token.contract-path-unmapped`, `component.origin-ambiguous`, `component.resolver-unresolved`, `io.read-failed`, and `io.write-failed`; invalid migration/manifest inputs throw `TypeError` before source planning.

- [ ] **Step 1: Write failing tests** named `accepts-exact-migration-and-report-v1`, `rejects-unknown-fields-empty-maps-and-invalid-bindings`, `rejects-duplicate-or-conflicting-source-mappings`, `requires-matching-provider-and-manifest-identities`, `requires-existing-from-and-to-ids-and-equal-token-domains`, `requires-complete-existing-slot-maps`, `requires-declared-lifecycle-target-to-agree`, and `canonicalizes-report-order-and-object-keys`. Use the exact IDs and JSON shape from the spec.
- [ ] **Step 2: Run** `bun test packages/css/test/migration-schema.test.ts packages/css/test/migration-validation.test.ts`. Expected: FAIL because the migration modules do not exist.
- [ ] **Step 3: Implement** the plain v1 model, strict Effect 4 Schema decoders, canonical serializer, and pure map-to-manifest validator. Treat `resolution: "external"` lifecycle replacements as validation failures; allow absent lifecycle metadata only when the explicit map and manifests validate.
- [ ] **Step 4: Run** `bun test packages/css/test/migration-schema.test.ts packages/css/test/migration-validation.test.ts`. Expected: PASS for exact schemas and fail-closed identity, lifecycle, domain, slot, and duplicate cases.
- [ ] **Step 5: Run** `git diff --check`; stage only Task 1 files; commit as `feat: define M9.5 migration contracts`.

### Task 2: Parse explicit TS/TSX sources and plan safe token-reference edits

**Files:**
- Create: `packages/css/src/tooling/migrations/ast.ts`
- Create: `packages/css/src/tooling/migrations/token-codemod.ts`
- Test: `packages/css/test/migration-token-codemod.test.ts`

**Interfaces:**
- `parseMigrationSource(path: string, source: string): ParsedMigrationSource` calls `ts.createSourceFile` once with `ScriptKind.TS` or `ScriptKind.TSX`; malformed syntax becomes an input diagnostic. It must not call `createProgram`, load a tsconfig, resolve imports, or read files.
- `SourceEdit` is `{ start: number; end: number; replacement: string; code: SourceMigrationDiagnosticCode }`. `applySourceEdits(source, edits): string` rejects overlapping/out-of-bounds spans and applies valid spans in descending offset order.
- `ParsedMigrationSource` is the explicit relative display path, original source string, and one `ts.SourceFile`; `SourceEditResult` is `{ edits: ReadonlyArray<SourceEdit>; diagnostics: ReadonlyArray<SourceMigrationDiagnostic> }`.
- `planTokenReferenceEdits({ parsed, validated }): SourceEditResult` matches only explicit named imports and static property paths corresponding to migration-listed token IDs. It preserves the local import alias and all text outside the import specifier/imported export/path spans.
- When a mapped import is redirected, each other statically referenced old-contract path must either exist in the current target contract with the same domain or block the file; it must never become a broken path through an otherwise valid mapped token edit.

- [ ] **Step 1: Write failing tests** named `rewrites-named-token-import-and-static-path`, `preserves-local-import-alias-comments-and-unrelated-bytes`, `leaves-unmapped-paths-when-current-contract-proves-them`, `blocks-import-retarget-when-unmapped-path-is-absent-or-domain-changed`, `reports-computed-destructured-shadowed-and-reassigned-bindings`, `rejects-overlapping-and-out-of-bounds-edits`, and `parses-ts-and-tsx-without-project-loading`.
- [ ] **Step 2: Run** `bun test packages/css/test/migration-token-codemod.test.ts`. Expected: FAIL because the parser and token planner do not exist.
- [ ] **Step 3: Implement** one-source AST parsing, local import-binding checks, static property-path recognition, source-span validation/application, and token replacement planning. Emit stable blocking diagnostics for target-related computed, destructured, shadowed, or reassigned references.
- [ ] **Step 4: Run** `bun test packages/css/test/migration-token-codemod.test.ts packages/css/test/migration-validation.test.ts`. Expected: exact static references change, unrelated bytes remain equal, and ambiguous or unsafe import retargets produce no rewritten source.
- [ ] **Step 5: Run** `git diff --check`; stage only parser/token modules and their test; commit as `feat: plan safe token source migrations`.

### Task 3: Plan recipe declaration, extension, and slot-map edits

**Files:**
- Create: `packages/css/src/tooling/migrations/component-codemod.ts`
- Test: `packages/css/test/migration-component-codemod.test.ts`

**Interfaces:**
- `planComponentDeclarationEdits({ parsed, validated }): SourceEditResult` matches a recipe definition only when the explicitly supplied normalized display path equals the baseline component's manifest `origin.path` and the exported declaration matches its `origin.exportPath`. Support a simple exported identifier initialized by the named `componentRecipe` import from `@opsydyn/crumbs-css/style`; ambiguous or duplicate matches block that file.
- `planComponentExtensionEdits({ parsed, validated }): SourceEditResult` matches explicit old recipe imports in `extendComponentRecipe` calls and rewrites the import binding plus recognized slot keys in `slotOverrides`, extension variant style branches, and compound `styles`.
- Recipe declaration slot edits cover `slots`, `base`, variant branch style records, and compound `styles`. Apply only names in the validated slot map; preserve variant axes, values, default/state variants, and all non-slot data.
- The allowed canonical named imports for recipe APIs are identified by their imported export names (`componentRecipe`, `extendComponentRecipe`) from `@opsydyn/crumbs-css/style`; aliases are retained. No type checker or module resolver is used. Run the CLI from the provider package root when migrating a source definition whose manifest origin is package-relative.

- [ ] **Step 1: Write failing tests** named `matches-recipe-definition-by-explicit-manifest-origin-and-export`, `rewrites-slot-keys-in-slots-base-variants-and-compounds`, `rewrites-explicit-extension-slot-overrides-and-branches`, `retains-variant-axes-values-and-unmapped-properties`, `retains-import-local-alias-while-changing-recipe-export`, `blocks-wrong-duplicate-or-computed-origin-match`, and `blocks-unsupported-slot-object-shape-without-partial-edit`.
- [ ] **Step 2: Run** `bun test packages/css/test/migration-component-codemod.test.ts`. Expected: FAIL because component source planning does not exist.
- [ ] **Step 3: Implement** the baseline-origin/export matcher and exact recipe/extension AST visitors. Return source-span edits to the shared edit applier; do not rewrite arbitrary object keys named `root` or `label` outside recognized recipe fields.
- [ ] **Step 4: Run** `bun test packages/css/test/migration-component-codemod.test.ts packages/css/test/component-recipe-authoring.test.ts packages/css/test/component-recipe-extension.test.ts`. Expected: migration fixtures are exact and existing recipe authoring behavior is unchanged.
- [ ] **Step 5: Run** `git diff --check`; stage only component planner and its test; commit as `feat: plan recipe slot migrations`.

### Task 4: Trace static resolver results and compose the pure migration planner

**Files:**
- Create: `packages/css/src/tooling/migrations/plan.ts`
- Create: `packages/css/test/migration-plan.test.ts`
- Create: `packages/css/test/migration-plan.property.test.ts`
- Modify: `packages/css/src/tooling/migrations/component-codemod.ts`

**Interfaces:**
- `planSourceMigration(input: { migration: SourceMigration; baseline: DesignSystemManifest; current: DesignSystemManifest; files: ReadonlyArray<{ path: string; source: string }> }): SourceMigrationPlan` is pure with respect to filesystem and process state. It validates once, parses each file once, invokes token/component planners, and sorts report files and diagnostics by stable ordinal keys.
- Support only a same-file immutable resolver flow: a named imported recipe is passed as a property/shorthand value to `useThemedStyles`; the resulting local property is passed directly to `createComponentRecipeResolver`, optionally as the arrow result of `useMemo`; local `const result = resolver(...)` bindings may then use static `result.slot` member access. Recognize the helpers only as named imports from `@opsydyn/crumbs-css/theme` and `@opsydyn/crumbs-css/theme/core` respectively; preserve local aliases. Computed members, reassignment, destructuring, shadowing, arbitrary wrappers, and unresolved flows block the invocation.
- `SourceMigrationPlan` returns the canonical-plan report and one `{ path, source, changed }` output per explicit input file. The planner never writes. If any source diagnostic blocks, every output is the original source and every file is reported unchanged/blocked; no safe subset is returned for writing.
- A token or slot migration that has no match in one file is a no-op, not evidence that omitted files have no references. The report always states explicit-file-only coverage.

- [ ] **Step 1: Write failing tests** named `traces-use-themed-styles-through-direct-resolver`, `traces-resolver-created-inside-use-memo`, `rewrites-static-slot-members-on-immutable-result-bindings`, `blocks-computed-shadowed-reassigned-and-wrapper-flows`, `plans-explicit-files-without-reading-disk`, `sorts-results-independent-of-file-input-order`, `returns-original-text-for-all-files-when-one-file-is-blocked`, and `is-idempotent-after-a-successful-plan`. The property test generates static member paths and edit order permutations.
- [ ] **Step 2: Run** `bun test packages/css/test/migration-plan.test.ts packages/css/test/migration-plan.property.test.ts`. Expected: FAIL because the public pure planner does not exist.
- [ ] **Step 3: Implement** local immutable resolver binding analysis and the pure aggregator. Hash UTF-8 source with SHA-256; record before/after digests, proposed counts, zero applied counts, and stable blocking diagnostics. On a blocked invocation, return original text for every file.
- [ ] **Step 4: Run** `bun test packages/css/test/migration-plan.test.ts packages/css/test/migration-plan.property.test.ts packages/css/test/migration-token-codemod.test.ts packages/css/test/migration-component-codemod.test.ts`. Expected: deterministic output under file/edit permutations, no partial plans on blockers, and a second plan produces identical text and digests.
- [ ] **Step 5: Run** `git diff --check`; stage the planner, resolver updates, and two tests; commit as `feat: compose deterministic source migration plans`.

### Task 5: Add explicit-file dry-run and atomic-write CLI

**Files:**
- Create: `scripts/m9-5-migrations.ts`
- Create: `packages/css/test/migration-cli.test.ts`
- Modify: root `package.json`

**Interfaces:**
- Export `parseSourceMigrationArgs(args)` returning required `migrationPath`, `baselinePath`, `currentPath`, repeatable `filePaths`, optional `write: true`, and `format: "text" | "json"`.
- Command: `bun run migrate:source -- --migration <migration.json> --baseline <manifest.json> --current <manifest.json> --file <source.ts> [--file <source.tsx> ...] [--write] [--format text|json]`. Every input path is explicit; no default files, glob expansion, or directory walk.
- CLI reads/decodes all metadata and source files before planning. A blocker returns exit 1 and writes none of the named files. Input/parse/schema errors return 2. A dry-run returns 0 for a safe plan and writes only the report to stdout. A successful `--write` atomically replaces each changed file using a same-directory temporary file, then sets applied counts/statuses in the report. A later IO error returns 2 and records which per-file replacements completed or failed with stable codes and relative paths, never raw OS error text.
- Normalize display paths relative to invocation directory and reject duplicate normalized input paths. Do not serialize resolved absolute paths. Preserve original file mode when replacing a file.

- [ ] **Step 1: Write failing tests** named `requires-all-migration-and-manifest-inputs-and-one-file`, `accepts-repeatable-file-flags-and-write-switch`, `rejects-duplicate-singletons-unknown-options-and-duplicate-normalized-paths`, `malformed-source-and-unreadable-input-return-two`, `dry-run-leaves-source-and-sentinel-files-byte-identical`, `blocks-every-write-if-one-explicit-source-is-ambiguous`, `writes-only-named-files-after-clear-preflight`, `second-cli-run-writes-no-change`, `reports-before-after-digests-and-applied-counts`, `returns-defined-zero-one-two-exit-codes`, `reports-write-failure-with-stable-code`, and `renders-equivalent-text-and-canonical-json`.
- [ ] **Step 2: Run** `bun test packages/css/test/migration-cli.test.ts`. Expected: FAIL because the CLI and root command do not exist.
- [ ] **Step 3: Implement** strict parsing, named input reads, JSON decoders, report rendering, whole-invocation preflight, same-directory temp-file replacement, mode preservation, and honest per-file write-failure reporting. Do not write during planning or when any file is blocked.
- [ ] **Step 4: Run** `bun test packages/css/test/migration-cli.test.ts packages/css/test/manifest-check-cli.test.ts packages/css/test/policy-check-cli.test.ts`. Expected: migration behavior passes and existing explicit-file CLIs remain unchanged.
- [ ] **Step 5: Run** `git diff --check`; stage only the CLI, test, and root script change; commit as `feat: add safe source migration CLI`.

### Task 6: Export and qualify the isolated tooling API

**Files:**
- Create: `packages/css/src/tooling/migrations.ts`
- Create: `packages/css/test/migration-export.test.ts`
- Modify: `packages/css/tsdown.config.ts`
- Modify: `packages/css/package.json`
- Modify: `packages/css/test/packed-export-contract.test.ts`
- Modify: `packages/css/test/pack-consumer-contract.test.ts`
- Modify: `packages/css/test/runtime-isolation.test.ts`
- Modify: `packages/css/test/packed-runtime-graph.test.ts`

**Interfaces:**
- `./tooling/migrations` exports map/report tags and plain types, `decodeSourceMigration`, `decodeSourceMigrationReport`, `encodeCanonicalSourceMigrationReport`, and `planSourceMigration`; it exports no Effect Schema, codec, or TypeScript AST objects.
- Build/export targets are `dist/tooling-migrations.mjs`, `.cjs`, and `.d.mts` in the compiler/tooling graph. Register the subpath in `packages/css/package.json` and `toolingEntries` in tsdown.
- Declare TypeScript `>=5.9 <7` as an optional peer dependency for consumers that import the migration tooling; keep the repository's existing TypeScript devDependency for local CLI and tests. The packed ESM/CommonJS planner contract exercises TypeScript 6.0.3 because an optional peer still causes npm installation to fail when its range excludes a consumer's TypeScript version. The optional peer does not enter ordinary React Native runtime graphs.
- Packed ESM/CommonJS/type tests prove the subpath resolves when TypeScript is present; graph tests prove root/style/theme/theme-core/tokens/optic and production Expo graphs cannot reach migrations, Effect Schema, or TypeScript.

- [ ] **Step 1: Write failing tests** named `exports-plain-migration-api-and-version-tags`, `resolves-packed-migration-entry-in-esm-commonjs-and-types`, `declares-optional-typescript-tooling-peer`, and `keeps-migrations-typescript-and-effect-out-of-runtime-graphs`. Assert the exact three packed target paths and absence of AST/schema implementation objects from exports.
- [ ] **Step 2: Run** `bun test packages/css/test/migration-export.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts packages/css/test/packed-runtime-graph.test.ts`. Expected: FAIL because no migration subpath is built or exported.
- [ ] **Step 3: Implement** the public re-export module, tool-entry build, package export targets, and optional TypeScript peer metadata. Update graph fixtures/classification only to express the new opt-in tooling entry; do not weaken existing runtime denials.
- [ ] **Step 4: Run** `bun run build` and the five focused tests above. Expected: packed ESM/CommonJS/declarations resolve with the optional tooling peer installed and all ordinary graphs remain isolated.
- [ ] **Step 5: Run** `git diff --check`; stage only export/build/package/runtime tests; commit as `feat: publish isolated migration tooling API`.

### Task 7: Fixture-qualify, document, and close roadmap item M9.5

**Files:**
- Create: fixtures under `packages/css/fixtures/m9-5-migrations/`
- Create: `scripts/m9-5-migrations-qualification.ts`
- Create: `packages/css/test/migration-qualification.test.ts`
- Create: `docs/evidence/2026-09-28-m9-5-safe-migrations/qualification.json`
- Create: `docs/assessments/2026-09-28-m9-5-safe-migrations.md`
- Create: `docs/src/content/docs/how-to/migrate-design-system-sources.mdx`
- Modify: `packages/css/README.md`
- Modify: root `package.json` (`migrations:qualify`)
- Modify: `docs/roadmap.md`

**Interfaces:**
- Qualification reads only checked-in fixtures, runs dry-run and write behavior in a disposable temp directory, and emits canonical report/receipt data with SHA-256 digests, gate names, proposed/applied counts, and explicit coverage. It contains no absolute paths, raw OS error text, or implicit timestamps. Register `migrations:qualify` at the repository root.
- The guide documents map v1, manifest validation, explicit file lists, default dry-run, `--write`, blocked whole-invocation preflight, recognized syntax, optional TypeScript peer, and incomplete consumer coverage. The assessment records observed commands/results and distinguishes source-tool qualification from runtime, publication, and device acceptance.
- Mark M9.5 complete and recommend M9.6 only after all focused, package, docs, fixture, and distribution gates pass. Keep Android/device acceptance not-run and parked.

- [ ] **Step 1: Write failing tests** named `qualifies-explicit-token-and-recipe-slot-fixtures`, `records-digests-and-plan-write-counts`, `is-repeatable-without-absolute-paths-or-time`, and `proves-blocked-fixture-does-not-change-any-source`. Hash inputs and reports and compare repeated runs byte-for-byte.
- [ ] **Step 2: Run** `bun test packages/css/test/migration-qualification.test.ts`. Expected: FAIL because fixtures and qualification evidence do not exist.
- [ ] **Step 3: Implement** minimal baseline/current manifests, migration map, token/recipe source and consumer fixtures, and qualification script. Generate the receipt only from those explicit files.
- [ ] **Step 4: Document** the API/CLI and observed boundaries in the how-to, package README, and assessment. Update `docs/roadmap.md` only after the complete gate succeeds; link the qualification receipt and assessment.
- [ ] **Step 5: Run** `bun run check`; `bun run docs:build`; `bun scripts/m9-5-migrations-qualification.ts`; `bun scripts/playground-distribution.ts --m8-3-check`; and `bun test packages/css/test/migration-*.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts packages/css/test/packed-runtime-graph.test.ts`. Expected: all applicable checks pass; the receipt is deterministic; Android/device acceptance remains not-run.
- [ ] **Step 6: Run** `git diff --check`; stage only M9.5 fixtures, qualification, docs, evidence, and roadmap; commit as `docs: qualify M9.5 safe source migrations`.

### Task 8: Fast-forward local main after M9.5 qualification

**Files:**
- Git refs only: `main` and `codex/m9-5-migrations`.

**Interfaces:**
- This task starts only after Task 7's final qualification commit. Preserve the feature branch, do not push/publish, and do not alter the primary checkout's pre-existing release edits.

- [ ] **Step 1: Verify** `git worktree list --porcelain` shows `main` is not checked out, `git status --short --branch` has no source changes, and `git merge-base --is-ancestor main codex/m9-5-migrations` succeeds.
- [ ] **Step 2: Fast-forward** the local `main` ref to `codex/m9-5-migrations` with `git branch --force main codex/m9-5-migrations` only after the ancestry and worktree checks succeed.
- [ ] **Step 3: Verify** `git rev-parse main` and `git rev-parse codex/m9-5-migrations` return the same M9.5 closeout commit; retain the feature branch and make no remote changes.

## Completion and handoff

After every implementation-task commit, report its hash, focused evidence, and the next numbered M9.5 task. At close, report the complete gate results, receipt and assessment paths, remaining source-analysis limits, and the next roadmap item: **M9.6 DTCG 2025.10 format/resolver adapter**. Android/device acceptance stays parked.
