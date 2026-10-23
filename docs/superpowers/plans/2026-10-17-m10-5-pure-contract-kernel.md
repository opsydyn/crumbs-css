# M10.5 Pure-Contract Kernel Feasibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user's native/inline execution choice is retained. This is one complete scratch candidate and one outcome commit, overriding generic per-task commits.

**Execution result (2026-10-17): rejected at initial structure.** The single scratch layout achieves 3 ESM / 4 CJS style files, but the unchanged ordinary-runtime source guard rejects the newly reachable CJS interop helper from `./tokens`. Downstream candidate identity/parity/cache/timing work was not run. See the [retained outcome](../../evidence/2026-10-17-m10-5-pure-contract-kernel/README.md).

**Goal:** Determine whether one explicitly staged contract-kernel layout preserves existing contracts and meets the unchanged complete warm-transform gate, then commit the reproducible outcome.

**Architecture:** Build the five existing contract modules once per package format into private content-addressed files, then link the existing combined tool graph to those exact files before grouping its remaining authoring closure. Keep independent runtime and declaration graphs unchanged. Build and qualify only in owned scratch trees; neither feasibility success nor failure admits shipping code.

**Tech Stack:** Existing tsdown 0.21.10 / Rolldown 1.0.0-rc.17, Vanilla Extract integration 8.0.10 / esbuild 0.27.7, Bun 1.4.2, TypeScript/Bun tests, genuine Node 22.0.0 and current Node 24.15.0. Reuse the verified installed dependency graph; no installation or upgrade.

**Spec:** [Approved kernel design](../specs/2026-10-17-m10-5-pure-contract-kernel-design.md), committed at `d10e504` and approved by the user on 2026-10-17. [Proposed architectural adoption ADR](../../decisions/stage-a-private-compiler-free-contract-kernel.md) remains conditional on proof and a later admission decision.

## Global Constraints

- One complete candidate; stop at the first failed qualification prerequisite. No second layout, naming workaround, widened guard, retained compiler service or partial shipping subset.
- Kernel implementation membership is exactly `diagnostics.ts`, `tokens/identity.ts`, `theme-token.ts`, `theme-contract.ts`, `tokens/domain-values.ts`, plus an export-only private facade. Retain all 40 runtime exports and unchanged implementation logic/registry initialization. No compiler, Effect, React, React Native, Node builtin, node_modules member or runtime external.
- One `theme-contract-kernel-<sha256>.mjs` and one `.cjs`, each named by SHA-256 of its complete emitted bytes. Match only canonical paths of these five source modules in tool JavaScript; no matching another package copy, DTS or independent runtime builds.
- Preserve public API, exports, nominal types, descriptors, registry/collision behavior, focused resolver/provider identity, Node 22.0.0 support and SDK56/57/58 contracts. Add no dependency, public option, subpath, schema or engine change. The existing type-only domain-values/domains cycle remains.
- Preserve fresh compilation and the current cache/marker algorithms. No IR optimization, capture-callback removal, source-map optimization, receipt-fingerprint replacement, compiled-text memo or evaluation cache.
- H1 requires style closure at most 3 ESM / 4 CJS files with no duplicated kernel implementation. H2 uses the existing comparator: absolute 6.514 ms AND +15% over 5.664125000000013 ms, effectively 6.513743750000014 ms. This is a gate, not a forecast; the retained failure needs 47.2411157% improvement and no evidence predicts that effect size.
- Preserve all 11 blocking / 10 advisory release rows. This feasibility plan does not run or satisfy complete release admission, waive the original cold/warm/incremental failures, retag v1.2.0, push, register a runner or publish. Any later admitted change needs new source/artifact identity and normal next version, expected 1.2.1.
- Use `/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css`, branch `codex/m10-5-v12-compiler-remediation`, as the read-only shipping reference plus documentation destination. Preserve unrelated `.superpowers/`, `apps/storybook/ios/` and the dirty primary checkout. Physical hardware, spoken readers, iOS27/DeviceHub and release FPS remain deferred.

## Review Focus

