# M9.5 Safe Source Migrations

**Status:** Draft for user review; implementation is not approved yet.

**Date:** 2026-09-28

**Roadmap:** M9.5 in [roadmap.md](../../roadmap.md)

**Governing decisions:** D5, D9, D10, D11 and D12 in the [design-system ADR](../../decisions/adopt-native-design-system-compiler.md)

**Depends on:** [M9.1 deterministic manifests](2026-09-27-m9-1-deterministic-manifest-design.md), [M9.2 manifest compatibility checks](2026-09-27-m9-2-manifest-compatibility-design.md), and [M9.4 versioned design-system policies](2026-09-28-m9-4-policy-presets-design.md)

## Intent

Give design-system maintainers a safe, reviewable way to migrate explicitly selected TypeScript sources when a token or component recipe is replaced. Stable manifest identities and an explicit versioned migration map define what may change. A dry-run report explains every proposed edit and every unsupported use before any source is written.

The migration tool is a local development tool. It does not claim complete consumer coverage, decide whether a release is compatible, or make source edits outside the paths the caller names.

## Approved understanding

- M9.5 is the next roadmap item. The user approved a separate, versioned migration document that references M9.1 stable IDs and explicitly binds token and component replacements, including component slot-name mappings.
- Preserve manifest v1 and the existing M9.2 and M9.4 report formats. Migration maps and migration reports have independent versions.
- Read and write only explicitly named migration, manifest, and TypeScript/TSX files. Do not discover files, load a project graph, crawl the workspace, or infer unlisted consumers.
- Use TypeScript AST parsing and minimal source-span edits. Preserve all unaffected source text. Unsupported or ambiguous references must be reported and left unchanged.
- Dry-run is the default. `--write` is an explicit opt-in; repeated application is a no-op.
- Keep Effect 4 Schema and compiler/tooling code out of ordinary theme, style, and React Native runtime entrypoints. Public migration data remains plain TypeScript records.
- Android and device acceptance remain parked.

## Existing baseline and gap

M9.1 manifests identify token and component contracts, token paths, component slot names, origins, and optional lifecycle replacement IDs. A manifest component does not carry a slot-to-slot replacement map. M9.2 deliberately does not record source-level component usage, and its supplied consumer manifests only prove the dependency edges they contain. These facts can validate a declared migration but cannot identify every application that needs it.

Crumbs already depends on TypeScript for authoring-time tooling and uses Effect 4 Schema at tooling boundaries. There is no source migration API or command. The migration must therefore remain an opt-in tooling subpath and require callers to supply the old and new manifests plus each source file to inspect.

## Goals

- Define a versioned JSON migration map with stable IDs for each replaced token or component and explicit old/new import bindings.
- Validate replacement IDs against explicitly supplied baseline and current schema-v1 manifests. When the old manifest declares a replacement, require it to agree with the migration map; reject external, missing, stale, or conflicting targets rather than guessing.
- Require a complete explicit slot mapping for a component migration. Every old slot must map to a slot present on the replacement component. Do not infer same-name mappings or silently discard slots.
- Parse only named `.ts` and `.tsx` files. Identify supported references from their import bindings and static syntax; report unsupported syntax with a stable code and source location.
- Produce a deterministic plan with per-file before/after SHA-256 digests, proposed edit counts, blocked references, and coverage limits.
- Keep planning pure: provide source text and explicit metadata as inputs, receive planned outputs and diagnostics as data, and leave file IO to the CLI.
- Make dry-run the default and require `--write` to write. If preflight finds any blocked reference in the invocation, write no files. Stage and atomically replace each named file only after preflight succeeds.
- Verify dry-run immutability, repeat-run idempotence, strict changed-file boundaries, deterministic reports, and fail-closed behavior for ambiguous or unsupported edits.
- Keep parsing bounded to the files supplied by the caller. Do not load `tsconfig`, resolve arbitrary imports, create a TypeScript program, or traverse project directories.

## Non-goals

- Do not change M9.1 manifest v1, M9.2 compatibility-report v1, M9.4 policy/report formats, token/recipe authoring APIs, or production style output.
- Do not scan files or directories, follow imports into other files, fetch packages, read Git state, modify lockfiles, or make release decisions.
- Do not promise that all consumers or all uses of a replaced entity have been found. Coverage is limited to the explicitly supplied source files and recognized syntax.
- Do not migrate variant names or values, infer slot mappings, transform arbitrary strings, rewrite computed property access, rewrite dynamic imports, or make semantic/type-level changes.
- Do not add a runtime dependency or import migration tooling from normal app entrypoints.
- Do not add Android or physical-device acceptance.

## Selected architecture

Add an opt-in `@opsydyn/crumbs-css/tooling/migrations` subpath with focused modules for migration-map schema/model, pure planning, AST reference recognition, report schema/canonical encoding, and filesystem orchestration in a repository-local CLI. Use Effect 4 Schema to decode and validate migration maps and reports; exported values remain ordinary TypeScript data. Use the existing TypeScript compiler API as a parser, without constructing a project program or resolving files. Add no product runtime dependency.

