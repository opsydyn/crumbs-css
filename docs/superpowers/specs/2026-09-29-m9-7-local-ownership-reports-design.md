# M9.7 Local Ownership Metadata and Report Adapters

**Status:** In-chat architecture approved; written spec pending user review; implementation not approved.
**Date:** 2026-09-29
**Roadmap:** M9.7 in [roadmap.md](../../roadmap.md)
**Governing decisions:** D5, D9, D10, D11 and D12 in the [design-system ADR](../../decisions/adopt-native-design-system-compiler.md)
**Depends on:** [M9.1 manifests](2026-09-27-m9-1-deterministic-manifest-design.md), [M9.2 compatibility reports](2026-09-27-m9-2-manifest-compatibility-design.md), [M9.3 style explanations](2026-09-27-m9-3-style-explanations-design.md), [M9.4 policies](2026-09-28-m9-4-policy-presets-design.md), [M9.5 migrations](2026-09-28-m9-5-safe-migrations-design.md), and [M9.6 DTCG tooling](2026-09-28-m9-6-dtcg-adapter-design.md)

## Intent

Let design-system teams attach clear ownership to local compatibility, policy, migration, style-explanation, and DTCG outputs. Ownership is resolved from exact stable entity identities in explicitly supplied manifests. The output remains deterministic, reviewable JSON that future editor or design-tool adapters can consume without a hosted account or external telemetry.

Ownership is organizational metadata, not part of a portable design-system contract. M9.7 keeps it in a separate local document and leaves manifest v1 and existing source report versions unchanged.

## User-approved understanding

- Use a separate, versioned local ownership map keyed by stable manifest entity IDs.
- Attribute report references deterministically and expose the result in a versioned JSON contract suitable for future adapters.
- Preserve manifest v1, existing report formats, the ordinary React Native runtime boundary, and local-only operation.
- Keep actual editor/design-tool integrations optional; M9.7 establishes a stable adapter input contract and does not select a host, require an account, or send telemetry.
- Android and device acceptance remain parked.

## Existing baseline and gap

M9.1 manifests provide globally qualified token IDs and component IDs, but do not include team ownership. M9.2 compatibility findings identify an entity ID; M9.4 policy findings and diagnostics identify a subject ID; M9.5 migration diagnostics may identify an entity ID; M9.6 DTCG diagnostics and provenance carry Crumbs token IDs. M9.3 style explanations carry token variable names and may carry contract identity inside token values, but do not consistently expose a manifest entity ID at every reference.

These tools currently emit versioned local data without an organizational attribution layer. There is no shared ownership file, resolver, report envelope, or command. Adding team fields to manifest v1 would mix local governance into the portable interchange artifact and require changing an established schema. Extending each existing report independently would also create several ownership representations and force unrelated report-version changes.

## Goals

- Define a strict, versioned ownership document with owner identifiers, display names, and exact assignments to token or component IDs.
- Resolve assignments only when the entity is present in one of the explicitly supplied, decoded M9.1 manifests.
- Produce one versioned owned-report envelope that retains its validated source report and records per-reference attribution as `assigned`, `unassigned`, or `unresolved`.
- Support existing versioned report families where a reference can be joined to stable token/component IDs, including partial attribution with explicit limits when a subject is not a manifest entity or has no stable identity.
- Provide a pure TypeScript API and an explicit-file local command. Neither discovers manifests or reports by crawling a checkout.
- Publish ordinary TypeScript types, decoders, and canonical JSON behavior through a tooling-only package subpath for local scripts and future adapters.
- Use Effect 4 Schema internally and `fast-check` for useful generated invariants. Add no dependency.
- Prove that ownership tooling remains outside ordinary style, theme, token, and app-runtime exports.

## Non-goals

- Do not add ownership fields to manifest v1, token/component authoring APIs, compiler runtime records, or existing report schemas.
- Do not infer owners from package names, source paths, CODEOWNERS, Git history, naming conventions, policy IDs, or external services.
- Do not support path globs, wildcard assignments, default owners, inherited ownership, multiple owners for one entity, owner escalation rules, or automatic routing.
- Do not include email addresses, access tokens, hosted workspace IDs, or other account credentials in the owner record.
- Do not implement a VS Code extension, Figma plugin, hosted design-tool connector, editor diagnostics transport, or telemetry. Future adapters consume the versioned manifest, ownership, and owned-report data through a separately approved integration.
- Do not claim that an explicit manifest or report represents every entity or consumer in a repository.
- Do not change release automation, publish a package, or add Android/device acceptance.

