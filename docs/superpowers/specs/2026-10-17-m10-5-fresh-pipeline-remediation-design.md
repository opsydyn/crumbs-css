# M10.5 fresh-pipeline compiler remediation design

- Status: **Approved design; implementation attempt rejected and restored.** The user approved the spec at `69152cd` and the plan at `af4b490`. The complete candidate failed actual token-runtime isolation; no production or performance acceptance is claimed. See the [execution disposition](../../evidence/2026-10-17-m10-5-fresh-pipeline-remediation/README.md).
- Date: 2026-10-17
- Roadmap: **M10.5**, release closure for **M1.10c**
- Control: immutable v1.2.0 source `5a13f913b17ae957172968144ec83c391caee337`, tarball SHA-256 `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e`.
- Related architectural constraints: [native design-system compiler](../../decisions/adopt-native-design-system-compiler.md), especially D1–D3, D6 and D11. This design neither changes publication policy nor accepts the entire earlier proposed ADR.
- Execution preference: the user's inline choice is retained. A written implementation plan follows only after this spec is reviewed.

## Intent and acceptance

Remediate the complete native styling compiler path for enterprise design systems without changing public APIs, supported behavior, Node 22.0.0 support or the release budgets. Ship one coherent candidate only if every current blocking host row and the behavioral/distribution checks pass. Individual phase improvements are not admissions.

The [final-tag report](../../evidence/2026-10-17-m1-10c-expo58-release/final-release/README.md) has eight blocking passes, three failures and zero incomplete rows. The user chose **remediate before publication**, not a numerical exception. No v1/v1.1 disposition applies.

| Blocking metric | Retained final-tag result | Unchanged absolute maximum | Unchanged relative maximum |
| --- | ---: | ---: | ---: |
| Cold transform | 84.664042 ms | 83.006 ms | +25% over 66.404584 ms |
| Warm transform | 12.346250 ms | 6.514 ms | +15% over 5.664125 ms |
| Incremental rebuild | 136.881500 ms | 137.506 ms | +10% over 123.950500 ms |

**Both absolute and relative limits apply.** Rounded table values are explanatory; the existing comparator uses full precision. In particular, incremental admission is also constrained by the smaller relative ceiling. The policy remains **11 blocking / 10 advisory**, not the older all 21-pass proposal. All 21 rows must be collected; advisory failures stay visible and do not become extra admission requirements or silent passes.

Success is unknown before implementation. The design is a bounded attempt with an explicit rejection path, not a promise that these changes fit the historical warm ceiling.

## Evidence and choice

- [Current-artifact diagnosis](../../evidence/2026-10-17-m10-5-v12-fresh-compiler-diagnosis/README.md): five alternating process pairs measured 11.490750/11.056750 ms full-transform selectors with esbuild 0.27.7/0.28.2. The dependency upgrade did not establish a qualifying fix. Synchronous read spans in a separate instrumented probe are below 1 ms per warm transform; removing duplicate reads alone cannot account for the gap.
- [Approved single Rolldown prototype](../../evidence/2026-10-17-m10-5-rolldown-spike/README.md): complete-transform pilots 12.200959/10.407375 ms, failed full-output parity and unstable cache markers on unchanged/restored input. Native bodies agree only after excluding the marker. That is diagnostic evidence, not parity admission or an upstream Rolldown defect.
- [Earlier context experiment](../../evidence/2026-10-07-m10-5-current-warm-transform-attribution/README.md): context reuse improved the matched scratch workload but still missed the warm ceiling; resource/lifecycle obligations remained separate.
- [Compiled-text proof prerequisite](../../assessments/2026-10-08-m10-5-compiler-identity-prerequisite.md): namespace/function/post-load disk predicates did not establish the required compiler lifetime identity. That blocked memo design is not reopened here.

| Approach | Benefit sought | Limitation | Decision |
| --- | --- | --- | --- |
| Fresh esbuild plus a smaller authoring graph, single-admission IR and shared map analysis | Reduces work across compilation, evaluation/lowering and Metro mapping; keeps existing fresh-source semantics | Savings are unproven; package identity and IR ownership require differential proof | **Selected candidate** |
| Retained compiler sessions or compiled-text memo | Could amortize compilation | Prior timings were insufficient; ownership and identity prerequisites cannot be assumed | Not part of this candidate |
| Replace the production compiler backend | Might reduce bundler overhead | The approved prototype failed timing/cache parity and has a Node-floor installation issue | Rejected for this batch |