Keep the migration planner pure. Conceptually:

```ts
const plan = planSourceMigration({
  migration,
  baseline,
  current,
  files: [{ path: "src/button.css.ts", source }],
})
```

It returns a versioned report and a planned output for each explicitly supplied file. It does not read or write the filesystem. The CLI reads the named inputs, calls the same planner, prints its report, and writes planned outputs only when `--write` is present and the full preflight is clear. The `./tooling/migrations` entrypoint remains separate from the package root and every runtime entrypoint; packed exports, ordinary runtime graphs, and production Metro qualification must prove that boundary.

## Migration map v1

The document uses a distinct format identifier and schema version, plus a non-empty stable migration ID, positive revision, provider package name, and `tokens` and `components` arrays. Both arrays are required; at least one mapping across them is required. The fields shown below are the complete v1 shape: unknown fields are rejected. Import bindings identify named exports with identifier names; default, namespace, and `require` imports are outside v1.

```json
{
  "format": "crumbs.source-migration",
  "schemaVersion": 1,
  "id": "design-system/2026-09-token-and-button-migration",
  "revision": 1,
  "provider": "@example/design-system",
  "tokens": [
    {
      "fromId": "@example/design-system/tokens@1#5:color/6:accent",
      "toId": "@example/design-system/tokens@2#5:color/5:brand",
      "fromImport": { "moduleSpecifier": "../tokens-v1.css", "importedName": "tokens" },
      "toImport": { "moduleSpecifier": "../tokens.css", "importedName": "tokens" }
    }
  ],
  "components": [
    {
      "fromId": "@example/design-system#button@1",
      "toId": "@example/design-system#action-button@2",
      "fromImport": { "moduleSpecifier": "../button.css", "importedName": "button" },
      "toImport": { "moduleSpecifier": "../action-button.css", "importedName": "actionButton" },
      "slots": { "root": "container", "label": "label" }
    }
  ]
}
```

The provider name must match both manifest package names. A token mapping contains `fromId`, `toId`, and explicit old/new import bindings (`moduleSpecifier` and `importedName`). The token paths come from the matching baseline/current manifest records, not duplicated free-form path strings. IDs must exist in the correct manifest, `fromId` must differ from `toId`, and both manifest tokens must have the same domain before the tool rewrites a reference.

A component mapping contains `fromId`, `toId`, explicit old/new import bindings, and a `slots` record mapping every old slot name to its replacement slot name. The baseline and current manifests must contain the named IDs; the source slot set must match the map exactly and every target slot must exist. Many old slots may intentionally map to one new slot because each source mapping is explicit. Duplicate source IDs, conflicting mappings for one source import/path, invalid import names, missing slots, unknown targets, and conflicting lifecycle replacement metadata are schema or input errors.

The migration map is the explicit source-edit contract. M9.1 lifecycle replacement metadata remains provider-authored evidence: if it names a declared replacement, the migration map must match it. A missing lifecycle annotation does not authorize inference, but an otherwise valid explicit map can still be used. An `external` lifecycle replacement is never followed or rewritten.

No wildcard, glob, regular-expression, source-root, or fallback mapping is permitted.

## Recognized edits and fail-closed cases

The planner uses imports declared in the migration map to identify source bindings. It edits only static, syntactically recognized references:

| Migration | Supported reference shapes |
| --- | --- |
| Token | Named import of the mapped token contract followed by a static property path equal to the old token path. Rewrite the import binding and path to the declared replacement. |
| Recipe slots | A mapped component recipe import used in a recognized `componentRecipe`/component-extension declaration. Rewrite the mapped import and static slot keys in `slots`, `base`, variant style branches, compound `styles`, and supported slot-override maps. Variant axes and values remain unchanged. |
| Consumer slots | Static member accesses on resolver output whose local immutable binding can be traced through the documented direct resolver pattern to the mapped recipe. Rewrite only the member name according to the slot map. |

The parser may recognize local aliases only when their binding is unambiguous in the same file. Computed access such as `tokens[colorName]` or `styles[slot]`, destructuring, reassignment, shadowed import bindings, arbitrary wrapper/helper calls, unresolved recipe data flow, string-based references, JavaScript files, and unfamiliar syntax produce a stable unsupported/ambiguous diagnostic. The affected source is not partially rewritten. The tool does not use a type checker to claim semantic resolution.

Edits are represented as source spans, checked for overlap, and applied from the end of the file toward the beginning. A second run sees no old binding/path/slot references and produces identical source and digests. No formatter is run; bytes outside selected spans remain unchanged.

## CLI, reports, and write behavior

Add a repository command with explicit inputs:

```text
bun run migrate:source -- \\
  --migration <migration.json> \\
  --baseline <baseline-manifest.json> \\
  --current <current-manifest.json> \\
  --file <source.ts> [--file <source.tsx> ...] \\
  [--write] [--format text|json]
```

