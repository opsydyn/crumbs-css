# M9.6 DTCG Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in, deterministic DTCG 2025.10 Format and Resolver adapter that converts one explicitly selected design-token context into Crumbs' existing version-1 external theme payload.

**Architecture:** Keep import, validation, resolution, and conversion in a dedicated tooling subpath. Accept only caller-supplied in-memory documents and one M9.1 manifest; resolve the selected context into a typed token index, then produce a complete payload with inert provenance/metadata or stable origin-rich diagnostics. Do not add DTCG parsing to application runtime entrypoints.

**Tech Stack:** TypeScript, Effect 4 Schema (private tooling boundary), Bun, fast-check, tsdown, packed ESM/CommonJS/declaration consumers.

**Spec:** [M9.6 DTCG adapter design](../specs/2026-09-28-m9-6-dtcg-adapter-design.md)

## Global Constraints

- Effect 4 Schema validates tooling inputs. Schema/AST values remain private to the tooling implementation; app runtime callers keep plain Crumbs types and APIs.
- The adapter uses a selected, identified M9.1 token-contract manifest. Token names are matched by exact DTCG path, never guessed from values or group names.
- Resolver sets, source arrays, and resolution order retain their specified order. An explicit input selects one context per modifier; defaults apply when the input omits a modifier with a default. The adapter never expands all context permutations and never maps DTCG ordering onto Crumbs' fixed `brand` → `mode` → `density` precedence.
- The current version-1 payload constructor requires values for each non-alias token definition and rebuilds Crumbs aliases. Therefore the adapter emits values for every matching definition token in the target manifest, including private definitions. Visibility remains explicit in manifest metadata and the sidecar; it is not represented as value redaction. Crumbs alias IDs are not emitted as values.
- All source documents are explicitly supplied in memory under stable URI keys. A reference can resolve only to a document in that map. The core does not read the filesystem, make network requests, or load a hosted design-tool account.
- Accept exactly the three published Resolver version literals `2025-10-01`, `2025-11-01`, and `2025.10`; preserve the supplied literal in result metadata and reject other versions.
- Successful values use the existing `ExternalTokenThemePayload` version 1 shape. The public request/result/diagnostic API contains plain data; no Effect Schema, codec, or AST objects escape.
- This milestone provides an import API and documentation example; it does not add a filesystem CLI.
- No partial payload is returned when an error exists. Diagnostic and canonical output ordering is deterministic; malformed input becomes a diagnostic while internal defects remain defects.
- Resolve only the selected context and target contract; use indexes and memoized graph traversal, and never enumerate Cartesian modifier permutations.
- Android and native-device acceptance remain parked under the existing roadmap constraint. Do not publish a package or alter release automation in M9.6.
- Each implementation task ends with focused verification and its own commit. After each commit, report the hash, evidence, and next numbered M9.6 task.

## Review Focus

- Accessor properties, inherited fields, sparse arrays, cycles, non-finite numbers, and non-JSON extension values must be rejected without invoking caller getters or leaking partial output; pin in Task 1.
- Relative document references and JSON Pointer fragments must resolve only against the explicit URI map; missing or malformed references must report the referring URI and pointer; pin in Task 2.
- Resolver source order, resolution order, modifier selection, and defaults must choose exactly one deterministic context; invalid and required-but-unselected modifiers must fail without expanding combinations; pin in Task 3.
- Group inheritance, aliases, inherited types, and resolver overrides must preserve winning value and origin, detect cycles, and reject alias target/domain mismatches; pin in Task 4.
- Conversion boundaries and contract matching must be exact: no guessed paths, omitted definitions, alias payload values, implicit rem base, generic numeric conversion, or unsupported composite conversion; pin in Task 5.

## File Map

