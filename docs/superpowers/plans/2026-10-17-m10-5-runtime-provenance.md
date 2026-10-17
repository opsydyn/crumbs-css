# M10.5 Runtime Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Native/inline execution is retained. M10.5 is one complete correctness slice and one outcome commit, overriding generic intermediate commits.

**Goal:** Qualify ordinary-runtime code by reviewed source membership and exact artifact bytes, while preserving independent import/platform checks and every release gate.

**Architecture:** Observe the existing library build, finalize one deterministic internal provenance sidecar after all owners complete, and verify its externally pinned identity against actual installed artifacts and consumer maps. Keep historical checks separate; current release assembly and independent verification require strict provenance. First establish complete capture and byte preservation on the unchanged build layout; stop rather than admitting an unsupported subset.

**Tech Stack:** Installed tsdown0.21.10/Rolldown1.0.0-rc.17, Node-compatible build-only `.mjs`, repository TypeScript/Bun tooling, existing Effect4 release schemas and tests. Genuine Node22.0.0 for emitted-library compatibility and current Node24.15.0 for full builds/SDK tooling; existing Bun1.4.2. Installed Rolldown declares `^20.19.0 || >=22.12.0`, so no floor-Node full-build support is inferred. No dependency installation or upgrade for the library; independent consumer installs use the existing pinned SDK qualification scaffolds.

**Spec:** [Written provenance design](../specs/2026-10-17-m10-5-runtime-provenance-design.md), committed at `10438f5` and approved by the user on 2026-10-17. [Proposed ADR](../../decisions/bind-runtime-admission-to-artifact-provenance.md) records the replacement architecture; approval permits this plan, not execution or release adoption.

## Global Constraints

- One complete correctness slice; no kernel retry, new layout, chunk grouping, runtime-source optimization, benchmark or full-host replay. The kernel stays parked and its previously unrun stages stay unrun.
- Public exports, runtime dependencies, canonical bindings, registry protocols, declarations, Node22.0.0 and SDK56/57/58 remain unchanged. Preserve all existing JS configuration graphs, the single source-based DTS owner, cleanup settings and `.d.cts` stub behavior.
- No new dependency, public configuration or runtime import. The internal `dist/runtime-provenance.json` is packaged metadata, not an exported consumer API. No validation enters render, Metro transform or application startup.
- Reviewed source/helper policy grants admission; generated metadata cannot classify itself. Keep actual packed AST auditing, external-peer restrictions, compiler/Effect/Node denial and iOS/Android/web presence with Storybook requirements.
- Exact schema `crumbs.runtime-provenance.v1`; canonical compact UTF-8 JSON with recursively UTF-8-byte-sorted object keys/set-like arrays and one final newline. No timestamps, absolute host paths or session nonces in the packed receipt.
- Every JS artifact has exactly one generation/owner record. Include every reported member, including zero-length members; unknown or incomplete membership stops qualification. Never rename artifacts, discard unfamiliar members or widen a filename prefix to obtain a pass.
- Require matching installed artifact bytes and Crumbs `sourcesContent` on real retained platform maps. No backend rewrite, virtual-source fallback, shipped library sources or newly enabled library source maps.
- Keep every numerical budget, baseline, selector and enforcement unchanged: 11 blocking / 10 advisory rows. Original cold/warm/relative incremental failures still block M1.10c publication; provenance is not a performance result.
- No push, runner registration, tag mutation, npm publication or simulator/emulator operation. Physical hardware, spoken readers, iOS27/DeviceHub and release FPS remain deferred.
- Use isolated managed worktree `/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css`, branch `codex/m10-5-v12-compiler-remediation`. Preserve unrelated `.superpowers/`, `apps/storybook/ios/`, the dirty primary checkout and every dependency target. Do not switch worktrees or reuse old kernel scratch.
- Stop after the first failed real qualification gate. Expected TDD reds are not qualification failures. A harness defect may be corrected with a regression test before its gate is assessed; do not reinterpret an actual unsupported membership/output/map result as a harness defect.

## Review Focus

1. A package rewrites both its artifact and receipt: external source/tarball/receipt pin must still reject it (Steps3,5 tests).
2. A second build, crash or failed declaration phase leaves stale provenance: exclusive ownership and invalidation must prevent false success (Step2 tests).
3. A module is legitimately emitted in multiple graphs, but a member/owner is duplicated within one row: allow the former with consistent identity, reject the latter (Steps1,2 tests).
4. Metro combines/removes modules or represents a wrong package through `sourceRoot`/indexed maps: verify every represented artifact/content without assuming whole-closure equality (Step4 tests).
5. A legacy receipt or synthetic true flag reaches release sealing: current v3 assembly and independent verification must rederive strict results and preserve all original host blockers (Steps5,6 tests).