All options except `--file` are single-use. At least one source file is required. The command accepts only named files, reads only those paths, and never expands globs. Without `--write`, it writes no source files. With `--write`, it first validates every input and plans every source file. If any file has an unsupported or ambiguous target reference, no file is written and the report identifies the blocked files. If preflight succeeds, each named file is replaced atomically from a same-directory temporary file; an IO error is reported and no claim of a multi-file filesystem transaction is made.

The report has its own format identifier and version. It contains the migration ID/revision, provider identity, explicitly supplied baseline/current identities, source file statuses, relative display paths, before/after digests, proposed/applied edit counts, stable diagnostics with line/column locations, and analysis limits. It contains no absolute paths, machine identity, current time, or inferred consumer list. Display paths are normalized relative to the invocation directory; reports never serialize the resolved filesystem path. JSON output is canonical and findings/files are sorted by stable keys. Text and JSON report the same plan.

Exit codes are:

- `0` when the migration validates and every supplied source is safely planned; a dry run may report proposed edits with this code.
- `1` when a recognized target reference is unsupported or ambiguous, so the invocation is blocked without writes.
- `2` for invalid arguments, unreadable files, malformed JSON/source, unsupported schema versions, manifest identity mismatches, invalid migration bindings, or write failures.

The report states that only explicitly supplied files were analyzed and that M9.1 manifests do not prove complete source-consumer coverage. A clean plan means only that the named inputs contained no unsupported references in the syntax the planner recognizes.

## Acceptance evidence

1. Effect 4 Schema tests pin migration-map and report format/version tags and reject malformed fields, duplicate mappings, invalid import bindings, unsupported versions, and unknown or conflicting manifest IDs.
2. Manifest validation tests cover declared replacements that agree/disagree with the map, external replacements, missing lifecycle metadata, token domain mismatches, and complete component slot-map validation. Primitive-kind compatibility is documented as unproven where manifest v1 lacks that evidence.
3. AST fixtures cover token import/path renames; recipe slot keys in base, variants, compounds and extensions; resolver member accesses through the supported local pattern; aliases; and unchanged variant axes/values.
4. Fail-closed fixtures cover computed access, destructuring, shadowed/reassigned bindings, unknown syntax, incomplete local data flow, duplicate/overlapping edits, parse errors, and references that cannot be attributed. A blocked invocation leaves all named source bytes unchanged.
5. Dry-run tests prove byte-for-byte source immutability. Write tests prove only explicitly named files change, unrelated sentinel files remain byte-identical, and each changed file has the planned digest.
6. Repeat-run tests prove that a successfully migrated source produces zero edits and identical before/after digests on the next run. Property tests using `fast-check` exercise non-overlapping edit order, deterministic results under input-file permutation, and idempotence over generated static access cases.
7. CLI tests invoke the real command for text and canonical JSON, repeated `--file` arguments, default dry-run, `--write`, blocked preflight, exit codes 0/1/2, unreadable files, and no directory/glob discovery.
8. Parser qualification confirms one parse per explicitly supplied file, no `tsconfig`/project graph loading, and work bounded by input bytes plus recognized AST nodes/edits. This is a tooling parse-cost check; it makes no runtime-performance claim.
9. Packed ESM/CommonJS/type consumers and package graph checks prove the new entrypoint is opt-in and does not enter ordinary style/theme/runtime or production Metro bundles.
10. Documentation shows how to produce and review a migration map, interpret dry-run digests and unsupported-reference diagnostics, invoke `--write`, and understand explicit-file coverage limits.
11. Fixture-backed qualification records migration/manifest/source/report digests and passing gates without absolute paths or timestamps. Android and device acceptance remain not-run and parked.

## Risks and mitigations

- **A clean report could be mistaken for complete usage coverage.** Require explicit files, report their exact normalized paths, and state that omitted consumers are unknown.
- **A codemod could corrupt syntax or apply a plausible but wrong edit.** Use exact AST shapes and explicit import bindings; reject ambiguous references; validate non-overlapping spans; preflight all files before writing; keep source bytes outside edits unchanged.
- **A stable ID could point at an incompatible replacement.** Validate both manifests, require lifecycle replacement agreement when declared, require token-domain equality and validate component slot names, and document primitive-kind or semantic compatibility evidence absent from manifest v1.
- **A partial multi-file write could leave a workspace mid-migration after an IO failure.** Preflight every file before writing and atomically replace each file; report per-file write status and do not claim a multi-file transaction.
- **Tooling could leak into app bundles.** Keep the API in a tooling-only export and retain packed export, runtime-graph, and Metro bundle checks.
- **AST parsing could become a workspace-wide or TypeScript-project scan.** Accept source text only in the pure API and explicit file flags in the CLI; prohibit glob expansion, `tsconfig` discovery, and module resolution.

## File boundaries

Expected implementation areas are a new `packages/css/src/tooling/migrations/` module family and tooling export; the package export/build entry configuration; a repository-local M9.5 CLI and root command; focused schema, AST, pure-planner, CLI, property, and packed-consumer tests; versioned migration/manifest/source fixtures; developer documentation; and M9.5 roadmap/qualification evidence. Do not alter manifest v1, compatibility or policy report schemas, ordinary runtime entrypoints, authoring APIs, release workflows, or platform gates.