## Approaches considered

1. **Store ownership in manifest v1 or a manifest v2.** This makes ownership directly available to every manifest consumer, but puts team-specific governance in a portable contract and requires schema-version migration across tooling. Reject for M9.7.
2. **Keep ownership in a separate local map and wrap existing reports with attribution.** Exact stable IDs join the map to explicit manifests and report references. Existing report schemas remain unchanged, while adapters get one stable envelope. **Select this approach.**
3. **Read CODEOWNERS or source paths during report generation.** This is familiar in code-hosting workflows but couples attribution to repository layout and discovery, and can turn partial paths into false entity ownership. Defer unless a concrete path-based workflow is approved later.

## Selected architecture

Add `@opsydyn/crumbs-css/tooling/ownership`, separate from all application runtime entrypoints. Its modules define the plain-data model, Effect Schema decoders, stable manifest-entity lookup, report-reference adapters, and canonical owned-report encoding. The exported API exposes only ordinary TypeScript data; schema ASTs stay private.

The core operation is pure and conceptually accepts:

```ts
const owned = annotateDesignSystemReport({
  ownership,
  manifests,
  report,
})
```

`ownership` is one decoded ownership document. `manifests` is a non-empty, explicit list of decoded M9.1 manifests, commonly baseline and current for comparison or migration reports. `report` is a supported, decoded report value. The operation does not read files, inspect the current directory, resolve imports, or mutate its inputs. The repository command is a thin file adapter around this API.

The output uses a new format, `crumbs.design-system-owned-report`, with its own schema version. It contains a normalized source format/version descriptor and the validated source report data, the ownership-map format/version, per-reference attribution records, and analysis limits. Existing source reports are nested, not edited in place; a consumer can inspect the original finding and join it to its attribution by the recorded RFC 6901 JSON Pointer. The style-explanation adapter normalizes its `$$type`/`version` tags to the descriptor fields. The DTCG operation-result union has no top-level format on failure, so its adapter profile is `crumbs.dtcg-import-result` version 1 for both success and failure. This avoids changing the meaning or version of M9.2–M9.6 reports.

The envelope has this stable structure; `SupportedSourceReport` is the union of the five report inputs in the table below, `source.data` is the validated source value, and every pointer in `attributions` addresses that nested value:

```ts
type OwnedReport = {
  readonly format: "crumbs.design-system-owned-report"
  readonly schemaVersion: 1
  readonly source: {
    readonly format: string
    readonly schemaVersion: number
    readonly data: SupportedSourceReport
  }
  readonly ownership: {
    readonly format: "crumbs.design-system-ownership"
    readonly schemaVersion: 1
  }
  readonly attributions: ReadonlyArray<
    | { readonly jsonPointer: string; readonly entityId: string; readonly status: "assigned"; readonly owner: { readonly id: string; readonly displayName: string } }
    | { readonly jsonPointer: string; readonly entityId: string; readonly status: "unassigned" }
    | { readonly jsonPointer: string; readonly entityId?: string; readonly status: "unresolved"; readonly reason: "stable-id-unavailable" | "entity-not-in-supplied-manifests" | "variable-name-ambiguous" }
  >
  readonly analysisLimits: ReadonlyArray<{ readonly code: "explicit-manifests-only" | "manifest-unresolved-references" | "report-subject-unresolved"; readonly message: string }>
}
```

An attribution's `owner` is present only for `assigned`; `entityId` is omitted when no stable identity was available, and `reason` is present only for `unresolved`. The wrapper adds no filesystem paths, machine identity, or implicit timestamp. Preserved source data retains only the relative paths allowed by its source-report schema; absolute filesystem paths are not serialized.

## Ownership document v1

The complete v1 document is plain JSON:

```json
{
  "format": "crumbs.design-system-ownership",
  "schemaVersion": 1,
  "owners": [
    { "id": "team:foundations", "displayName": "Foundations" },
    { "id": "team:components", "displayName": "Components" }
  ],
  "assignments": [
    { "entityId": "@example/tokens@1#5:color/6:accent", "ownerId": "team:foundations" },
    { "entityId": "@example#button@2", "ownerId": "team:components" }
  ]
}
```