1. Skip-clean retains old hashes or a forged/stale manifest selects the wrong generation: reject it and select only this build's verified same-format artifact (Step 3 tests).
2. Symlinked output or an interrupted first stage can damage another tree or leave a false successful build: reject escapes, stop dependent work, restore environment and remove only owned temporary files (Step 3 tests).
3. Resolver matches another copy or redirects declarations/runtime feature groups: exact canonical matching and unchanged nominal/provider ownership must survive both import orders/formats (Steps 3, 6 tests).
4. A hashed kernel changes while the actual transformer key stays stale: observable equal-length edit must propagate through the real key owner, output and marker, then restore exactly (Step 9 tests).
5. A differential oracle hides changed symbols, maps, inputs or missing timing samples: tagged snapshots, explicit correspondence, independently derived markers and complete report validation must reject those mutations (Steps 2, 7, 10 tests).

---

## Files and interfaces

All product/harness paths below are relative to the **scratch candidate repository**. Only the final evidence packet and documentation are copied back to the shipping worktree.

| Files | Responsibility |
| --- | --- |
| Create `packages/css/src/internal/contract-kernel.ts`, `packages/css/tsdown.kernel.config.ts` | Direct existing-binding re-exports; a dedicated non-splitting, zero-external JS build with no DTS or Node shim |
| Create `packages/css/build.mjs`, `packages/css/build/contract-kernel.mjs`, `packages/css/build/contract-kernel-link.mjs` | Node-compatible staged driver; membership/hash/manifest ownership; format-specific canonical source linker |
| Modify `packages/css/tsdown.config.ts`, `packages/css/package.json` build scripts | Tool-only linker/grouping; driver-owned cleanup; all configs `clean:false`; original DTS/stubs and runtime groups retained |
| Create `packages/css/test/contract-kernel-build.test.ts` | Build sequencing, manifests, membership, resolver and failure controls |
| Create `packages/css/test-support/contract-kernel-qualification.ts`, `packages/css/test-support/contract-kernel-worker.mjs`, `packages/css/test-support/contract-kernel-upstream.cjs`, `packages/css/test/contract-kernel-qualification.test.ts`, `scripts/qualify-contract-kernel.ts` | Untimed child-process capture, independent oracle, ordered stage coordinator and report validation |
| Create `docs/evidence/2026-10-17-m10-5-pure-contract-kernel/` in shipping worktree | Raw receipts/logs, candidate patch/source and artifact archives, standalone `verify.py`, review and explicit outcome |
| Update this plan, approved spec status, ADR status notes and `docs/roadmap.md` in shipping worktree | Approval, completed/failed/unrun stages and next numbered recommendation |

`build-policy.ts`, package export map/dependencies/engines, lockfile, runtime source implementations, benchmark source/protocol, baseline evidence, budget registry and policy stay byte-identical.

Build helpers use JSDoc types in `.mjs`; Node 22 never directly imports a `.ts` helper. Let tsdown load its TypeScript configs. Define these private interfaces once in `build/contract-kernel.mjs`; the linker imports its JSDoc typedefs:

```ts
type KernelFormat = "es" | "cjs";
type KernelArtifact = Readonly<{path: string; sha256: string}>;
type KernelManifest = Readonly<{
  version: 1; generation: string; stageRoot: string; packageRoot: string; outDir: string;
  sources: ReadonlyArray<Readonly<{path: string; sha256: string}>>;
  exports: ReadonlyArray<string>;
  artifacts: Readonly<Record<KernelFormat, KernelArtifact>>;
}>;
// build.mjs: main is guarded so tests can import without building.
runPackageBuild(packageRoot: string, runBuild?: typeof import("tsdown").build): Promise<void>;
stageKernelArtifacts(input: {packageRoot: string; stageRoot: string; outDir: string;
  generation: string; bundles: Awaited<ReturnType<typeof import("tsdown").build>>}): KernelManifest;
readKernelManifest(manifestPath: string, context: {packageRoot: string; outDir: string}): KernelManifest;
// build/contract-kernel-link.mjs
createContractKernelLinker(input: {packageRoot: string; format: KernelFormat;
  manifest: KernelManifest}): import("rolldown").Plugin;
```