---

## File structure

Paths below are relative to the managed worktree. Proposed modules have one responsibility; do not expand the existing auditor into a general provenance parser.

| Files | Responsibility |
| --- | --- |
| Create `packages/css/build/provenance-contract.mjs` | Canonical encoding, exact policy/receipt validation, normalized member identity and ordinary-runtime membership admission; Node22-compatible JSDoc types |
| Create `packages/css/build/provenance-capture.mjs` | Non-mutating per-owner output-hook snapshots and source/vendor/helper normalization |
| Create `packages/css/build/provenance-finalize.mjs` | Whole-build ownership, disk/input/receipt agreement, declaration inventory and atomic final sidecar |
| Create `packages/css/build.mjs`; modify `packages/css/tsdown.config.ts`, `packages/css/package.json` scripts only | Awaited existing build, lock/session lifecycle and capture registration; no graph/config semantics changed |
| Create `packages/css/build/runtime-provenance-policy.json` | Reviewed exact original runtime sources and pinned generated-helper profiles |
| Create `scripts/runtime-artifact-provenance.ts` | Source/tarball expectation creation, installed artifact verification and build-audit CLI invoking the unchanged AST auditor |
| Modify `scripts/packed-distribution-contract.ts`, `scripts/runtime-bundle-contract.ts` | Reusable safe map/path inspection and new strict platform admission alongside untouched legacy admission |
| Modify `scripts/playground.ts`, `scripts/playground-sdk-candidate.ts`, `scripts/qualify-sdk56-tarball.ts`, `scripts/expo-app-workers.ts` | Supply explicit identity/context and report strict results for current consumers/workspace apps |
| Create `scripts/runtime-provenance-legacy-profiles.json` | Exact historical tarball/file-inventory profiles; initially verified1.1.1 only |
| Modify `scripts/release-sdk-matrix.ts`, `scripts/release-qualification-artifact.ts`, `packages/css/bench/release-qualification-manifest.ts` | Strict SDK evidence binding and v3 sealing/independent verification, with explicit historical replay |
| Modify `scripts/release-host-budget-report.ts` only if necessary for consistent inventory handling; `scripts/guarantees-matrix/source-identity.ts` | Verify sidecar inclusion in source/unpacked artifact inventories; include new build helpers in untracked source fingerprints |
| Create `packages/css/test-support/runtime-provenance-fixtures.ts`; `packages/css/test/runtime-provenance-contract.test.ts`, `runtime-provenance-build.test.ts`, `runtime-artifact-provenance.test.ts` | Owned test packages/maps, pure contract, lifecycle/capture and installed trust-boundary tests |
| Extend existing runtime-bundle, packed-distribution, packed-runtime-graph, release-sdk-matrix, release-qualification-artifact, guarantees-source-identity and Expo SDK contract tests | Real interfaces, contamination and compatibility regression coverage |
| Create `docs/evidence/2026-10-17-m10-5-runtime-provenance/`; update this plan/spec/ADR/roadmap and build/qualification instructions | Raw receipts, inventories, review, reproducible outcome and next numbered recommendation |

`packages/css/src/**`, `build-policy.ts`, package exports/dependencies/engines/sideEffects, lockfile, benchmark algorithms, budget registry and baseline evidence are protected byte-identical inputs. Existing root source-identity fingerprinting may gain build-file coverage; it must not rewrite historical hashes or numerical policies.

## Private interfaces

Define the contract types once as JSDoc exports in `provenance-contract.mjs`; TypeScript tools/tests import those types. Parsing APIs accept `unknown` or bytes, never an unchecked assertion cast. All digests are lowercase SHA-256; byte counts/rendered lengths are nonnegative safe integers.