| Path | Responsibility |
| --- | --- |
| `packages/css/src/tooling/dtcg/model.ts` | Plain public request/result/diagnostic/sidecar types and stable format, version, and diagnostic-code constants. |
| `packages/css/src/tooling/dtcg/schema.ts` | Private Effect 4 Schema codecs and safe ingress validation for JSON-shaped inputs and DTCG resolver/format structures. |
| `packages/css/src/tooling/dtcg/documents.ts` | Snapshot caller data without evaluating accessors; normalize explicit document URIs, resolve relative references and RFC 6901 pointers, retain origin chains, and enforce fixed graph bounds. |
| `packages/css/src/tooling/dtcg/resolver.ts` | Validate Resolver profile, preserve ordered sets/sources/resolutionOrder, select one modifier context with defaults, and return ordered source references. |
| `packages/css/src/tooling/dtcg/format.ts` | Apply group `$extends` deep merges, inherited group/token types, `$root` paths, token metadata, alias resolution, cycle/type checks, and winning origins. |
| `packages/css/src/tooling/dtcg/convert.ts` | Exact manifest path/identity matching, alias-path coherence, native-domain conversion, deterministic diagnostics, payload and sidecar assembly. |
| `packages/css/src/tooling/dtcg/import-theme.ts` | Synchronous pure orchestration of request validation, resolver/source selection, token indexing, and conversion. |
| `packages/css/src/tooling/dtcg.ts` | Small public re-export surface containing only plain data types/constants and `importDtcgTheme`. |
| `packages/css/test/dtcg-*.test.ts` | Focused schema, document, resolver, format, conversion, property, export, and qualification coverage. |
| `packages/css/test/fixtures/dtcg/` | Pinned DTCG report examples and minimal Crumbs fixtures for supported values, rejection cases, resolver profiles, aliases, and origins. |
| `packages/css/package.json`, `packages/css/tsdown.config.ts` | Register isolated `./tooling/dtcg` ESM, CommonJS, and declaration outputs in the compiler/tooling graph. |
| `packages/css/test/pack-consumer-contract.test.ts`, `packages/css/test/metro-tree-shaking-contract.test.ts` | Prove packed subpath usability and that ordinary runtime graphs do not gain the DTCG adapter. |
| `packages/css/bench/dtcg-import.bench.ts` | Measure bounded 1,000-, 10,000-, and 50,000-token tooling workloads without making runtime/device performance claims. |
| `scripts/m9-6-dtcg-qualification.ts` | Run deterministic checked-in fixture qualification and emit a stable receipt without file/network access in the library API. |
| `docs/src/content/docs/how-to/import-dtcg-tokens.mdx`, `docs/src/content/docs/index.mdx` | User guide and documentation index entry with an import example and supported subset. |
| `docs/src/content/docs/reference/package-entrypoints-and-apis.mdx`, `docs/src/content/docs/reference/compatibility.mdx`, `packages/css/README.md`, `packages/css/COMPATIBILITY.md` | Tooling entrypoint, support matrix, limitations, performance boundary, and compatibility documentation. |
| `docs/evidence/2026-09-28-m9-6-dtcg/qualification.json`, `docs/assessments/2026-09-28-m9-6-dtcg-adapter.md`, `docs/roadmap.md` | Deterministic evidence, observed qualification assessment, and M9.6 closeout after all gates pass. |

---

### Task 1: Define the plain API, stable diagnostics, and safe input boundary

**Files:**
- Create: `packages/css/src/tooling/dtcg/model.ts`
- Create: `packages/css/src/tooling/dtcg/schema.ts`
- Test: `packages/css/test/dtcg-schema.test.ts`