The qualification module defines `KernelInputs` with absolute `shippingRepoRoot`, `scratchRoot`, `controlRepoRoot`, `candidateRepoRoot`, `controlTarball`, `evidenceRoot`, `floorNode`, `currentNode`, `bun` paths and string `base`, `controlSource`, `controlTarballSha256`. Its CLI accepts `preflight|control|structure|identity|parity|cache|warm|verify` and one absolute inputs-JSON path. Every stage writes `{stage,status:"pass"|"fail",issues:string[],evidence:string[]}` and exits nonzero on failure; stages require passing predecessor receipts bound to unchanged inventories. `warm` additionally requires a restored cache trace. Export `compareKernelTransformReceipts(control:unknown,candidate:unknown):readonly string[]`, `verifyCurrentMarker(receipt:unknown):readonly string[]`, `findCompilerKeyOwner(packageRoot:string,key:string):{path:string;sha256:string}` and `verifyKernelEditTrace(baseline:unknown,edited:unknown,restored:unknown):readonly string[]` for the oracle tests. Reject malformed unknowns explicitly rather than treating them as empty receipts.

The worker reads one absolute request-JSON path from `argv[2]`: `{packageRoot:string,format:"esm"|"cjs",cases:Array<{filename:string,projectRoot:string,platform:"ios"|"android"|"web",dev:boolean,strictDiagnostics:boolean,useStyleSheet:boolean,step:string}>}`. One process executes a complete trace in listed order; the coordinator selects its explicit Node binary and launches fresh processes where required. Emit one `CRUMBS_KERNEL_RECEIPT `-prefixed JSON line containing the ordered raw receipts, preserving other stdout/stderr separately. Own fixture mutations are named by Step 7's trace and restored in `finally`. The owned CJS upstream adapter exposes the existing `transform(config,projectRoot,filename,data,options):Promise<unknown>` contract and supplies legacy tuple and SDK58 encoded VLQ direct/top/nested map shapes using the installed codec. These are explicit map-contract fixtures, not proof of real Babel/Rust backend execution; that separate software-context qualification belongs to production admission.

### Task 1: One complete bounded feasibility candidate

#### Step 1 — Pin the independent control and create owned scratch copies

- [x] Run `python3 docs/evidence/2026-10-17-m10-5-entry-aware-packaging-proof/verify.py --repository "$PWD"` from the shipping reference. Expected: `verified-stopped-proof`, 181 shipping artifacts unchanged. Record execution HEAD, status/untracked inventory, product/artifact/policy hashes, executable paths/versions and free space before edits. A missing prerequisite stops execution; do not clean unrelated storage or devices.
- [x] Create an owned `mkdtemp` root with an ownership JSON marker; archive execution HEAD into `candidate` and immutable `5a13f913b17ae957172968144ec83c391caee337` into `control`. Inspect archives before extraction. Use retained `docs/evidence/2026-10-17-m10-5-fresh-pipeline-remediation/control-v1.2.0.tgz`, verify SHA-256 `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e`, and extract its complete package into a separate control install. Verify all 185 package files; place its exact dist into control source without building it.
- [x] Link only required existing dependency directories into scratch; record realpaths/versions/lock hash and distinguish dependency reuse from an independent install. Never symlink source, fixtures, package dist or this package's self-resolution back to shipping. Verify original 369 source/test-support/example/fixture/benchmark files agree before adding the new facade/helpers. Pin genuine floor Node at `/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node` (`v22.0.0`), current Node and exact Bun; stop on version drift rather than upgrade.
- [x] Write absolute `inputs.json` in the owned root and record `CRUMBS_M105_KERNEL_INPUTS` as that path. All following CLI commands run from scratch candidate root with its explicit Bun executable; the shorthand `bun` below refers to that pinned executable. No product mutation or install occurs in shipping.

#### Step 2 — Establish the untimed oracle before constructing the layout