```ts
type FileDigest = Readonly<{path:string;sha256:string}>;
type BuildOwner = "extensions"|"algebra"|"motion"|"motion-native"|"containers"|
  "theme"|"core"|"theme-token"|"tools"|"devtools";
type Member =
  | Readonly<{kind:"source";path:string;sha256:string;renderedLength:number}>
  | Readonly<{kind:"vendor";package:string;version:string;path:string;sha256:string;renderedLength:number}>
  | Readonly<{kind:"generated";id:string;codeSha256:string|null;renderedLength:number}>;
type JsArtifact = Readonly<{kind:"javascript";path:string;format:"esm"|"cjs";
  bytes:number;sha256:string;owner:BuildOwner;members:readonly Member[];
  imports:readonly string[];dynamicImports:readonly string[]}>;
type DeclarationArtifact = Readonly<{kind:"declaration";path:string;format:"types";
  bytes:number;sha256:string;owner:"declarations"}>;
type ProvenancePolicy = Readonly<{schema:"crumbs.runtime-provenance-policy.v1";
  runtimeSources:readonly string[];helpers:readonly Readonly<{id:string;format:"esm"|"cjs";
    toolchainSha256:string;codeSha256:string|null;artifactSha256:string|null;
    memberInventorySha256:string|null}>[]}>;
type ProvenanceReceipt = Readonly<{schema:"crumbs.runtime-provenance.v1";
  package:Readonly<{name:string;version:string;manifestSha256:string}>;policySha256:string;
  inputs:readonly FileDigest[];tools:readonly Readonly<{name:string;version:string}>[];
  generation:string;artifacts:readonly (JsArtifact|DeclarationArtifact)[];
  entries:readonly import("../../../scripts/packed-runtime-graph").PackedRuntimeGraph[]}>;
```

Original source paths are package-relative, input paths repository-relative, vendor paths package-relative, and generated IDs remain exact escaped strings. Explicitly distinguish namespaces; two different real files cannot normalize to one identity. Shared modules across artifact rows are legal only with agreeing identities/digests. For helper profiles, exactly one of code/artifact digests supplies the evidence; an enclosing-artifact profile additionally requires `memberInventorySha256` over its complete canonical member list; module-code profiles require that field to be null. Derive `toolchainSha256` from canonical `{tools,lockfileSha256}` using actual tool versions and lockfile bytes.

```ts
// provenance-contract.mjs
canonicalProvenanceBytes(value:unknown):Uint8Array;
parseProvenancePolicy(bytes:Uint8Array):ProvenancePolicy;
parseProvenanceReceipt(bytes:Uint8Array):ProvenanceReceipt;
assertOrdinaryMembership(artifact:JsArtifact,policy:ProvenancePolicy,toolchainSha256:string):void;
// provenance-capture.mjs
createProvenanceCapture(input:{packageRoot:string;repositoryRoot:string;sessionRoot:string;
  generation:string;owner:BuildOwner}):import("rolldown").Plugin;
// provenance-finalize.mjs
finalizeProvenanceBuild(input:{packageRoot:string;repositoryRoot:string;sessionRoot:string;
  generation:string;policy:ProvenancePolicy;beforeInputs:readonly FileDigest[];
  expectedOwners:readonly BuildOwner[];bun:string}):Promise<ProvenanceReceipt>;
// build.mjs — main guarded for importable tests; executable paths selected explicitly
runPackageBuild(input:{packageRoot:string;repositoryRoot:string;bun:string;
  runBuild?:typeof import("tsdown").build}):Promise<void>;
```

The `entries` type above is documentation for shape only: `.mjs` never imports repository TypeScript at runtime. Build auditing runs the existing AST auditor in an awaited Bun child process. The receipt stores auditor-relative paths; format labels normalize to `esm`/`cjs` independent of tsdown's `es` spelling.

```ts
// scripts/runtime-artifact-provenance.ts
// Expectations are established in reviewed source tooling BEFORE installing the package.
type ArtifactExpectation = Readonly<{kind:"source-built";sourceRevision:string;sourceDigest:string;
  tarballSha256:string;packageName:string;packageVersion:string;receiptSha256:string;
  policySha256:string;generation:string;files:readonly FileDigest[]}>;
type VerifiedProvenance = Readonly<{receipt:ProvenanceReceipt;receiptSha256:string;
  ordinaryArtifacts:ReadonlyMap<string,JsArtifact>}>;
createSourceArtifactExpectation(input:{repositoryRoot:string;packageRoot:string;
  tarball:string;sourceRevision:string}):Promise<ArtifactExpectation>;
verifyInstalledProvenance(input:{packageRoot:string;policy:ProvenancePolicy;
  expected:ArtifactExpectation}):Promise<VerifiedProvenance>;
// scripts/packed-distribution-contract.ts — expose reusable traversal without weakening old APIs
visitExpoMapSources(input:{directory:string;consumerRoot:string;repositoryRoot:string;
  onSource:(source:{mapPath:string;sourceRoot:string;source:string;content:string|null;
    canonicalPath:string|undefined})=>Promise<void>}):Promise<readonly string[]>;
// scripts/runtime-bundle-contract.ts
verifyProvenancedRuntimeBundles(directory:string,options:{storybook?:boolean;
  context:InstalledProvenanceContext|WorkspaceProvenanceContext}):Promise<StrictRuntimeMapReport>;
```