## Selected architecture

Keep `@vanilla-extract/integration` 8.0.10 and esbuild 0.27.7 with fresh compilation on every request. Preserve current compiler restart diagnostics, resolution checks, authoring evaluation, native lowering and compatibility conversion. No retained compiler context, watcher, timer, text cache, evaluation cache or native-result cache is introduced.

One candidate combines four internal changes:

1. Consolidate the build-time authoring dependency graph while preserving canonical package bindings.
2. Carry proof of admission for compiler-owned immutable IR into lowering instead of validating and cloning that same owned block again.
3. Construct source-map anchor analysis once per upstream transform result and apply it to each returned map.
4. Derive an explicit deterministic private input fingerprint while preserving actual source/resolution facts.

These are one admission unit. A useful subset does not ship under this plan if the complete candidate still fails a blocking requirement. No new public option, subpath, artifact descriptor version or consumer dependency is introduced.

### 1. Consolidate the authoring build graph

The current fixtures scan ten bundled inputs, including eight emitted library files. `style.mjs` and `index.mjs` are built in the same tool graph, and root exports re-export authoring bindings. The candidate keeps that single tool graph and its existing externals, then uses the installed build tool's supported output grouping to co-locate the internal dependency closure of `src/native-style.ts` in a private canonical authoring chunk.

This uses Rolldown only in the **existing tsdown package build**, not as the application's stylesheet compiler. No runtime Rolldown dependency or Node engine increase follows from it. The existing declaration-only graph remains singular so nominal brands remain canonical.

Specify the group from source module identities and their reachable nonexternal dependencies, never generated hash filenames. Keep `style` and root/tooling consumers pointing to the same emitted instances. Do not create an independently bundled second authoring implementation, replace self imports with duplicated code, change externalization to conceal graph size, or inline dependencies into ordinary runtime feature groups.

Record the before/after module graph, file count, scanned bytes and artifact hashes. A lower file count is a hypothesis about fresh scan/evaluation cost, not qualification. Reject the layout if it creates circular-initialization changes, new eager side effects, different token ownership, duplicated registries, binding/provider mismatches or forbidden runtime imports. Keep runtime graphs and their denial checks separate from the authoring graph.

### 2. Admit immutable native IR once inside a compilation

Today `captureScalarIntoNativeIr` decodes/freezes a block, and `lowerScalarBlock` decodes/freezes it again; structured capture/lowering has the same pattern. The candidate adds a private compilation-local admission boundary for scalar and structured blocks.

A successful decode returns the existing fully copied/frozen block plus an opaque owner/family ticket. Only that active compilation can consume the ticket. Its ownership table uses identity, not public symbols, structural shape, `Object.isFrozen`, a caller cast or a user-provided brand. Tickets are not serialized, returned in public native metadata or retained across transforms. Expiring a compilation invalidates its tickets and releases its tables.

Lowering a proven owned block still allocates the same new frozen lowered output and token-reference values required by the current contract. It may skip only the second schema traversal/copy of that exact immutable owned block. It must not cache a lowered result or skip evaluation. New/normalized/merged blocks require admission under their resulting invariants; ownership of a child does not validate a composition.

Existing generic decode/normalization/lowering functions continue to validate arbitrary caller data and preserve diagnostics, inspection order and allocation/identity contracts. A foreign, copied, expired, wrong-family, proxy-backed or merely frozen value cannot select the owned fast path. All nested containers registered for ownership must be compiler-owned copied data and frozen. Source getters/proxies retain their existing ingress handling and inspection order; ownership must not introduce a new rejection or admit an unexamined reference. Preserve the existing copy and alias contracts. If this cannot be proved without changing supported behavior, reject the candidate rather than weaken validation.

Hoisting fixed Schema decoder construction is permitted only for the existing exact schema/options pair and without caching decoded values. Do not replace Effect Schema with an incomplete handwritten validator. The architectural principle remains validated data at ingress followed by pure lowering, as in D3.