- [x] In `contract-kernel-qualification.test.ts`, write `rejects_forged_marker_or_private_inventory`, `rejects_changed_native_value_symbol_descriptor_or_map`, `rejects_unknown_or_missing_receipt_fields`, and `rejects_unapproved_path_alignment`. Require `[]` for a complete identical control pair; require a nonempty issue list for each single mutated scalar, symbol/tag, descriptor, authored hash, dependency edge, private-file hash or source coordinate. A missing marker proof and the rejected `crumbs-fresh-input-v1` domain fail.
- [x] Run `bun test packages/css/test/contract-kernel-qualification.test.ts` red for missing helpers, then implement the CLI/verification module and `.mjs` worker and rerun green. The Node worker wraps the real installed integration `compile` before loading the compiled transformer, recording actual final esbuild inputs/source via an untimed onEnd observer; fail if observation misses the real final compile. Use `transform()` metadata for resolution identity. Build the complete control scenario/trace matrix specified in Step 7 now, so control/control agreement precedes layout edits; Step 7 reuses it against candidate. Do not port the old rejected fingerprint or claim source-import/mock.module tests prove compiled Node behavior.
- [x] Independently reconstruct the current resolution key from exact `JSON.stringify({entryHash,inputs:capturedInputs,resolutionIdentity})`, then current `crumbs-native-cache-v1` context/sorted authored dependency hashes. Do not hash compiled source in place of this recipe or use candidate implementation as the oracle. Verify the comment marker before any alignment.
- [x] Capture own-key order, symbol values, complete descriptors, freezing, errors and initialization traces with explicit tagged snapshots inside the evaluated realm. Partition authored receipts, installed external versions and actual private artifacts with independently rechecked bytes. Only declare exact root/path correspondence and the verified opaque comment span; no recursive path/hash deletion or broad code/map normalization.
- [x] Run `bun scripts/qualify-contract-kernel.ts preflight "$CRUMBS_M105_KERNEL_INPUTS"` then `control`. Expected: zero issues, exact pins and control/control agreement for README/consumer fixtures plus the edit/error/restore cases in Step 7, before any candidate layout edits.

#### Step 3 — Pin build/link failure controls with red tests

- [x] Create `contract-kernel-build.test.ts` with these exact observable assertions (fixture names denote owned test data, not additional candidate layouts):

```ts
// rejects_stale_or_mutated_manifest_and_wrong_format
expect(() => readKernelManifest(staleManifest, context)).toThrow();
expect(() => readKernelManifest(artifactWithChangedBytes, context)).toThrow();
expect(() => createContractKernelLinker({...linkInput, format: "esm" as never})).toThrow();
// never_follows_output_symlink_and_restores_owned_state_on_error
await expect(runPackageBuild(symlinkPackageRoot, fakeBuild)).rejects.toThrow();
expect(outsideSentinelAfter).toEqual(outsideSentinelBefore);
expect(toolBuildStartedAfterKernelFailure).toBe(false);
expect(envAfterSuccess).toEqual(envBefore);
expect(envAfterFailure).toEqual(envBefore);
expect(ownedStageExistsAfterExit).toBe(false);
// selects_current_generation_with_skip_clean_and_exact_source_identity
expect(linkedArtifact).toEqual(manifest.artifacts.es.path);
expect(linkedArtifact).not.toEqual(oldKernelArtifact);
expect(secondCopyResolution).toEqual(normalResolution);
expect(virtualResolution).toEqual(normalResolution);
expect(dtsAndRuntimeConfigsWithLinker).toEqual([]);
// retains_exact_kernel_members_exports_and_single_declaration_owner
expect(realKernelMembers.sort()).toEqual([...fiveSources, privateFacade].sort());
expect(kernelRuntimeExports).toEqual(pinnedFortyRuntimeExports);
expect(kernelExternals).toEqual([]);
expect(declarationGraphCount).toBe(1);
```

Pin the exact 40-name list from the approved five sources with the installed TypeScript type-erasure/AST analysis; compare both emitted formats to that independent list. Additionally reject a sixth implementation, direct/transitive Node/Vanilla Extract/Effect member, mismatched source hash/destination, manifest outside its owned generation, private facade interception and missing selected artifact. Test both success/error `finally` paths. Run `bun test packages/css/test/contract-kernel-build.test.ts`; expected red for absent implementation.

#### Step 4 — Implement exactly the staged kernel and one authoring group