`InstalledProvenanceContext` contains `mode:"installed"`, consumer/repository/package roots, trusted policy and `ArtifactExpectation`. `WorkspaceProvenanceContext` contains `mode:"workspace"`, explicit app/repository/package roots, trusted policy and independently recomputed local input/generation/receipt digests; it has no source-qualified-release flag. `StrictRuntimeMapReport` contains `schema:"crumbs.runtime-map-provenance.v1"`, `scope:"installed-artifact"|"workspace"`, receipt/policy/generation digests and sorted map rows `{file,sha256,platform,crumbs,crumbsSources,artifactDigests}`. File/artifact report paths are relative to the retained output/package, not original temp roots. Map rows retain an explicit platform; current SDK receipts may keep their legacy `runtimeBundles` diagnostic array, but it cannot substitute for this strict report.

Release interfaces retain the current caller signatures except for one required creator input: add `provenanceDirectory:string` to `ReleaseQualificationInput`, pointing at the existing bundle's SDK reports/evidence. Normal CLI creation supplies `bundleDirectory` for it. `verifyReleaseQualificationBundle({bundleDirectory,repositoryRoot,expectedTag,expectedRevision})` keeps its signature and accepts only current v3. Historical replay is `verifyHistoricalReleaseQualificationBundle(options:{bundleDirectory:string;repositoryRoot:string;expectedTag:string;expectedRevision:string;expectedManifestSha256:string;expectedTarballSha256:string}):{valid:boolean;blockers:readonly string[]}` and requires those external exact pins. Current `requireSdkReleaseEvidence`/`checkSdkReleaseMatrix` retain their arguments but extend their expected identity with `{receiptSha256,policySha256,generation}`; historical v2-SDK/v1-matrix support has separately named functions, never current create/verify fallback.

`runtime-artifact-provenance.ts` CLI: `audit-build /absolute/request.json` invokes the existing AST auditor and emits one generation-bound JSON result; no library build recursively occurs. Its source expectation creator rechecks actual current input inventories, reviewed policy, artifact bytes, tarball contents and package identity before binding the receipt digest. Never derive the trusted expectation by reading only the installed receipt.

The fixture module exports `makeRuntimeProvenanceFixture():Promise<{packageRoot:string;consumerRoot:string;repositoryRoot:string;mapsRoot:string;policy:ProvenancePolicy;receipt:ProvenanceReceipt;receiptBytes:Uint8Array;expected:ArtifactExpectation;context:InstalledProvenanceContext;cleanup():Promise<void>}>`. It creates a minimal real package export map and all three platform maps, with matching source contents, fake reviewed source files and owned cleanup. Unit fixtures are synthetic and never labelled release evidence.

### Task 1: One complete runtime-provenance correctness slice

#### Step1 — Pin inputs and establish the same-path baseline

- [ ] Verify current branch/HEAD, linked-worktree identity, statuses and approved spec before any product edits. Record genuine Node22.0.0/current Node24.15.0, Bun1.4.2, tsdown0.21.10/Rolldown1.0.0-rc.17, dependency realpaths/lock hash and free space. Stop on missing prerequisites or version drift; do not upgrade or clean unrelated storage.
- [ ] Create one owned evidence root with a marker. Snapshot all tracked product/policy files and the complete existing `packages/css/dist` bytes/modes/paths before baseline building. Keep hashes, not just Git status. Record all preexisting untracked paths. Product work occurs only in this isolated worktree; consumer/test roots are separately owned. If stopping later, restore only this task's allowlisted edits and owned outputs from those exact snapshots, refusing to overwrite intervening user changes.
- [ ] Run `python3 docs/evidence/2026-10-17-m10-5-pure-contract-kernel/verify.py --repository "$PWD"`; require its unchanged181-artifact result before mutation. Run `bun run --cwd packages/css build` with explicit current Node/Bun binaries, then archive its complete JS/DTS output as the fresh baseline. Run that original build once more and require exact JS/DTS file-set/digest agreement. Compare subsequent capture builds at this same absolute path, avoiding source-path comment differences between checkouts. A non-reproducible original baseline stops the slice before capture changes.
- [ ] Add contract tests in `runtime-provenance-contract.test.ts`. Required test names/assertions: `rejects_duplicate_keys_or_noncanonical_bytes` rejects raw duplicated JSON keys; `allows_shared_source_across_artifacts_but_rejects_duplicate_member_in_one` permits consistent repeated source identity and rejects a duplicate within one row; `rejects_unknown_schema_format_path_or_digest` covers traversal, case collisions and wrong formats; `rejects_unknown_generated_or_vendor_member` rejects without a reviewed profile. A standalone reviewed CJS fixture with digest `ebf00b404775b437ace729fb112c17869280b27fbd61743c86d912e5ba20cadc` passes membership only with its exact test policy, while the ESM helper's `node:module` import fails the independent auditor.