### 3. Share source-map anchor analysis within one result

`remapNativeTransformMaps` can process a top-level map and several `output[].data.map` values for identical generated/authored text. The candidate extracts the existing AST/range construction into a private immutable anchor plan, created lazily once for that call and shared by those map applications.

Keep direct `remapNativeSourceMap` behavior intact. Undefined, null, empty or otherwise currently ignored maps must not start parsing source or throw new parser errors. Preserve traversal order, export/import anchors, fallback coordinates, generated coordinates, unmapped segments, tuple/VLQ conversion, helper-name handling and the current error surface. A plan is not reused across calls, files, backends or source revisions. It retains no AST beyond the current result.

Do not claim property-level source precision or change Babel/Rust selection. Qualify direct, top-level, nested and mixed-format maps, including malformed/empty inputs and TS/TSX parser settings.

### 4. Canonicalize private input fingerprints

The prototype exposed a real adapter requirement: input/import callback arrival order must not define cache identity. The current cache marker hashes the entire `capturedInputs` JSON. The candidate introduces a pure canonical input representation for fingerprinting after fresh compilation.

Retain all actual input fields and import-edge facts, multiplicity, logical/canonical paths, original specifiers, import kinds, external flags and explicit absent-resolution witnesses. Sort record keys and input membership deterministically. Treat an imports list as an edge multiset only when its full records and multiplicity are retained; otherwise preserve array order. Include the actual freshly compiled source hash so changes to execution/import order cannot be hidden by equivalent edge sets. Unknown JSON fields are retained with deterministic key encoding; unsupported data cannot be silently dropped.

Keep the existing `resolutionIdentity`, authored dependency receipts and public cache metadata schema. Use a private fingerprint domain tag to distinguish the new hashing rule, and allow the compiler's changed artifact key to invalidate old Metro results. Do not substitute canonical data for real receipts or use this post-compile fingerprint as permission to skip compilation or weaken pre/post resolution checks.

Generated cache markers are expected to change with compiler implementation changes. Differential qualification may treat **only that precisely declared opaque marker** as an expected difference, and must independently recompute it from the candidate's actual compiler key, compiled source and receipt facts. Blindly deleting the line and declaring parity is forbidden. All other generated statements, public metadata, diagnostics and source-map anchors remain subject to exact/semantic contracts below.

## Data flow and responsibilities

`transformer.ts` owns the request boundary: obtain the existing fresh compilation receipt, evaluate authoring once, capture/admit native data, lower admitted data, emit native output, revalidate resolution, delegate to Expo and apply one map plan. It must release compilation-local ownership in `finally` on success or failure.

Pure modules own canonical input encoding, admitted-data lowering and source-anchor application. File reads, schema ingress, VM evaluation and upstream worker calls stay in narrow effectful boundaries. Existing Effect 4 stays an implementation dependency; consumers receive no Effect environment or runner requirement. No new Effect services or persistent owner are needed for these resource-free plans.

The existing two capture callbacks may be consolidated into one current-build receipt only if the same complete metafile is supplied to stable-resolution verification and dependency analysis on every pass, including discovery retries. Do not retain a callback from an earlier request. This is plumbing for the selected design, not an unmeasured performance claim.

## Compatibility and proof obligations

Use the immutable released package as an independent control, built/installed separately from the candidate. Never compare the candidate with its neighboring rebuilt `dist` as a supposed control.

- **Authoring and runtime semantics:** identical native properties, token/contract identities, recipe/composition ordering, primitive restrictions, local vars, conditions, motion descriptors, extension permissions, error classes/messages and observable getter/proxy/callback order. Ordinary exports, signed zero, descriptors/freezing and alias topology remain covered.
- **Package graph:** preserve root/style binding equality within ESM and within CJS, canonical focused/compatibility runtime provider identity and all existing cross-format contracts. A separate control install need not share nominal unique-symbol identity with the candidate. Consumer types are checked independently against both.
- **Dependency partition:** authored files, content hashes, logical aliases/configuration witnesses and external versions stay equivalent. Candidate installed implementation files intentionally change with the capsule build and must match its actual tarball inventory. Do not demand fake byte identity between intentionally different private library chunks or omit those chunks from candidate provenance.
- **Cache marker:** independently verify the declared fingerprint change, unchanged-input determinism, dependency sensitivity and exact edit/restore stability. No other unexpected output difference is normalized away.
- **Fresh behavior:** authoring counters and ambient reads run on every request. Entry/import edits, errors/repair, package/alias/symlink retargets and overlapping changes retain the current fresh-resolution/error behavior. No new atomic-filesystem guarantee is claimed.
- **Distribution and workers:** packed ESM/CJS and genuine Node 22.0.0/current imports; SDK 56/57/58 strict consumers; iOS/Android/web exports and runtime-source denial checks; actual Expo Babel/Rust map/cache/edit contracts. Physical hardware, spoken readers, iOS 27/DeviceHub and release FPS remain deferred.