- [x] Add the private facade using direct re-exports only. Configure dedicated kernel JS with existing `runtimeDependencies`, target `node22`, tool-consistent minification, formats ESM/CJS, `codeSplitting:false`, `shims:false`, `dts:false`, and `clean:false`. Inspect actual returned `TsdownBundle.chunks` membership/exports/imports; allow only separately identified nonloading synthetic format glue. Retain zero externals/vendor members and exactly one raw chunk per format.
- [x] Implement `stageKernelArtifacts` and `readKernelManifest` in the `.mjs` helper. SHA-256 the complete emitted file bytes and publish exactly the two matching private filenames. Manifest sources contain the five canonical implementation paths plus facade and their current hashes; exports contain the pinned 40 names. Validate all fields, realpaths, generation equal to owned stage-directory basename, matching manifest location, two format-correct destination files and their full byte digests. Freeze the result recursively; never select artifacts by scanning newest filenames.
- [x] Implement the driver using public awaited `build({config:absoluteConfig,cwd:packageRoot,outDir:absoluteOutput,clean:false})`. First own cleanup of generated package dist once (or preserve it for `CRUMBS_CSS_SKIP_CLEAN=1`), rejecting symlink escapes; build raw kernel into owned temporary stage, verify/publish it, then set driver-only `CRUMBS_INTERNAL_KERNEL_MANIFEST` while awaiting the existing config family. All later configs, including DTS, remain `clean:false`. Verify selected kernels/digests and all export targets before success; restore prior env and dispose only owned stage/manifest in `finally`. A first-stage error never starts tool build or packing. No new atomic live-dist/watch guarantee.
- [x] Implement ordered `resolveId:{order:"pre",handler}` through tool-only `inputOptions(options,format,context)`. Use normal `this.resolve(source,importer,{skipSelf:true})`, compare exact canonical five-source identities, map only `es→mjs` / `cjs→cjs`, and return selected absolute artifact with `external:"relative"`. Preserve other resolver conditions/aliases. In the same combined tool graph apply only one output group `{name:"crumbs-authoring",test:exactNativeStyleCanonicalID,priority:100}` with `includeDependenciesRecursively:true`. Do not repeat `entriesAware` or create an independent authoring build.
- [x] Keep all independent runtime config entries/policies and the existing single source-based DTS graph and `.d.cts` re-export stubs. Do not link DTS to the JS kernel or expose private declarations. Change scripts to `build:"node build.mjs"`, `build:dev:"CRUMBS_CSS_SKIP_CLEAN=1 node build.mjs"`; existing `prepack:"bun run build"` now reaches the driver. Run the build test green, then `bun run build` in scratch. Preserve complete build logs and membership receipts; a safety/structure failure stops the candidate rather than prompting a variant.

#### Step 5 — Qualify real structure, normal cleanup and skip-clean

**Stopped at the initial static structure gate:** all 59 import rows and H1 pass; candidate source-list rows are 29/30. Only `./tokens` CJS reaches the inadmissible `rolldown-runtime-*` name. Subsequent rebuild/prepack/negative checks and Steps 6–10 remain unrun under the approved stop rule.

- [x] Implement CLI `structure` using unchanged `auditPackedRuntimeEntrypoints`, `assertRuntimeBundleSources` and `readEmittedGraph`. Require 59 total export rows, all 30 ordinary-runtime source guards, zero kernel externals and no duplicated five-source implementation in the tool graph. Record source membership across configurations separately; independent runtime groups intentionally retain their original ownership.
- [ ] Require style closures `ESM.files.length <= 3` and `CJS.files.length <= 4`, actual bytes/hashes/input inventories, zero computed loads and literal format-correct edges. Reject absolute/temp/source/pseudo/self-package paths, CJS→ESM links or leaked manifest/generation IDs. Confirm private names do not add export-map subpaths. Full 40-export retention may add bytes; report them without assuming savings.
- [ ] Run normal `bun run build`, `bun run build:dev`, and candidate `bun pm pack --destination <owned-packet-directory>` serially; the last invokes real prepack. Parse the tarball safely and verify all public targets/DTS stubs/selected private files. Test an old unused kernel retained by skip-clean: every current link still selects the current manifest. Compare output identities after deterministic rebuilds; capture generation changes without emitting them. Never pack/rebuild the immutable control.
- [ ] In separate copied artifact fixtures, inject direct and transitive Node builtin, Vanilla Extract and Effect imports for both ESM/CJS, plus a misleading/outside-allowlist runtime chunk. Each must be rejected by the authoritative unchanged auditor/source guard. Run `bun scripts/qualify-contract-kernel.ts structure "$CRUMBS_M105_KERNEL_INPUTS"`; expected all requirements pass and every negative rejected. Stop here on H1/isolation failure; no rename or second grouping.