```ts
const fixture = await makeRuntimeProvenanceFixture();
const text = new TextDecoder().decode(fixture.receiptBytes);
const duplicate = text.replace('"schema":', '"schema":"crumbs.runtime-provenance.v1","schema":');
expect(() => parseProvenanceReceipt(new TextEncoder().encode(duplicate)))
  .toThrow(/canonical|duplicate/);
expect(() => parseProvenanceReceipt(new TextEncoder().encode(JSON.stringify(fixture.receipt, null, 2))))
  .toThrow(/canonical/);
```

- [ ] Run `bun test ./packages/css/test/runtime-provenance-contract.test.ts`; retain the expected missing-function/assertion reds. Implement the pure contract module, exact-field validation, canonical serialization and policy predicates. Reject noncanonical receipt bytes before accepting parsed content; source-policy parsing must also reject duplicate JSON fields. Run the same tests green. Do not populate production policy merely from the test fixtures.

#### Step2 — Capture the unchanged build and pass the first real gate

- [ ] Write `runtime-provenance-build.test.ts` red cases: `awaits_all_twenty_js_owners_and_one_dts_owner`, `rejects_partial_duplicate_or_wrong_generation_owner`, `invalidates_receipt_before_skip_clean`, `rejects_concurrent_build_and_preserves_foreign_lock`, `failed_or_interrupted_build_cannot_leave_receipt`, `late_byte_mutation_or_changed_input_rejects`, `unowned_skip_clean_output_rejects`, and `snapshots_native_output_handles_by_value`. Assert failed paths leave no final sidecar and preserve foreign/symlink targets. Test direct CLI invocation fails before emission without a valid wrapper session.
- [ ] Add the wrapper/capture/finalizer interfaces above. Register the ten named JS owners and one declaration owner without changing current entries, format/minification/shims/dependencies/cleanup/DTS settings. Capture using the public final ordered output hook, normalize `modules`/`moduleIds` consistently and snapshot values synchronously. Use an exclusive owner-checked lock outside cleaned dist and fresh temporary session; handle environment restoration, `finally` cleanup and failure invalidation. Set build=`node build.mjs`, build:dev=`CRUMBS_CSS_SKIP_CLEAN=1 node build.mjs`; leave prepack routing through build. Node22 never imports `.ts` directly.
- [ ] In the first observation build, collect complete owner/module/byte receipts before final admission. Review each actual original member against its source implementation and dependency role. Populate the exact initial runtime-source policy and helper profiles from that review, recording rationale in evidence. This bootstrap observation cannot emit an admitted final sidecar or select a guessed runtime member. If complete membership cannot be observed, stop and archive the unsupported result. When helper code is null, review/pin the complete enclosing artifact and membership; do not invent helper code bytes.
- [ ] Extend `guarantees-source-identity.test.ts` with a new untracked `packages/css/build/provenance-contract.mjs` and `packages/css/build.mjs` mutation: source digest must change and restore; owned temp/session/receipt outputs must remain excluded. Add exactly these build roots/file to existing untracked source coverage, retaining existing tracked-file rules and historical fingerprints. The provenance generation separately covers all original sources, build/config helpers, policy, package manifest, lockfile and tool versions.
- [ ] Run `bun test ./packages/css/test/runtime-provenance-contract.test.ts ./packages/css/test/runtime-provenance-build.test.ts ./packages/css/test/guarantees-source-identity.test.ts`; require green. Run actual clean, repeated and skip-clean wrapper builds under Node24.15.0, preserving each receipt/log. Exercise standalone Node-compatible contract helpers under Node22.0.0 and Node24.15.0, but do not require the installed Rolldown build tool to support Node22.0.0 outside its declared engine range. Preserve emitted-library floor/current checks in Step6. **Gate1:** all20 JS owners plus DTS complete; all emitted JS/DTS file names and bytes equal the same-path original baseline; all59 import rows pass; every ordinary member/helper is reviewed; repeated identical inputs/outputs produce identical sidecars. Any actual membership/byte disagreement stops, with later steps unrun. Do not force success by changing layouts or source logic.

#### Step3 — Bind source expectations and actual installed bytes