**Interfaces:**
- `DtcgJsonValue` and `DtcgJsonObject` represent finite plain JSON data.
- `DtcgOrigin` is { readonly documentUri: string; readonly jsonPointer: string }.
- `DtcgTokenMetadata` is { readonly description?: string; readonly deprecated?: boolean; readonly extensions?: DtcgJsonObject }. `DtcgGroupMetadata` is { readonly path: ReadonlyArray<string>; readonly metadata: DtcgTokenMetadata }.
- `DtcgTokenProvenance` is { readonly tokenId: string; readonly path: ReadonlyArray<string>; readonly visibility: "public" | "private"; readonly origin: DtcgOrigin; readonly sourceChain: ReadonlyArray<DtcgOrigin>; readonly metadata: DtcgTokenMetadata; readonly groupMetadata: ReadonlyArray<DtcgGroupMetadata> }.
- `DtcgImportSidecar` is { readonly format: "crumbs.dtcg-theme-import-metadata"; readonly schemaVersion: 1; readonly contract: ManifestContractIdentity; readonly formatProfile: "2025.10"; readonly resolverVersion: CrumbsDtcgResolverVersion; readonly resolverUri: string; readonly modifiers: Readonly<Record<string, string>>; readonly remBasePx?: number; readonly tokens: ReadonlyArray<DtcgTokenProvenance> }.
- `CrumbsDtcgImportRequest` contains `resolver`, absolute `resolverUri`, `documents: Readonly<Record<string, DtcgJsonObject>>`, one `DesignSystemManifest`, `contractIdentity: ManifestContractIdentity`, optional `modifiers: Readonly<Record<string, string>>`, and optional `remBasePx`.
- Internal `decodeCrumbsDtcgResolverVersion(input: unknown): DtcgOperationResult<CrumbsDtcgResolverVersion>` and `decodeDtcgImportRequest(input: unknown): DtcgOperationResult<CrumbsDtcgImportRequest>` live in schema.ts for validation/tests; neither is re-exported.
- `CrumbsDtcgDiagnostic` contains `code`, `severity`, `message`, optional `documentUri`, `jsonPointer`, `dtcgPath`, `crumbsTokenId`, and `referenceChain`.
- `CrumbsDtcgThemeImport` contains format `crumbs.dtcg-theme-import`, schema version `1`, the unchanged `ExternalTokenThemePayload`, and a `DtcgImportSidecar` tagged `crumbs.dtcg-theme-import-metadata` version `1`. The sidecar carries contract identity, format profile, supplied Resolver version/URI, modifiers/options, matched token visibility/metadata, and document origins.
- `DtcgOperationResult<T>` is `{ readonly ok: true; readonly value: T; readonly diagnostics: ReadonlyArray<CrumbsDtcgDiagnostic> }` or `{ readonly ok: false; readonly diagnostics: ReadonlyArray<CrumbsDtcgDiagnostic> }`; `CrumbsDtcgImportResult` aliases `DtcgOperationResult<CrumbsDtcgThemeImport>`. Internal operations do not appear in the public barrel.
- `importDtcgTheme(input: CrumbsDtcgImportRequest): CrumbsDtcgImportResult` is the only operation. Schema/codecs remain private.
- Pin stable diagnostic codes in this task: `input.invalid`, `resolver.version-unsupported`, `resolver.selection-invalid`, `reference.missing`, `format.structure-invalid`, `format.cycle`, `token.alias-unresolved`, `token.alias-cycle`, `token.alias-domain-mismatch`, `contract.definition-missing`, `contract.alias-mismatch`, `token.unmapped`, `token.type-unsupported`, `token.domain-invalid`, `conversion.option-invalid`, and `resource.limit-exceeded`.

- [ ] **Step 1: Write failing tests** for all three accepted Resolver literals, one rejected literal, stable malformed-input diagnostics from decodeDtcgImportRequest, and caller objects with inherited fields, accessor properties, sparse arrays, cycles, non-finite values, non-JSON extension data, and inputs exceeding either fixed resource bound. Assert accessors are never invoked and failures have no `value`.
- [ ] **Step 2: Run** `bun test packages/css/test/dtcg-schema.test.ts`. Expected: FAIL because the request/result types and decoder are absent.
- [ ] **Step 3: Implement** the plain model and private Effect 4 Schema boundary. Snapshot only own data properties before decoding; require dense arrays and finite JSON numbers; cap document node count at 100,000 and traversal depth at 256, returning `resource.limit-exceeded` rather than truncating or overflowing.
- [ ] **Step 4: Run** `bun test packages/css/test/dtcg-schema.test.ts`. Expected: PASS, including no getter execution.
- [ ] **Step 5: Run** `git diff --check`; stage only Task 1 files and tests; commit as `feat: define DTCG tooling contracts`.

### Task 2: Index explicit documents, references, pointers, and origins

**Files:**
- Create: `packages/css/src/tooling/dtcg/documents.ts`
- Test: `packages/css/test/dtcg-documents.test.ts`