#### Step 6 — Prove packed binding, registry/provider and declaration identity

- [ ] Add `preserves_actual_root_style_bindings_in_both_orders` and `preserves_mixed_format_cross_copy_registry_and_error_order` to the qualification tests. Fresh child processes use the actual packed package under explicit floor/current Node; test ESM and CJS, root-first/style-first, and the actual shared export intersection. Require strict equality of each shared function/object/tag within a format. Do not invent root `componentRecipe` or require ESM functions to equal CJS functions.
- [ ] Compare control/candidate observations of all four existing registry Symbol keys, identity symbol/descriptors, collisions, local-terminal domains, WeakMap/Map ownership and initialization/error order. Exercise independently copied packages and mixed ESM/CJS. Test existing focused/compatibility resolver identity and React provider interoperability in both directions. Deny builtin/compiler/Effect loading for all ordinary entries, retaining only each entry's existing approved peers; distinguish this from permitted advanced entry dependencies.
- [ ] Run `bun scripts/qualify-contract-kernel.ts identity "$CRUMBS_M105_KERNEL_INPUTS"` and existing tests: `runtime-isolation.test.ts`, `theme-runtime-boundaries.test.ts`, `theme-runtime-resolver-identity.test.ts`, `token-contract-identity.property.test.ts`, `theme-contract-ownership.test.ts`, `pack-consumer-contract.test.ts`, `packed-runtime-graph.test.ts`, `effect-boundary-build.test.ts`, all under `packages/css/test/`. Existing subprocess tests that call PATH's `node` run with its parent directory set to the selected floor/current binary, not merely a version string in the report.
- [ ] Run `bun run typecheck` in candidate package. Extend the new packed identity fixture with imports/assignments spanning root/style/tokens/focused theme entries and existing primitive/token nominal cases; compile `.mts` and `.cts` consumers with installed TypeScript under normal NodeNext export conditions. Preserve expected-error fixtures for foreign contract identities. Expected: zero unexpected diagnostics and original rejection behavior; one successful DTS build alone does not prove this gate.

#### Step 7 — Preserve behavior and maps with explicit provenance

- [ ] Extend oracle tests with `rejects_changed_dependency_or_native_semantics`, `preserves_fresh_ambient_counter_and_failure_recovery`, and `retains_direct_top_and_nested_authored_map_anchors`. Each asserts one bad native value/descriptor/order/freeze/error/map coordinate produces an issue, while identical independently captured observations agree. Reuse the already captured control matrix; these compatibility/negative controls may already pass and do not require an artificial red phase.
- [ ] Implement `parity`: README and package-owned consumer plus owned scalar/token/structured/recipe/extension fixtures; strict true/false, dev/production, iOS/Android/web and useStyleSheet true/false where supported. Preserve code, explicit symbol/descriptor snapshots, diagnostics, metadata/sidecars, authored dependency and package-resolution witnesses. Compare authored anchors in legacy Babel/Metro tuple and SDK58 Rust encoded VLQ direct/top/nested map-contract fixtures via the owned upstream adapter, including unchanged ordinary-module maps. Decode and assert authored line/column bounds and expected export/import anchors. Actual Babel/Rust worker execution and SDK/native journeys remain separate later admission obligations; do not label these fixture checks as live backend proof.
- [ ] Exercise baseline/repeat, entry edit/restore, dependency edit/restore, syntax error/recovery, authoring error/recovery and changed ambient inputs in the same compiler process where the current contract requires freshness. Include an append-only owned evaluation counter to prove each request reevaluates authoring; keep its hook outside production source. Reconcile only explicit checkout path correspondence after preserving raw originals. Candidate private artifact sets legitimately differ; record/validate those actual paths/hashes, never copy control receipts or erase all private facts.
- [ ] Run `bun scripts/qualify-contract-kernel.ts parity "$CRUMBS_M105_KERNEL_INPUTS"`, then focused `m2-7-dependency-invalidation.test.ts`, `resolution-identity.test.ts`, `stable-resolution-compile.test.ts`, `native-source-map.test.ts` and `transformer.test.ts` under `packages/css/test/`. Expected zero unapproved differences/failures. Stop before cache/timing on a regression.

