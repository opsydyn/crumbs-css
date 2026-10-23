# M10.5 compiler-reuse architecture decision

Date: 2026-10-18. Decision base: `ed35a85`. Scope: one bounded architecture decision; no prototype, compiler build, dependency install, native run or publication.

## Outcome

**Retain the shipping fresh-compilation architecture and park compiler reuse as M10.5 release remediation. No implementation candidate is selected.** Reopen only for a materially different, explicitly reviewed mechanism with a credible complete-transform saving hypothesis and a bounded correctness proof. This is an investment decision under the current evidence, not proof that reuse is impossible.

Record the outcome as a dated addition to the existing [native compiler ADR](../decisions/adopt-native-design-system-compiler.md#compiler-reuse-decision--2026-10-18), where the earlier retention contract and rejection already live. Its overall status stays proposed. No new accepted cache policy, API contract or release exception is inferred. The accepted [consumer-scoped release policy](../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md#2026-10-08--consumer-scoped-host-policy-implemented) remains active.

The user's goal is a shippable, type-safe enterprise styling library without breaking APIs or introducing authoring dependencies into runtime imports. Approval covers making and committing this decision. It does not select a production cache or authorize another experiment. The design brief is therefore: compare genuine work reuse, preserve fresh request behavior and runtime isolation, require an evidence-based path to the unchanged warm gate, and stop if no such bounded route is justified.

## Evidence and constraints

- The [latest attribution](../evidence/2026-10-17-m10-5-repeated-package-cost/README.md) observes one compile per retained warm call. Each graph contains the same eight Crumbs package inputs, 78,679 metafile bytes, plus two authored inputs. No redundant second warm compile was found. These two fixtures do not enumerate the complete public authoring surface.
- Profile compilation is 5.589 / 4.997 ms, including authored CSS callbacks and overlapping native/plugin work. Its exclusive removable package subset remains unknown. Making the entire compile free could cover the local diagnostic gap; it does not establish that any package-cache mechanism could do so. Input bytes are not milliseconds saved.
- The retained release warm result is 12.346250000000055 ms against the effective 6.513743750000014 ms ceiling, requiring 47.24% reduction. That is context from its own protocol, not a target gap to subtract from a different diagnostic. Cold and incremental also fail. No fresh registry/hosted status is claimed.
- [Context-session requalification](2026-10-07-m10-5-compiler-session-requalification.md) preserves 105 runs and 6,690 paired rows: all 90 retained comparisons are slower, with retained medians around32–35 ms versus fresh10.64–10.79 ms. The earlier [guard attribution](2026-10-05-m10-5-guard-cost-attribution.md) identifies roughly24.4–25.7 ms of conservative guard work in that earlier candidate. These historical figures are separate workloads, not costs to subtract from today's compile spans.
- A [later fail-closed fix](2026-10-07-m10-5-fail-closed-metro-parity.md) corrects the historical restored-input case by draining on changed source; it is unfair to leave that particular defect labelled unresolved. It supplied no new performance qualification or complete current SDK58 acceptance. Its verifier rejects this checkout's changed transformer source; replay using all14 pinned source files from `be182d2` passes. This is historical evidence only.
- Kernel consolidation and the metadata-provenance replacement remain parked. Neither reached timing qualification. The existing provenance guard is retained; replacing it is not a release prerequisite.

## Alternatives considered

| Route | Work it could reuse | Actual cost and decision |
| --- | --- | --- |
| **Continue fresh integration compilation** | Existing upstream process state and bounded authored-resolution hints remain; no new Crumbs code/result cache | Preserves the current tested integration and ownership model, but does not fix the host failures. **Selected status quo.** |
| Retain per-entry esbuild contexts | Parser/resolver/linker state across rebuilds | A real reuse mechanism, unlike source-byte memoization. Existing qualified candidates regress badly after freshness checks; lifecycle and resolver cases are workload-specific. No demonstrated new mechanism changes that trade-off. **Park.** |
| Cache content-addressed package text or prebundle it into fewer files | Package reads, transforms and some module-resolution work | Potentially useful immutable data, but supplying JS contents to a fresh build still leaves those bodies to parse/link. Fewer boundaries do not establish millisecond savings; previous packaging proofs did not qualify. **Park as release remedy.** |
| External compiled package capsule with request-local linking/evaluation | Could remove package bodies from the per-request esbuild build | Materially different in principle, but requires a new loader/linker and explicit export/identity, VM, dependency, diagnostics/map and cache-key contracts. A host `require` cache or rewritten imports are not equivalent to today's bundled execution. Package-exclusive saving and capsule overhead are unmeasured. **Do not fund a prototype from this evidence.** |
| Cache evaluated exports or completed native results | Evaluation, lowering and possibly compilation | Reusing evaluated authoring effects changes request behavior. Source hashes alone do not cover environment/state read during authored execution. Not a permissible shortcut under the existing authoring contract. **Exclude from this API-preserving remediation.** |

The installed integration8.0.10 exposes compilation returning source text and watch files; the actual build uses bundling and a metafile. Installed esbuild0.27.7 exposes `build`, `context`/`rebuild` and text/byte `onLoad` results. Those inspected interfaces do not expose a reusable per-module parsed object that can simply be inserted into an otherwise fresh build. This is a statement about the inspected installed public types and current integration path, not every upstream/internal API or a claim about future versions.

## What a materially different reuse design would have to specify

These are revisit conditions, **not an approved implementation spec or a new release gate**:

1. **Reuse immutable compile data, execute authoring per request.** Name the exact reusable unit and the expensive work it avoids. A cache of byte-identical source is not a cache of native parser/linker work. Keep authored CSS, adapter installation/removal, native capture, diagnostics and emission request-owned. Do not reuse evaluated exports, returned native results or caller closures.
2. **Establish eligibility before lookup.** Resolve the public import under the actual request's logical/canonical roots and conditions. Verify the package closure, contents, compiler/plugin version and loaded implementation, build options, configuration/extends, package exports/installation identity and symlink targets that can change that unit. A digest of the eight observed files is not a complete key for arbitrary consumers. Unsupported aliases, workspace packages, plugins or unmodelled resolution must use the fresh path; do not restrict a currently supported public flow silently.
3. **Invalidate on content and topology, including restore.** Equal-size/equal-mtime edits, newly resolvable targets, removed imports, config and symlink retargets must not reuse stale work. Preserve current package-info/loaded-code restart boundaries. Before/after receipts do not prove an atomic snapshot of what a concurrent build read; require parity with the documented fresh behavior, not an invented atomicity guarantee.
4. **Preserve linkage and identity.** Specify root/style canonical bindings, ESM/CJS routing, nominal declarations and request VM behavior. Existing `Symbol.for` metadata and realm-local `globalThis` registries do not prove that cached host exports, another VM or another package copy are interchangeable. Keep current external `require` caching behavior explicit: fresh VM evaluation is not a promise to reload every host dependency. Ordinary emitted runtime graphs must still exclude compiler/Node/Vanilla Extract/Effect authoring imports under the existing guards.
5. **Name a real owner and bounds.** Every retained context, byte buffer, in-flight creation and failed-disposal quarantine needs an owner and a finite bound. Define worker-process/thread separation, project changes, concurrency, idle cleanup, failures and awaited direct-tooling close. Do not assume a Metro worker has an awaited shutdown hook or globally stop a service used by others. Queueing, retained memory, cold misses and cleanup are part of the cost, not free infrastructure.
6. **Show a complete-transform hypothesis.** Explain why avoided work exceeds new verification/linking/lifetime costs. Demonstrate that mechanism, then compare matched complete transforms with all overhead inside the timer and unchanged output/input/map/cache identities. Any future proof needs coherent edit/removal/restore/config/symlink/error/concurrency controls before timing and the unchanged five-process selector within both warm bounds. Do not replace that with parser microbenchmarks, file counts, cache-hit counts or a favorable nested median. Cold/incremental and the other release checks remain separate requirements.

The current evidence does not establish sufficient net capsule/reuse savings. A safe conceptual design might be possible; that alone does not justify the next prototype. No additional retained cache, optional public flag, dependency/backend switch, filesystem shortcut or broad source-tree validation loop is selected.

## Consequences and implementation scope

The cost of this decision is explicit: no compiler speed improvement is delivered, no publication blocker is removed, and a potentially valuable reuse route is deferred. The benefit is a stop to speculative implementation while preserving supported semantics and runtime isolation. A closed immutable authoring ABI or changed compiler backend could be separate product work, but neither is smuggled into this API-preserving release task.

This outcome changes only this assessment, its evidence/review, the dated existing ADR amendment/index and roadmap. **No production migration, dependency, configuration, feature flag, cache capacity or lifecycle API is introduced.** Leave `packages/css/src/transformer.ts`, compiler identity/dependency modules, Metro integration, build configuration, runtime guards and private context experiments untouched. The existing bounded `plans` map in `stable-resolution-compile.ts` remains resolution hints only; preserving fresh compilation does not mean removing that map or upstream package-info caches.

## Verification

- [x] Latest attribution verifier/self-tests pass with live948-file/181-artifact preservation checks.
- [x] Retained-context archive replay preserves its actual rejection; no failed performance row is relabelled.
- [x] The later restore correction is checked against its exact historical sources, and its current-source mismatch is disclosed.
- [x] Code/API references and evidence inputs are hash-bound; all local links in the new assessment resolve.
- [x] Only documentation/evidence paths are staged; existing ADR statuses, policy, product and shipping bytes are unchanged.
- [x] One independent review checks the alternatives, scope and absence of unsupported performance or release claims.

Verification results and limitations are recorded in [the decision packet](../evidence/2026-10-18-m10-5-compiler-reuse-decision/README.md). Historical replay establishes retained integrity/derivation, not fresh compiler, Metro, native or device execution. No new performance cohort was collected.

## Next numbered slice

**M10.5 — exact-artifact release disposition.** Stop scheduling compiler prototypes from the current evidence. Prepare a concise decision using the existing source/tarball/SDK/report pins: preserve the block, or seek an explicit version/source/report/tarball-specific disposition of the three host failures. Check that those exact bytes and prerequisite evidence are still available before presenting publication as an actionable choice. Do not rebuild, retag, bump versions, rerun expensive qualification or publish just to prepare that review; missing or changed identities must be reported first.

The user's earlier choice to remediate before publication remains binding. This document neither reverses it nor recommends treating a waiver as granted. Continued blocking is the default, and any exception requires a separate explicit human decision. If remediation remains mandatory, the honest next action is to retain the block and wait for a materially different justified mechanism, not invent another optimization slice. Physical-device/spoken-reader work remains deferred.