**Interfaces:**
- Consumes Task 1 `DtcgJsonObject` and diagnostic types.
- `resolveDtcgReference(reference: string, baseUri: string, documents: ReadonlyMap<string, DtcgJsonObject>): DtcgOperationResult<ResolvedDtcgReference>` normalizes a relative/absolute URI and optional JSON Pointer fragment, then looks up only the exact canonical URI in the supplied map.
- `ResolvedDtcgReference` is { readonly value: DtcgJsonValue; readonly documentUri: string; readonly jsonPointer: string; readonly referringOrigin: DtcgOrigin }. A missing key returns a failure with `reference.missing`; there is no filesystem/network fallback.

- [ ] **Step 1: Write failing tests** for absolute and relative references, URI normalization, root and nested RFC 6901 pointers including `~0`/`~1`, percent-encoded fragments, malformed pointers, duplicate canonical keys, and absent documents. Assert each diagnostic names the source URI/pointer and no external access is attempted.
- [ ] **Step 2: Run** `bun test packages/css/test/dtcg-documents.test.ts`. Expected: FAIL because document indexing and reference resolution are absent.
- [ ] **Step 3: Implement** canonical URI indexing from explicitly supplied entries and pointer traversal over the validated immutable snapshot. Keep origin data separate from input objects and preserve each reference hop.
- [ ] **Step 4: Run** `bun test packages/css/test/dtcg-documents.test.ts packages/css/test/dtcg-schema.test.ts`. Expected: PASS for explicit-map-only lookup and deterministic origins.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: resolve explicit DTCG document references`.

### Task 3: Select one Resolver context and preserve declared ordering

**Files:**
- Create: `packages/css/src/tooling/dtcg/resolver.ts`
- Test: `packages/css/test/dtcg-resolver.test.ts`
- Modify: `packages/css/src/tooling/dtcg/schema.ts`
- Test: `packages/css/test/dtcg-resolver.property.test.ts`

**Interfaces:**
- Consumes Task 1 request/diagnostic types and Task 2 `resolveDtcgReference`.
- `selectDtcgSources(resolver: DtcgJsonObject, resolverUri: string, documents: ReadonlyMap<string, DtcgJsonObject>, modifiers?: Readonly<Record<string, string>>): DtcgOperationResult<DtcgSourceSelection>`.
- `DtcgSourceSelection` is { readonly resolverVersion: CrumbsDtcgResolverVersion; readonly selectedModifiers: Readonly<Record<string, string>>; readonly sources: ReadonlyArray<{ readonly setName: string; readonly documentUri: string; readonly jsonPointer: string }>; readonly resolutionOrder: ReadonlyArray<string> }.
- Array order is semantic: preserve declared source arrays and `resolutionOrder`; later selected definitions win. Omitted modifiers use only a declared default; unknown selections and required modifiers without defaults fail. Do not produce context permutations.

- [ ] **Step 1: Write failing tests** for each version literal, ordered source arrays, every `resolutionOrder` precedence case, explicit selection, default selection, unknown selection, required selection with no default, and one selected context per modifier. Add fast-check laws that permuting object keys leaves the selection/output unchanged and reversing a meaningful source-order pair changes only the winner.
- [ ] **Step 2: Run** `bun test packages/css/test/dtcg-resolver.test.ts packages/css/test/dtcg-resolver.property.test.ts`. Expected: FAIL because Resolver selection is absent.
- [ ] **Step 3: Implement** strict Resolver schema decoding and deterministic selection using Task 2 references. Retain source and context order exactly; stop with a diagnostic on any invalid selection.
- [ ] **Step 4: Run** both resolver tests and the Task 1–2 focused tests. Expected: PASS with property laws bounded to generated small documents.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: select ordered DTCG resolver contexts`.

### Task 4: Resolve Format groups, inherited types, aliases, and metadata

**Files:**
- Create: `packages/css/src/tooling/dtcg/format.ts`
- Test: `packages/css/test/dtcg-format.test.ts`
- Modify: `packages/css/src/tooling/dtcg/schema.ts`
- Test: `packages/css/test/dtcg-format.property.test.ts`