## Validation strategy and ordering

1. Pin control source, package bytes, versions, fixtures, current policy/baselines and preservation inventories. Establish control-versus-control differential agreement before editing production candidate code.
2. Add meaningful failing tests for the four selected boundaries. Property-test arbitrary hostile/foreign IR and pure receipt permutations with shrinking and committed seeds. Use independent oracles for lowering, canonicalization and source coordinates; do not generate a schema and merely test it against itself.
3. Implement the complete candidate in the isolated worktree with existing unrelated files preserved. Prove package binding/registry identity, IR ingress/lowering parity and map behavior before measuring it. No dependency install or backend rewrite belongs to this step.
4. Run five serial independent, uninstrumented **complete** source-protocol transform processes with the unchanged fixtures, nearest-rank selectors and package-root warm mode. Retain all runs. Private stage diagnostics may explain costs but cannot replace those selectors. Do not add nested phase medians to predict a pass.
5. If the full warm selector still fails either bound, or any behavioral proof fails, stop before expensive native/full release replays. Archive the candidate, then restore the complete shipping candidate. A favorable helper or partial subset does not ship.
6. If that feasibility gate passes, complete packed consumer, edit/restore/concurrency, SDK/worker and owned native interaction qualification. Run the normal build/type/test/documentation checks appropriate to changed artifacts.
7. Freeze source/artifact identities. Collect one fresh complete host report in the exact approved environment, preserving every raw measurement, all 21 rows and the existing 11/10 enforcement. Require **11 blocking pass, zero blocking fail, zero blocking incomplete** through `verifyReleaseHostBudgetReport` and the normal release check. Advisory outcomes remain explicit.
8. Commit one admitted production batch only after the whole acceptance contract passes. On rejection, preserve the independently verifiable evidence and restore production source/artifacts; do not leave rejected shipping modules behind or rerun a known-failing full gate for cosmetic progress.

The implementation plan must cover these areas: `packages/css/tsdown.config.ts` and build-policy tests; `compiler/native-ir.ts`, `compiler/structured-ir.ts` and a private admission module; `compiler/dependency-analysis.ts` plus a private fingerprint helper; `compiler/native-source-map.ts`; `transformer.ts`; focused/property tests and current distribution/worker harnesses. Runtime feature implementations and publication-policy files are outside the optimization scope.

## Stop, commit and release boundaries

Reject if any selected optimization requires a public API/Node-floor change, new production dependency, unsupported compiler lifetime assumption, duplicated package state, weakened schema/resolution contract or unqualified source-map behavior. Record the failed prerequisite explicitly instead of inventing an implementation detail to fill it.

If the complete candidate cannot pass the unchanged warm gate, stop this batch. A different backend, retained session or compiler service requires a separate architectural decision; the implementation agent must not silently fall through to one. The design does not promise that another patch is available after rejection.

Keep the immutable GitHub v1.2.0 tag and the retained failed report. Any admitted remediation has new source/artifact identity and follows the normal next release-please version, expected 1.2.1 rather than rewriting 1.2.0. That source then needs its own hosted CI, fresh tagged host qualification, exact-tarball SDK matrix and provenance-backed publication. Development evidence cannot qualify a rebuilt/tagged artifact by itself. No old numerical exception is inherited.

This slice produces a reviewed design document only. It does not run another prototype, begin implementation, create an implementation plan or publish the current failed artifact. After written-spec approval, prepare one complete inline implementation plan with the same admission and rejection rules.