#### Step 8 — Attribute the actual compiled key and reject a stale-key counterexample

- [ ] Test `attributes_key_to_one_actual_emitted_implementation`: independently compute MD5 of `"@opsydyn/crumbs-css"` plus each actual emitted JS file's bytes. Require exactly one match to the compiled transformer's reported `getCacheKey()`, record that owner's path/SHA-256 and its literal propagation chain to the selected kernel. Public facade identity alone fails this assertion. Current source imports diagnostics/theme-token directly, but grouping may move their emitted edge; prove the actual layout.
- [ ] Test `derives_only_current_marker_recipe`: forged entry hash, captured input/resolution order, context, authored dependency hash and marker all fail independent verification. Repeat unchanged inputs deterministically. An edited kernel paired with unchanged compiler key/output/marker must make `verifyKernelEditTrace` return issues; write this negative red before implementing the trace checker, then green. No cache-algorithm edit can make this test pass.

#### Step 9 — Prove equal-length kernel edit and exact restoration

- [ ] In owned scratch only, replace the exact unique `theme-contract.ts` `const varName` prefix `--crumbs-` with `--crumby-`; assert one replacement and equal source byte length. Use an owned fixture importing `createThemeContract` and `viewStyle` from `/style`, with `{kernelProbe:{width:null}}` and a style using that token, to observe the changed native token reference. Do not modify registry keys or control bytes.
- [ ] Test `propagates_equal_length_kernel_edit_and_restores_identity` through CLI `cache`, which rebuilds the complete same candidate for baseline/edit/restore, with a fresh worker PID for every version, format and Node binary. Require changed selected kernel content/path, actual compiler owner bytes/key, observed native value and independently derived marker; exact restore must restore all source/artifact identities, code/metadata/maps/markers and expected import receipts. Retain before/edit/restore inventories, byte patch, raw input receipts, process IDs and full marker material.
- [ ] Distinguish the compiled transformer's same-format kernel graph from the actual authored esbuild input graph: compiled CJS execution can legitimately select ESM for authored `import`. Record both, without inventing CJS-authored receipts. Preserve separate existing restart/edit contracts; make no claim that already loaded Node modules refresh without a restart. Run `bun scripts/qualify-contract-kernel.ts cache "$CRUMBS_M105_KERNEL_INPUTS"`; any propagation/restoration failure rejects the layout without changing cache recipes or trying another grouping.

#### Step 10 — Run the unchanged complete warm selector only after every gate passes

- [ ] Add verifier tests `rejects_missing_truncated_or_instrumented_warm_report` and `uses_median_of_five_worse_fixture_p50s`. Assert fewer than five reports, fewer than six retained one-operation warm observations per fixture, mismatched protocol/environment/fixtures, nonfinite values or failed processes reject; assert synthetic data selects the third of five per-process fixture maxima, not pooled samples. Use existing `acceptBenchmarkProcessReport`, `summarizeBenchmarkReports` and `compareRecordedMetrics`; keep registry projection to `warm-transform-ms` in memory only.
- [ ] CLI `warm` launches five serial fresh uninstrumented Bun children for exact control and five for fully restored candidate, all using the unchanged benchmark source/fixtures. Each command is `CRUMBS_BENCH_WARM_TRANSFORM_CWD=package-root CRUMBS_BENCH_JSON_OUTPUT=<unique-absolute-json> <pinned-bun> packages/css/bench/native-styles.bench.ts` from its complete scratch repository root. Its source-imported transformer and `.css.ts` package self-resolution must select that tree's source/dist. Never run an oracle, mock.module or profiling hook in these processes.
- [ ] Retain every raw sample/report/stdout/stderr and exit code. Existing setup includes six cold child transforms, parity setup and an excluded warmup; retain six one-operation warm samples per fixture, then nearest-rank p50 (third sorted), each process's worse fixture, and median of five maxima. Report min/median/max and matched control/candidate observations separately from the historical comparator; no causal estimate comes from nested phase medians.
- [ ] Run `bun scripts/qualify-contract-kernel.ts warm "$CRUMBS_M105_KERNEL_INPUTS"`. Require all process reports and zero exit failures plus comparator row `pass` at both unchanged full-precision limits with exact environment/measurement identity. An incomplete comparison is not a speed pass. Stop on either bound failure; no second layout, service fallback, partial admission or expensive full-host/native replay.