**Interfaces:**
- Consumes Task 2 document references and Task 3 ordered `DtcgSourceSelection`.
- `resolveDtcgTokenIndex(selection: DtcgSourceSelection, documents: ReadonlyMap<string, DtcgJsonObject>): DtcgOperationResult<DtcgResolvedTokenIndex>`.
- `DtcgResolvedTokenIndex` is a readonly map keyed by canonical path encoding to `DtcgResolvedToken`. Each token carries exact path segments, resolved value/effective type, winning origin, ordered source chain, token metadata, and supported matched-group metadata; graph failures return `DtcgOperationResult<DtcgResolvedTokenIndex>` without a partial index.
- Group `$extends` applies DTCG deep-merge with local overrides. Type comes only from token `$type`, nearest effective group `$type`, or a resolved alias target. `$root` maps to its containing group path. Resolve both supported alias forms after source ordering and detect extension/alias cycles, missing aliases, and incompatible target types with complete reference chains.

- [ ] **Step 1: Write failing tests** for local group overrides and deep extension, inherited group types, token type override, `$root`, exact case-sensitive paths, invalid dotted names, escaped JSON Pointers, both alias forms, chained aliases, missing references, type mismatch, group-extension cycles, alias cycles, winning source metadata/origin, inherited group description/deprecation/extensions, and unrelated extension JSON preservation.
- [ ] **Step 2: Run** `bun test packages/css/test/dtcg-format.test.ts packages/css/test/dtcg-format.property.test.ts`. Expected: FAIL because no effective token index exists.
- [ ] **Step 3: Implement** indexed merge and memoized graph traversal with Task 1's fixed bounds. Keep metadata inert; carry origin through inherited/overridden values and return deterministic diagnostics instead of partial token results.
- [ ] **Step 4: Run** the format tests plus Task 2–3 focused tests. Add fast-check cases for bounded generated acyclic graphs, generated cycles, and semantically irrelevant object-key permutations; expected: PASS with deterministic output and explicit cycle diagnostics.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: resolve DTCG format token graphs`.

### Task 5: Convert the selected token index into a complete Crumbs payload

**Files:**
- Create: `packages/css/src/tooling/dtcg/convert.ts`
- Create: `packages/css/src/tooling/dtcg/import-theme.ts`
- Test: `packages/css/test/dtcg-convert.test.ts`
- Test: `packages/css/test/dtcg-convert.property.test.ts`

**Interfaces:**
- Consumes Task 1 request/result types, Task 3 selection, Task 4 `DtcgResolvedTokenIndex`, and existing manifest/token-theme types.
- `DtcgConversionOptions` is { readonly resolverUri: string; readonly resolverVersion: CrumbsDtcgResolverVersion; readonly modifiers: Readonly<Record<string, string>>; readonly remBasePx?: number }. `convertDtcgTokenIndex(manifest: DesignSystemManifest, contractIdentity: ManifestContractIdentity, tokenIndex: DtcgResolvedTokenIndex, options: DtcgConversionOptions): DtcgOperationResult<CrumbsDtcgThemeImport>` matches and converts a resolved index. The orchestration API revalidates the supplied manifest with existing `decodeManifest` before contract matching.
- `importDtcgTheme(input: CrumbsDtcgImportRequest): CrumbsDtcgImportResult` is the synchronous pure orchestration API defined in Task 1.
- Match one unambiguous contract identity and exact path arrays. Emit every manifest definition, including private ones, by stable ID; exclude Crumbs aliases. If a DTCG token occupies a Crumbs alias path, require its reference target to match the manifest target path. Return no payload when any error exists; informational unmatched-token diagnostics may accompany success.
- Implement only the spec matrix: srgb normalized components to `rgb()`/`rgba()` using components rather than optional hex fallback; px and rem dimensions to Crumbs lengths (rem requires positive finite explicit `remBasePx`); ms/s durations to milliseconds; finite `[0,1]` DTCG numbers only for opacity; one exact enum string from `fontFamily` or string `strokeStyle`. Reject all other mappings with origin-rich `token.type-unsupported` or `token.domain-invalid`.
- Build stable metadata for format profile, the exact supplied Resolver literal, selected contract/modifiers/options, token visibility, matched token/group metadata, and document/pointer origins. Sort diagnostics by URI, pointer, code, and token ID.

- [ ] **Step 1: Write failing tests** for contract identity/path matching, required private definitions, omitted alias payload values, alias-path coherence, all accepted conversion boundaries, invalid color components/alpha and malformed optional hex fallback, missing/invalid `remBasePx`, negative lengths under each policy, seconds conversion/overflow and negative duration rejection, opacity-only number mapping, generic number rejection, font-family arrays, object-form stroke style, exact enum members, unsupported composite types including fontWeight, cubicBezier, border, transition, shadow, gradient, and typography, informational unmatched tokens, stable diagnostic order, metadata, and no partial payload.
- [ ] **Step 2: Run** `bun test packages/css/test/dtcg-convert.test.ts packages/css/test/dtcg-convert.property.test.ts`. Expected: FAIL because conversion and orchestration are absent.
- [ ] **Step 3: Implement** exact manifest matching and the conversion matrix in `convert.ts`; have `import-theme.ts` compose validation, one Resolver selection, token resolution, and conversion without I/O.
- [ ] **Step 4: Run** conversion plus Task 1–4 tests. Add fast-check coverage for finite/domain boundaries, source-order winner propagation, and output/diagnostic determinism under key permutation; expected: PASS.
- [ ] **Step 5: Run** `bun run typecheck` and `bun test packages/css/test/dtcg-*.test.ts`; expected: all public types and focused behaviors pass.
- [ ] **Step 6: Run** `git diff --check`; commit as `feat: convert DTCG tokens to Crumbs themes`.

### Task 6: Publish the opt-in tooling subpath and prove runtime isolation

**Files:**
- Create: `packages/css/src/tooling/dtcg.ts`
- Modify: `packages/css/package.json`
- Modify: `packages/css/tsdown.config.ts`
- Modify: `packages/css/test/pack-consumer-contract.test.ts`
- Modify: `packages/css/test/metro-tree-shaking-contract.test.ts`
- Test: `packages/css/test/dtcg-export.test.ts`

**Interfaces:**
- `./tooling/dtcg` resolves to `dist/tooling-dtcg.mjs`, `dist/tooling-dtcg.cjs`, `dist/tooling-dtcg.d.mts`, and `dist/tooling-dtcg.d.cts`.
- Public exports are `importDtcgTheme`, plain request/result/diagnostic/sidecar types, and stable format/version/diagnostic constants. Do not export Effect Schema codecs, internal indexes, reference resolvers, or AST values.
- The compiler/tooling build may include Effect; root, `style`, `theme`, `theme/core`, `tokens`, and token-schema runtime graphs must not gain a DTCG adapter edge.

- [ ] **Step 1: Write failing tests** for exact package export targets, packed ESM and CommonJS import, packed declaration type use, absence of private schema objects, and runtime graph exclusion of the adapter.
- [ ] **Step 2: Run** `bun test packages/css/test/dtcg-export.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/metro-tree-shaking-contract.test.ts`. Expected: FAIL because the subpath is not built or exported.
- [ ] **Step 3: Implement** the thin public re-export, add `tooling-dtcg` to the compiler `toolEntries`, and add the explicit ESM/CommonJS/type export map.
- [ ] **Step 4: Run** `bun run build` and the three focused package/runtime tests. Expected: all packed consumers resolve and ordinary runtime graph assertions remain unchanged.
- [ ] **Step 5: Run** `git diff --check`; commit as `feat: export isolated DTCG tooling`.

### Task 7: Qualify fixtures, document the supported subset, and close M9.6

**Files:**
- Create: `packages/css/bench/dtcg-import.bench.ts`
- Modify: `packages/css/package.json` (register `bench:dtcg-import`)
- Create: DTCG fixtures under `packages/css/test/fixtures/dtcg/`

- Create: `scripts/m9-6-dtcg-qualification.ts`
- Create: `packages/css/test/dtcg-qualification.test.ts`
- Create: `docs/evidence/2026-09-28-m9-6-dtcg/qualification.json`
- Create: `docs/assessments/2026-09-28-m9-6-dtcg-adapter.md`
- Create: `docs/src/content/docs/how-to/import-dtcg-tokens.mdx`
- Modify: `docs/src/content/docs/index.mdx`
- Modify: `docs/src/content/docs/reference/package-entrypoints-and-apis.mdx`
- Modify: `docs/src/content/docs/reference/compatibility.mdx`
- Modify: `packages/css/README.md`
- Modify: `packages/css/COMPATIBILITY.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Use version-pinned Format, Color, and Resolver report fixtures plus Crumbs conversion/rejection fixtures. Qualification reads only checked-in inputs and emits canonical deterministic evidence with gate names, fixture coverage, accepted profile literals, digest/count information, and explicit unmeasured boundaries; no absolute paths, wall-clock time, or OS error text.
- The guide documents the pure API example, explicit in-memory URI map, selected manifest identity, context/default behavior, supported conversion matrix, stable diagnostics, limitations, and the tooling-only Effect boundary. Compatibility docs state source/node workloads are tooling qualification only; they do not establish runtime/device performance. The benchmark generates fixed token counts and reports timings separately from the deterministic qualification receipt.
- Update `docs/roadmap.md` to mark M9.6 complete and recommend M9.7 only after focused, package, repository, docs, and fixture gates pass. The assessment must distinguish observed checks from publication, runtime/device acceptance, and visual acceptance; Android/device acceptance remains not-run and parked.