- [ ] In `runtime-artifact-provenance.test.ts`, write red tests `installed_rehash_cannot_override_external_expected_digest`, `changed_policy_or_source_inputs_cannot_self_qualify`, `rejects_missing_extra_wrong_format_artifact`, `rejects_symlink_or_wrong_package_instance`, and `relocated_package_needs_no_original_paths`. Create source expectations before mutation/install, then alter both installed JS and receipt and require rejection against the unchanged expectation.
- [ ] Implement source expectation creation and installed verification. The trusted source operation must compare source inputs/policy/generation, receipt/artifact inventories and exact tarball extraction; store its resulting expected descriptor outside the installed package. Recompute all actual installed file hashes, deny symlink/realpath escapes and rerun `auditPackedRuntimeEntrypoints`; verify ordinary membership from reviewed policy. Shared module identity across graphs remains legal, unclassified entries are not.
- [ ] Add real emitted contamination fixtures to `packed-runtime-graph.test.ts` / `runtime-artifact-provenance.test.ts`: bundle a controlled runtime facade plus forbidden compiler-only member into an allowed-looking `theme-core` output with no external imports. Assert the import graph alone passes and membership rejects; repeat after renaming. Separately exercise direct/transitive compiler/Effect/Node imports and advanced-entry reachability using the existing auditor. The fixture has its own files/policy and does not modify product runtime sources.
- [ ] Run `bun test ./packages/css/test/runtime-artifact-provenance.test.ts ./packages/css/test/packed-runtime-graph.test.ts`; require green. Complete **Gate2** against the actual packed/installed tarball at Step6, after the unit tests have established the intended rejection reasons. Require exact bytes/source expectation, tampering negatives and relocation; synthetic unit packages alone do not satisfy this gate. Do not read missing installed provenance from the repository or accept a package's self-asserted policy.

#### Step4 — Strict consumer maps and explicit historical replay

- [ ] Extend runtime-bundle and packed-distribution tests with `matches_installed_artifact_sources_content`, `rejects_missing_or_changed_content`, `handles_source_root_and_local_indexed_sections`, `rejects_remote_cyclic_or_escaping_section`, `rejects_wrong_copy_or_ambiguous_crumbs_reference`, `permits_tree_shaken_subset_but_checks_every_present_artifact`, and `requires_all_platforms_and_storybook_addons`. Include file URLs, backslash spelling, lexical/realpath mismatches and unsupported Crumbs virtual/original-source references. Keep legacy test expectations intact.
- [ ] Expose the existing safe source-map/path traversal as `visitExpoMapSources`; preserve installed no-worktree/no-link and authored `.css.ts` denials. Add strict `verifyProvenancedRuntimeBundles` using Step3 verified artifacts. Each represented Crumbs artifact must have ordinary-safe membership, actual byte/content agreement and map-file digest. Presence is required per platform; tree shaking does not require every package artifact in the maps. Workspace roots/copies are explicitly selected and cannot produce release-qualified scope.
- [ ] Add the exact1.1.1 legacy profile from committed `docs/evidence/2026-10-10-m1-9d-docs-patch/manifest.json`: tarballSHA256 `91ade0bb50cbd3da6bbc9c74e006b0a9f8765850f6a67488a68cf616dbf7546e`, all185 file hashes, package/version and source of evidence. Verify the tarball and installed inventory before selecting this profile. Do not treat that historical registry receipt as a new live registry check or add version-range fallbacks. Unknown published artifacts require a trusted exact source/release expectation and fail otherwise; report the missing identity clearly.
- [ ] Migrate the four active callers listed in File structure. Establish source expectations before consumer installation; use the exact same tarball for SDK56/57/58. `playground.ts` published mode explicitly selects an exact matching trusted source expectation or historical profile; workspace/packed modes use their respective strict contexts. Preserve existing CLI inputs and worker evidence. Keep historical M8–M11 scripts and low-level legacy APIs for replay only; their result cannot satisfy the strict field.
- [ ] Run `bun test ./packages/css/test/runtime-bundle-contract.test.ts ./packages/css/test/packed-distribution-contract.test.ts ./packages/css/test/expo-sdk-56-contract.test.ts ./packages/css/test/expo-sdk-58-contract.test.ts`; require green. **Gate3** follows the actual platform exports in Step6; fabricated map tests alone do not satisfy it.

#### Step5 — Current release manifests require rederived strict evidence