#### Step 11 — Archive the outcome and independently verify shipping preservation

- [x] On the first failure mark later stages `not-run`; on all feasibility passes mark `feasibility-pass; production-not-admitted`. Archive the exact candidate source/config/helper patch and dist, control pins, every completed/failed/negative receipt, raw logs, graph/input inventories and timing only if reached. Write standalone Python `verify.py` to recheck archive/file hashes, manifest/membership/graph/identity/marker/edit-restore assertions and selector arithmetic without importing candidate runtime code. Add `--repository` checks for unchanged shipping product/policy and all 181 artifacts; distinguish recorded facts from live checks. Receipt consistency is not independent execution attestation. Tests of the verifier must reject a mutated archive/receipt or omitted sample.
- [x] Request one fresh whole-candidate review using the retained native/inline workflow after implementation. Review observed stages and evidence, not unrun stages; fix only harness/report defects without changing the candidate layout. A real candidate gate failure remains a rejection. Scan proposed public evidence for credentials/host details before any future public push decision; this local commit does not authorize a push.
- [x] Archive before removing rejected candidate files, deleting only ownership-verified disposable scratch data and never dependency symlink targets. On success retain the owned candidate plus archive for a separately reviewed production admission plan. Re-run the new packet verifier with `--repository`, `git diff --check`, and explicit shipping source/dist/policy comparisons. Expected zero unexpected tracked product changes and preserved untracked inventory. Do not claim full-suite/native/host/release success from feasibility.

#### Step 12 — Commit one complete outcome and recommend the next numbered slice

- [x] Copy only the finalized evidence packet and status documentation into shipping; stage explicit paths and commit once: `docs(m10.5): record pure-contract kernel feasibility outcome`. Preserve the whole candidate in the archive, not partially in production. This is the single slice commit on either rejection or feasibility success.
- [x] If rejected, recommend **M10.5 — park this kernel as release remediation and review the next evidence-backed architecture/release decision**, stating the failed gate and original publication blockers. Do not invent another prototype or silently adopt architecture-only changes.
- [ ] **Not applicable to this rejected outcome:** If all feasibility gates pass, recommend **M10.5 — one complete production admission plan** for this exact candidate: appropriate full suite/type/build/docs/packed checks, SDK56/57/58, actual Babel/Rust iOS/Android software contexts and fresh exact-source host evidence with all 11 blocking rows passing, zero invalid/incomplete evidence and all 10 advisory outcomes recorded. Warm success alone leaves cold/incremental admission unresolved. Do not execute that later plan automatically.

## Planning review and execution handoff

The approved spec maps to Step 1 (pins), Steps 3–5 (cut/build/link/H1), Step 6 (canonical bindings, registries and declarations), Step 7 (behavior/provenance/maps), Steps 8–9 (unchanged cache recipe and observable edit/restore), Step 10 (complete warm gate), and Steps 11–12 (whole-candidate disposition and separate production admission). The five Review Focus classes have named failure assertions in their owning steps. Inline self-review checked spec coverage, step precision, interface names/types, failure-class tests and proportion; no production implementation bodies or undecided helper interfaces remain. No product build, test, benchmark, install or prototype is part of preparing this plan.

**Status: user approved execution after `f8d7fdf`; one candidate executed and rejected at initial structure.** Production adoption and release admission remain unapproved. Next numbered decision is **M10.5 — park the kernel as release remediation and review the runtime provenance contract/release decision**, with no further prototype or guard change authorized.