Owner IDs and display names are non-empty, trimmed, control-free strings; IDs are stable local identifiers and display names are human-readable labels. Entity IDs are compared byte-for-byte with IDs in decoded manifests. An assignment targets exactly one manifest token or component ID; the owner ID must exist in `owners`. Duplicate owner IDs, duplicate entity assignments, invalid text, and unsupported versions fail validation. Entity IDs are safe-text checked and then matched exactly; their syntax is not independently parsed. V1 does not represent joint ownership or an implicit fallback. An entity without an assignment remains valid and is reported as unassigned.

Ownership assignments are resolved only against token and component records in the manifests supplied to the operation. Manifest module paths and arbitrary policy subjects are not treated as stable entities. A map may contain assignments for entities outside the supplied manifest set; the operation does not claim those assignments were checked. Its output records that resolution is bounded by the supplied manifests and their declared coverage.

## Report reference behavior

Each supported reference is emitted as an attribution with its location in the nested source report, the resolved manifest entity ID when available, and a status:

- `assigned`: the location resolves to a token or component in an explicit manifest and exactly one owner assignment exists.
- `unassigned`: the location resolves to a token or component in an explicit manifest, but the ownership map has no assignment for it.
- `unresolved`: the reference has no stable ID, names no token/component in the supplied manifests, or depends on evidence unavailable from the supplied inputs. The record includes a stable reason code.

The v1 report adapters cover:

| Source | References attributed |
| --- | --- |
| M9.2 manifest compatibility report v1 | Each finding's `entityId`; consumer references remain unchanged and do not inherit the consumer package's ownership. |
| M9.4 design-system policy report v1 | Each finding and exception diagnostic `subjectId` when it identifies a supplied manifest token or component. Declaration, capability, and measurement subjects outside the manifest remain unresolved. |
| M9.5 source migration report v1 | Each diagnostic with an `entityId`; file-level statuses and diagnostics without an entity ID remain unresolved. |
| M9.6 DTCG import result v1 | Each token in successful import provenance and each diagnostic with `crumbsTokenId`; document-only diagnostics remain unresolved. The adapter profile is `crumbs.dtcg-import-result` v1 because the failure branch has no top-level format/version tags. |
| M9.3 style explanation report v1 | Declared, active, and changed token references are matched by exact generated variable name against supplied manifest token identities. Other report subjects remain unresolved; no source path or recipe owner is inferred. |

Every attribution points to the exact source-report location using an RFC 6901 JSON Pointer. A token variable name in a style explanation is accepted only if it maps to exactly one token in the explicit manifest set. Missing or ambiguous matches are unresolved. The implementation does not derive token IDs from names or use token display paths as a substitute for identity.

The wrapper's `analysisLimits` uses the v1 codes `explicit-manifests-only`, `manifest-unresolved-references`, and `report-subject-unresolved`. It always includes `explicit-manifests-only`, includes `manifest-unresolved-references` when a supplied manifest reports unresolved coverage, and includes `report-subject-unresolved` when any attribution is unresolved. It carries forward M9.1 unresolved-reference coverage where present. An unresolved attribution uses one of the stable reasons `stable-id-unavailable`, `entity-not-in-supplied-manifests`, or `variable-name-ambiguous`. It never labels unresolved or unassigned results as owned and never claims repository-wide coverage.

## Local command and data flow

Add a root command with explicit inputs:

```text
bun run ownership:annotate -- \
  --ownership <ownership.json> \
  --manifest <manifest.json> [--manifest <manifest.json> ...] \
  --report <report.json> \
  [--format json|text]
```

`--ownership`, `--report`, and at least one `--manifest` are required. Repeat `--manifest` is allowed; other options are single-use. No globs or directory inputs are expanded. The command reads only named files. JSON output is the canonical versioned owned-report envelope. Text output summarizes assigned, unassigned, and unresolved references and points to the corresponding source-report JSON Pointers; it does not replace or reinterpret source findings. Invalid arguments, malformed files, unsupported source report versions, conflicting identities, or invalid ownership data fail with actionable path-qualified diagnostics and exit code 2. Successful annotation exits 0 even when references are unassigned or unresolved; those states remain visible in output rather than becoming an implicit policy failure.