- [ ] Extend release-SDK-matrix and release-qualification-artifact tests. Red cases: `legacy_sdk_maps_cannot_fill_current_provenance`, `true_flag_without_report_or_matching_receipt_rejects`, `wrong_receipt_policy_generation_or_platform_report_hash_rejects`, `rehashing_changed_report_does_not_bypass_semantic_checks`, `format_v2_requires_explicit_historical_replay`, and `strict_provenance_does_not_waive_existing_host_failures`. Add a fully consistent synthetic v3 positive fixture and preserve the existing synthetic label; it is not an actual host pass.
- [ ] Extend SDK receipt schemaVersion2→3 and SDK-matrix formatVersion1→2 for current strict results, retaining explicit historical entrypoints. Current `requireSdkReleaseEvidence` / matrix create/verify must check each SDK's installed-artifact-scope strict report, receipt/policy/generation identities and required platform coverage, as well as every existing source/cleanliness/version/integrity/check rule. Keep existing `runtimeBundles` diagnostic data if needed; no legacy success is upgraded to strict provenance.
- [ ] Advance `release-qualification-manifest.ts` current schema to formatVersion3. Add required `runtimeProvenanceQualified: true` and `runtimeProvenance:{receiptSha256,policySha256,generation,reportFiles}`. `reportFiles` is a duplicate-free relative-path/digest inventory of the three SDK reports and strict report/map evidence needed to rederive them. Current create/verify use source policy and exact tarball/source identity, not caller-supplied booleans. Reject v2 on normal verification; provide a separately named `verifyHistoricalReleaseQualificationBundle` for explicitly pinned v2 replay, without authorizing current publication.
- [ ] Keep normal create/verify CLI arguments unchanged: discover the required SDK reports from their existing fixed bundle paths and copy their retained strict evidence into the sealed bundle. Validate actual files before sealing and after unpacking. Map/output files referenced by sealed reports must be available at relative retained paths; do not leave source temp paths as verification dependencies. Keep host-policy checks mandatory. Both artifact inventories already include non-map dist files; prove the new sidecar is included, modifying collection only if needed.
- [ ] Update the independent SDK-matrix verification to rederive strict receipt/report/hash/coverage checks from the exact tarball and retained files. Preserve the publish workflow's current SDK-before-sealing order and publish-only-verified-tarball path; no workflow dispatch or host exception. Update normal workflow source only if required by the preserved CLI contract, never to bypass a check.
- [ ] Run `bun test ./packages/css/test/release-sdk-matrix.test.ts ./packages/css/test/release-qualification-artifact.test.ts ./packages/css/test/release-host-budget-report.test.ts ./packages/css/test/release-host-budget-policy.test.ts`; require green. **Gate4:** consistent synthetic current manifests pass, every provenance/legacy/host negative fails, and self-contained historical replay remains possible. No real current release manifest can be sealed while the host report remains blocked.

#### Step6 — Real artifact/platform qualification and final source checks

- [ ] Produce one actual already-built tarball with `npm pack --ignore-scripts --json --pack-destination "$CRUMBS_PROVENANCE_EVIDENCE"` from `packages/css`. Verify the sidecar is packaged, JS/DTS still equal the baseline and public export/dependency/engine metadata is unchanged. Create the trusted external source/tarball expectation and retain it before installing consumers. Use task-specific variable names and quote every path. Verify an actual extracted package and its separately relocated copy against that unchanged expectation to close Gate2 before platform export; retain independent auditor output and tampering rejection.
- [ ] Run the existing pinned qualification commands with that same tarball and current SDK-compatible Node: `bun scripts/qualify-sdk56-tarball.ts "$CRUMBS_PROVENANCE_TARBALL" "$CRUMBS_PROVENANCE_EVIDENCE/sdk-56-qualification.json"`; `bun run playground:sdk-candidate --sdk=57 --pinned --tarball "$CRUMBS_PROVENANCE_TARBALL" "$CRUMBS_PROVENANCE_EVIDENCE/sdk-57-qualification.json"`; repeat with `--sdk=58`. **Gate3:** all actual iOS/Android/web maps satisfy strict installed artifact/content admission. Preserve npm/types/motion/export checks, original logs and every failure. Real map mismatch stops; do not rewrite maps or relax content admission.
- [ ] Run `bun scripts/expo-app-workers.ts playground babel "$CRUMBS_PROVENANCE_EVIDENCE/playground-babel"` and the three remaining Storybook/Playground Babel/Rust combinations, using fresh output directories. Require actual worker evidence and strict workspace platform reports, including Storybook addons. These are software exports, not native journeys or performance qualification. Stop on toolchain/space/prerequisite failure without deleting devices or unrelated files.
- [ ] Keep real local reports' actual source revision, working-tree dirty state and input digests. If uncommitted source is dirty, it is local artifact qualification only: do not rewrite it as clean or source-final. Normal release SDK/sealing paths must still reject it; positive release integration is covered by explicitly synthetic tests until a separately authorized clean-source release run. No interim product commit or post-commit evidence rebinding is used to fake release acceptance.
- [ ] Run explicit genuine Node22.0.0/current ESM/CJS load/identity/denial probes for the actual compiled tooling and focused runtime graphs, supplying existing controlled peers where their established tests require them. Record exact executable/module paths and receipts; do not substitute Bun's Node compatibility version or a successful Node24 build for floor compatibility. Use the existing theme/token identity and denial contracts; no claim is made that Rolldown itself builds under floor Node.
- [ ] Run focused canonical behavior/type coverage: `bun test ./packages/css/test/theme-runtime-boundaries.test.ts ./packages/css/test/theme-runtime-resolver-identity.test.ts ./packages/css/test/public-api.test.ts ./packages/css/test/packed-export-contract.test.ts ./packages/css/test/pack-consumer-contract.test.ts`; run package typecheck and library tests via `bun run --cwd packages/css typecheck` and `bun run --cwd packages/css test`; run Storybook typecheck/tests with the existing package scripts. Use workspace-filtered commands, not a root unfiltered `bun test`.
- [ ] Run the archived stopped-kernel packet's `verify.py` without `--repository`; require its original rejected result and timing-not-run status. Its optional live-preservation assertion is inapplicable to an admitted new build contract. Recheck the initial protected source/dependency/policy hashes, JS/DTS byte comparisons, input identities and all completeness gates. No numerical measurement, full-host replay, device or publication result is inferred from these checks.