- [ ] **Step 1: Write failing tests** for fixture qualification coverage, stable receipt bytes across two runs, no timestamp/absolute path leakage, and complete supported/rejected conversion cases.
- [ ] **Step 2: Run** `bun test packages/css/test/dtcg-qualification.test.ts`. Expected: FAIL because fixtures and qualification are absent.
- [ ] **Step 3: Add** the minimal pinned and synthetic fixtures, then implement `bun scripts/m9-6-dtcg-qualification.ts` using the public API and deterministic receipt encoding.
- [ ] **Step 4: Implement** the benchmark for generated documents and matching manifests of 1,000, 10,000, and 50,000 tokens; register `bench:dtcg-import` in the package scripts; run `bun --cwd packages/css run bench:dtcg-import` and record observed tooling timings/counts in the assessment.
- [ ] **Step 5: Document** the import workflow, compatibility/support boundary, package subpath, and measured versus unmeasured claims. Update the roadmap only after verification gates pass.
- [ ] **Step 6: Run** `bun run check`; `bun run docs:build`; `bun scripts/m9-6-dtcg-qualification.ts`; `bun scripts/playground-distribution.ts --m8-3-check`; and focused DTCG, packed-consumer, and runtime-graph tests. Expected: all applicable repository gates pass, the receipt is repeatable, and native/device acceptance remains explicitly not-run.
- [ ] **Step 7: Run** `git diff --check`; stage only M9.6 fixtures, benchmark, qualification, documentation, evidence, and roadmap; commit as `docs: qualify M9.6 DTCG adapter`.

### Task 8: Fast-forward local main after M9.6 qualification

**Files:**
- Git refs only: `main` and `codex/m9-6-dtcg`.

**Interfaces:**
- Start only after Task 7's qualification commit. Preserve the feature branch and do not push, publish, or alter the primary checkout's unrelated uncommitted changes.

- [ ] **Step 1: Verify** `git worktree list --porcelain` shows `main` is not checked out, the M9.6 worktree has no source changes, and `git merge-base --is-ancestor main codex/m9-6-dtcg` succeeds.
- [ ] **Step 2: Fast-forward** the local `main` ref to `codex/m9-6-dtcg` only after the ancestry and worktree checks succeed.
- [ ] **Step 3: Verify** `git rev-parse main` and `git rev-parse codex/m9-6-dtcg` identify the same M9.6 qualification commit; leave all remotes unchanged.

## Completion and handoff

After every implementation-task commit, report its hash, focused evidence, and the next numbered M9.6 task. At close, report qualification gates and links to the receipt/assessment, recommend M9.7 as the next roadmap item, and state that Android/device acceptance remains parked.