The caller is responsible for supplying the baseline/current manifests appropriate to the report. The command does not search build outputs or infer which manifest belongs to a report. Where a report declares provider identity/version, validate that the supplied manifests include the relevant package versions. For DTCG inputs, resolve the contract identity in the sidecar. For style explanations, perform exact variable-name lookup across the supplied manifest tokens.

## Determinism, validation, and resource behavior

All inputs are decoded into detached plain data before attribution. Reject duplicate package name/version manifest inputs. When the same stable token/component ID appears in multiple supplied manifests, deduplicate identical records and reject contradictory records. Sort attribution records by JSON Pointer, then stable entity ID and status; sort analysis limits by code and message. Preserve ordering inside the nested source report. Canonical encoding uses the existing recursively key-sorted JSON conventions and one trailing newline. Equivalent validated inputs produce byte-identical output.

Use exact identity lookup through maps built once from supplied manifests. Build an entity index for token and component IDs and a variable-name index for style explanation tokens. Reject ambiguous matches rather than picking the first record. The work is linear in the supplied manifest entities and report references, plus canonical serialization. Bound traversal of the nested style-explanation value/report data with explicit limits and return a stable resource diagnostic on overflow; do not recurse without a bound or silently omit references.

Malformed user data fails through schema diagnostics. A programming defect remains a defect. The tool never evaluates owner metadata, report values, JSON extensions, or scripts.

## Verification and documentation

- Test ownership map format/version, text constraints, unique owner/entity IDs, owner references, and rejection of malformed, accessor-bearing, non-JSON, and unsupported-version inputs.
- Test exact resolution for tokens and components; assigned, unassigned, and unresolved states; ambiguous variable-name resolution; unknown and duplicate manifest entities; and baseline-only entities used by removed-token findings.
- Test each supported source report adapter, including all documented reference locations and stable reason codes for missing IDs, unknown entities, unsupported subjects, and incomplete explicit coverage.
- Test that source reports and inputs are not mutated, JSON pointers refer to the preserved nested report, unowned entities never inherit an owner, and consumer package references are not attributed to provider teams.
- Use `fast-check` to test determinism under owner/assignment and independent manifest ordering, exact-match laws, no false attribution for non-matching IDs, and JSON-pointer/report-location stability.
- Test canonical JSON and text summaries against the same attribution data. Exercise the real CLI with explicit paths, repeated manifest flags, malformed inputs, unsupported report versions, and no directory or glob discovery.
- Build independent ESM, CommonJS, and type consumers for `tooling/ownership`. Extend packed runtime-graph checks to prove the new tooling entrypoint is isolated from ordinary package exports and production Metro bundles.
- Document the ownership file, stable-ID format, attribution status meanings, exact-input model, adapter contract, explicit coverage limits, and the absence of hosted accounts or telemetry.
- Record fixture and output digests in a local qualification receipt. Keep publication, release, device, visual, runtime-performance, and Android acceptance as separate gates; Android remains parked.

## Risks and mitigations

- **Ownership could leak into the shared design-system contract.** Keep the owner map and owned-report wrapper separately versioned; do not change manifest v1 or existing report versions.
- **A name or path could produce a false team assignment.** Resolve only exact token/component identities from supplied manifests; reject ambiguous variable-name matches and do not add path or naming fallbacks.
- **A partial report could look fully attributed.** Emit unassigned/unresolved statuses and explicit manifest/report coverage limits for every operation.
- **Different tools could invent incompatible owner formats.** Publish one plain JSON owner schema, one attribution model, and one owned-report wrapper from a tooling-only entrypoint.
- **Owner information could disclose personal or hosted-account data.** V1 permits only stable owner IDs and display names; no contact credentials or service bindings are present.
- **Tooling could enter application bundles.** Keep schemas, decoders, filesystem orchestration, and report adapters under the opt-in tooling subpath, and verify packed graph boundaries.

## File boundaries

Expected implementation areas are `packages/css/src/tooling/ownership/` for the model, schemas, canonical output, entity resolution, and report adapters; a `packages/css/src/tooling/ownership.ts` subpath entry; package export/build and packed-graph configuration; a root `ownership:annotate` command; focused fixtures, property tests, and qualification evidence; plus developer documentation and the M9.7 roadmap status. Do not alter manifest v1, M9.2–M9.6 source report schemas, authoring APIs, runtime entrypoints, release automation, or platform gates.