#### Step7 — One review, one outcome commit and next numbered recommendation

- [ ] Use the native executing-plans workflow's one fresh whole-slice reviewer after implementation/verification; do not delegate implementation. Provide the approved spec, this plan, exact diff, actual source/artifact identities and failed/unrun stages. Address concrete findings with focused regression evidence; no extra layout/prototype or automatic policy widening. Keep `.superpowers/` execution records owned and archive the relevant ledger in the outcome packet.
- [ ] Archive raw build owner/membership receipts, exact baseline/candidate artifact inventories, policy/member rationale, lifecycle/contamination red-green evidence, real SDK/app reports/maps, source expectation, versions and reviewer findings under the evidence path. Add a standalone packet verifier checking hashes, inventories, generations, actual map-content admission and all declared stage statuses; distinguish integrity checking from independent execution attestation. Add verifier negative tests for corrupt bytes, forged receipt after rehash and missing platform/case. Preserve enough files to relocate/replay without original home/temp paths; compressed raw archives are acceptable.
- [ ] On success, retain only the complete contract and evidence, update build/playground/release instructions and ADR implementation notes, and state that release performance remains blocked. On a real gate failure, archive candidate patch/source/outputs and exact error, mark downstream stages unrun, restore only task-owned product changes/output to the snapshot and retain documentation/evidence only. Check for intervening user edits before restoration. Never retain a partly admitted guard or source policy.
- [ ] Run packet verification and its negative tests, `git diff --check`, inspect every staged path and verify protected files and unrelated untracked trees are preserved. Commit exactly one outcome using `feat(m10.5): qualify runtime artifact provenance` on complete success, or `docs(m10.5): record rejected runtime provenance outcome` on stop. Do not stage unrelated files, push or publish. Remove only owned temporary roots after archived verification and dependency-link ownership checks.
- [ ] Report the commit, actual pass/fail/unrun gates and the next numbered M10.5 recommendation. A successful provenance contract remains a correctness outcome, not a compiler speed result or M1.10c release closure. A further compiler candidate still needs a credible full-transform mechanism and separate bounded approval; retain all original host blockers.

## Plan self-review and handoff

Coverage: spec§1–3 constraints/trust → Global Constraints and Steps1/3; §4 schema/policy → Steps1–3; §5 lifecycle/capture → Step2; §6 map admission → Steps3/4/6; §7 migration/release → Steps4/5; §8 proof/stop order → Steps1–7; §9 limits → Global Constraints and outcome. Each Review Focus item has named tests in its owning step. Private interfaces are defined once; no test depends on an undefined external fixture or synthetic host result being real.

Written design approved after `10438f5`. This plan is **awaiting written-plan review**. Native/inline execution is retained; do not ask for an execution-method choice again. Approval of this plan authorizes this one complete correctness slice with its stop rules, not publication, another compiler experiment or a performance exception.
