# M10.5 worker-scoped compiled-text reuse

Status: **written design proposed for review**. On 2026-10-18 the owner approved the worker-lifetime contract presented in `7903ba9`. That approval permits this design; it does not approve its implementation or publication. Native/inline execution remains the intended method after plan review.

## Purpose and evidence

Reduce repeated Crumbs compilation enough to meet the existing host budgets while keeping authoring execution fresh, canonical bindings intact and authoring dependencies out of runtime imports. This is one complete remediation candidate, not another partial-cache timing exercise.

The [root-cause assessment](../../assessments/2026-10-18-m10-5-root-cause.md) separates authoring-graph growth from additional pipeline work. Its matched current control measured 8.900 ms; an incomplete compiled-text memo measured 3.265 ms. The memo preserved observed outputs and authoring effects but returned a stale value when a higher-priority dependency appeared. It is rejected as production code. These diagnostic numbers neither qualify a release nor recreate the historical dependency environment.

The candidate retains compiled JavaScript text and its complete compiler-input receipt. Every invocation of the Crumbs transformer still evaluates authoring in a fresh VM, captures, lowers and emits output. It does not retain evaluated exports, adapter state, completed native styles or failures. Existing Metro cache hits can still avoid invoking the transformer; this design does not promise to execute authoring on every bundle request.

## Approved contract and narrow supersession

The compiler installation and loaded compiler/plugin implementation are fixed for a tooling-process lifetime. For Metro, compiler upgrades require restarting Metro, including its workers. A valid compiled-text hit need not start the native compiler service or reproduce a failure that would occur only when starting that service. A miss still uses the existing fresh compiler and exposes its failures.

This explicitly supersedes the fresh compiler-service-error-equivalence prerequisite in the [October 8 identity design](2026-10-08-m10-5-compiled-text-identity-design.md). Its rejected namespace/disk-hash proof remains rejected. An opaque process epoch is an ownership boundary under the new contract, not proof of executed native binary bytes. Compiler replacement, module monkey-patching and compiler-selection environment changes during a process lifetime are outside this reuse contract and require restart; existing detected package-scope restart diagnostics remain.

Application sources, bundled design-system dependencies, package manifests, configurations, lockfiles and resolution topology remain mutable. A bundled file under `node_modules` or Crumbs `dist` is still a mutable compiler input even when the compiler installation is fixed. Ordinary authoring environment reads remain fresh. No runtime dependency, public option, export, type, numerical budget or release exception changes.

## Architecture and ownership

Keep four private responsibilities separate:

1. **Witness construction and validation:** describe the supported resolution graph and read its current content/topology. Own no compiled results or runtime state.
2. **Worker memo:** retain bounded compiled text, explicit compiler inputs and the witness under an entry/configuration identity. Own admission, eviction and request generations.
3. **Transformer integration:** preserve the existing fresh path, evaluate each request afresh, and validate the consumed witness again before returning. Replay explicit input data rather than relying on an `onEnd` callback firing on a memo hit.
4. **Metro integration:** carry a versioned private witness and session binding through cache stores, result keys and live-graph invalidation. It must never infer worker-local identity from a disk receipt.

These modules belong to compiler/transformer/Metro tooling only. No import edge from ordinary runtime entries to the new modules is permitted. Keep the current authoring package layout, sandbox, Vanilla Extract file scopes/debug IDs, canonical token/recipe bindings and runtime-extension linking. Extension linkage remains fresh under its existing checks; do not reuse a separately compiled extension through this memo without a complete witness for that work.

## Eligibility and request identity

Admit only the installed, qualified default integration path with fixed internally owned compile options and collector functions. Compare owned bindings/options structurally; plugin names or version strings alone cannot establish admission. Unknown integration versions or user plugins/loaders take the fresh path. Capture the actual supported compiler/integration versions in qualification evidence without adding a dependency or narrowing public Node support.

Key by the worker epoch, logical and canonical project root and entry, source content, and every effective compile option, including identifier mode, build mode, platform/conditions, defines and resolution settings. Known options derived from request environment belong in the key. Compiler-selection settings such as `ESBUILD_BINARY_PATH` and `NODE_PATH` are fixed at process initialization; a detected change bypasses admission and follows existing fresh/restart behavior. Arbitrary authoring environment values are not memoized: evaluation observes them anew.

Supported imports are literal static import/export and literal `require` using the qualified default JS/TS/JSON resolution rules, bounded relative/absolute file and directory requests, and ordinary exact package exports. Exact package self-references and the current benchmark/consumer imports must be covered. The implementation must enumerate and test its actual resolver precedence and condition order against the installed compiler rather than infer them from a filename list.

Dynamic/glob/computed imports, aliases, package-based configuration extends, wildcard exports, unknown conditions/loaders/plugins, unsupported manifest remapping or incomplete resolver evidence use fresh compilation. Local JSON/JSONC configuration chains are eligible only when their entire chain and applicable options are understood. Unsupported caching must not reject a previously valid source program. Built-ins and explicit external imports retain existing evaluation behavior; external resolution is not replaced by cached exports.

## Complete mutable witness

A reusable witness must cover all of the following, including installed and generated dependency files:

| Input | Required observation |
| --- | --- |
| Every bundled input | Content hash, logical path, canonical path and relevant link route |
| Static import edges | Request, importer, resolution mode and selected destination, cross-checked with compiler metadata |
| Higher-priority and missing candidates | Candidate precedence and directory inventories proving presence/absence |
| Directory/package resolution | Applicable ancestor search paths, package scope/self-reference, manifests, exact exports and selected conditions |
| Configuration | Applicable tsconfig/jsconfig files, supported local extends chains and absent nearer configuration candidates |
| Installation context | Applicable lockfiles and package manifests; new nearer package/config/lock files must invalidate |
| Symlinks | Logical route, link targets and canonical destination, including missing intermediate components |

Use grouped directory inventories of names, kinds and link targets to establish negative candidates. If a directory is missing, witness the nearest existing ancestor and missing path components so its creation is visible. Do not scan the whole project tree. Hash file bytes; mtime/size alone never proves stability. Include every relevant file and directory even when its path is outside the project root.

Parse the admitted source/configuration once while constructing a witness, then retain the resulting bounded description. Its source bytes must be revalidated on each use. Never infer complete admission merely from the current shipping resolution receipt's `cacheable` flag: that receipt did not prevent the retained higher-priority-file counterexample.

Deduplicate reads only within one validation pass. Pre-consumption and post-consumption passes must independently read current bytes and topology. Missing paths are explicit observations; permission/I/O failures are not equivalent to absence. If proof cannot be built or checked before consumption, discard/bypass the memo and compile fresh. Continue the shipping fresh-path error behavior instead of inventing a cache-admission error.

The consistency guarantee is the existing before/after observation model, not an atomic filesystem snapshot. Changes observed during consumption fail that request; undetectable edit-and-restore between observations is not newly claimed to be impossible.

## Admission, consumption and concurrency

Each owner has an absent, probationary or ready entry. A fresh successful compilation can establish a probationary result only after its complete witness agrees across compilation. A second independently fresh compilation with the same request identity, text, complete input list and stable witness confirms readiness. Existing fresh discovery/retry passes may supply these observations when they actually satisfy those conditions. Otherwise the next request compiles fresh to confirm; do not add a hidden eager compile or execute authoring twice to manufacture readiness.

On a ready hit, validate the complete witness before returning its compiled text/inputs to the request. On mismatch, invalidate and use the fresh path. Preserve the existing bounded stable-resolution discovery/retry mechanism; unsupported witnesses can still return an otherwise valid fresh result without entering probation.

Each request evaluates, captures, lowers and emits independently. After consumption, revalidate the complete witness along with existing package-scope and source checks. A detected change uses the existing changed-during-transform diagnostic and invalidates the entry. Do not silently retry authoring after effects have run. Publish admission only after the request completes successfully. A failed request must neither promote nor refresh retention.

Use bounded per-owner generations attached to retained owner records. A later request invalidating or replacing an owner prevents an older completion from publishing over it. Evicted records cannot be resurrected by old in-flight completions. Keep pending owner records under the same owner cap; overflow requests compile fresh without queued retained state. Do not coalesce callers' authoring execution, retain rejected promises or add a global serial queue. Concurrency qualification must compare existing adapter behavior against an independently fresh control, including two project roots and overlapping same-entry edits.

## Resource limits

Across probationary and ready entries, retain at most **16 owners**, **8 MiB total**, and **1 MiB per entry**, accounting for UTF-8 compiled text and serialized metadata. Evict deterministically by LRU. Bound each witness at 512 bundled files, 512 directory observations, 1,024 import edges, 64 configuration/manifest/lock observations and 128 symlink observations; the byte limit applies as well. Exceeding a bound means fresh compilation, never truncated proof or a user error.

Retain no compiler contexts, watchers, timers, background workers, evaluated modules, environment snapshots or failures. Process exit releases the memo. Private test controls may clear/inspect bounded state without creating a public API. Resource qualification must count probation and in-flight ownership as well as ready entries.

## Metro outer-cache contract

The worker memo is not persisted. For this candidate, native-transform outer-cache receipts are reusable only within one Metro configuration session, with a complete mutable witness. This deliberately gives up cross-restart reuse of Crumbs native-transform results; ordinary Metro results remain unaffected.

`withNativeStyles` creates a fresh opaque session token per configured instance, shared with its cache-store wrappers, middleware and workers through a private serializable transformer-config field. Bind the receipt to this token, the canonical/logical root, effective configuration identity and private schema version. Keep a separate worker epoch for the in-memory memo. A token is a session boundary, not a compiler fingerprint, secret or release attestation. It must not appear in emitted application JavaScript or public native metadata; include it only in private cache metadata/result-key handling.

The outer receipt must combine the compile witness with all existing result dependencies, including fresh runtime-extension linkage inputs; if any required input cannot be witnessed, mark that result non-reusable. This does not expand existing Metro ambient-environment semantics. All paths that reuse native results must validate the binding and full witness: asynchronous/synchronous configured cache stores, the live Metro graph and the transform result key. A valid same-session hit need not start a compiler. A foreign/missing session, malformed/truncated receipt, legacy native receipt or unsupported proof becomes a cache miss/stale importer. Distinguish a malformed native receipt from an ordinary non-Crumbs result; the latter retains existing handling. A fresh result that lacks a complete witness is explicitly non-reusable through these native outer-cache paths.

Preserve the existing exported cache-helper signatures with private/internal wiring. When no expected session is available, native receipts fail closed while unrelated Metro values pass through. Direct transformer users still get worker-local reuse and unchanged output behavior; they do not gain unvalidated persistent caching.

Verify that the private session field actually reaches workers on each supported Babel/Rust integration and that live-graph invalidation cannot bypass it. Repeated wrapping must not accidentally mix sessions. If the existing supported Metro integration cannot carry and enforce this contract, reject the candidate; do not substitute disk version strings or function equality. Measure restart/cold-cache consequences explicitly, including cache growth: replace entries under stable store keys where possible, and reject unbounded accumulation caused by session-specific keys.

## Performance hypothesis and acceptance

The diagnostic 3.265 ms result leaves approximately **3.248 ms** beneath the retained effective warm limit of **6.51374375 ms**. Complete grouped witness checks, lifecycle accounting and private receipt production must fit in that envelope. This is a falsifiable hypothesis, not a new budget or evidence that the complete candidate passes. Do not subtract overlapping profile spans or exclude safety checks from timed work.

Preserve the official selector, fixtures, warmup, sample counts, baseline, absolute limits and regression limits. Compare against an independently built fresh-compilation control from the pinned pre-candidate source, not only a switch disabling the memo in candidate code. Preserve input/output hashes, raw timings and source/artifact identities. No fixture allowlist, hidden prepopulation, benchmark-only path or untimed migration of per-transform work is permitted.

Correctness and isolation precede timing. Then run full-transform warm and cold measurements and Metro incremental rebuild measurements with all proof work enabled, followed by the complete current host policy: **11 blocking comparisons pass, all 21 measurements valid and complete**, advisory failures retained visibly. The original v1.2.0 cold/warm/incremental failures remain historical until a new candidate is independently qualified. Registry and baseline files are unchanged.

Measure same-session cache reuse, session restart and repeated source/dependency/configuration changes. Capture process startup, memory, cache entry counts and any compiler-initialization work so a warm improvement cannot hide a new unbounded/cold regression. Run final serial cohorts after builds and other task-owned tooling stop; record external contention rather than terminate unrelated processes. A local result is distinct from required hosted Mac qualification.

## Required correctness matrix

- Independently fresh versus candidate: code, source maps, file scopes/debug IDs, complete inputs, cache identities, diagnostics and canonical exported bindings. Compare deterministic public output separately from intentionally session-specific private metadata.
- Known dependency same-size/same-mtime edit and restore; creation/removal of higher-priority `.ts` beside `.js`; directory/index replacement; nearer package/config creation; exports/lockfile/config edits; local extends; symlink retarget/delete/restore; package self-reference and installed/dist input edits.
- Ambient environment and authoring side effects on every transformer invocation; separate fresh VM captures; recipes/tokens/local vars/container/motion/algebra/runtime-extension fixtures; error-then-repair behavior. No cached failures or repeated effects after a detected mid-transform change.
- Unsupported grammar/oversized proof takes fresh compilation and preserves success/error behavior. Missing/denied paths, malformed receipts and partial metadata cannot authorize reuse.
- First discovery/confirmation, eviction, overflow, delayed completion, two roots, concurrent same-entry requests and mutation during consumption. No stale overwrite or unbounded ownership map.
- Compiler service unavailable after admission: a valid hit is allowed under the approved contract; a changed-input miss exposes the compiler failure. A restarted process uses its new installation and empty memo. Compiler upgrades require full Metro restart; no claim that a live worker can adopt them safely.
- Real Metro cache store and live-graph edit/remove/restore cases, restart with old disk receipts, worker restart within the same fixed-installation Metro session, missing private-config transport, and unsupported-proof results. Exercise Babel and Rust through the SDK compatibility matrix and the currently pinned host-gate Expo/Metro environment; neither substitutes for the other.
- Existing package tests/types/property tests, minimum supported Node and current tooling, packed ESM/CJS/types and runtime import isolation. Required iOS Simulator/Android emulator and web software checks use the new exact artifact; physical-device/spoken-reader deferrals remain.

## Affected paths and delivery

Implementation will touch `packages/css/src/compiler/stable-resolution-compile.ts`, new private compiler witness/memo modules, `packages/css/src/transformer.ts`, `packages/css/src/transform-cache.ts`, `packages/css/src/metro-plugin.ts`, and their existing test suites. Preserve current resolution/package-scope diagnostics in `packages/css/src/compiler/resolution-identity.ts`; do not replace them with memo eligibility.

Keep build/package/runtime guards and release verifiers unchanged. Add restart semantics and measured cache limitations to the shipped compiler configuration documentation, main API guidance and agent guidance only if the candidate is adopted; this spec does not describe a shipped feature. Evidence records exact source, build, tarball and report identities. The existing v1.2.0 tarball cannot acquire the change retroactively.

After written-spec approval, prepare one native/inline implementation plan covering the whole candidate, adversarial tests, real Metro integration, performance and release-prerequisite qualification. Commit one verified outcome. A failed correctness premise or unchanged blocking gate rejects the complete candidate: archive its evidence, restore task-owned product changes and keep publication blocked. Do not respond by silently narrowing witnesses, raising budgets, adding a runtime dependency or commencing another prototype. A pass recommends exact-artifact qualification; it does not authorize a public push, release exception or npm publication.

## Alternatives and revisit conditions

Keeping fresh compilation preserves the old service-error-equivalence behavior but leaves the measured warm gap unresolved. Retained esbuild contexts and package/kernel restructuring have prior rejection evidence and remain parked. An owned compiler service could establish a different lifetime contract but adds operational work without a demonstrated full-transform benefit. Cross-process compiled-text reuse would require an independently designed portable identity and mutable witness; it is outside this candidate.

This design reopens only compiled-text reuse under the explicitly approved lifetime semantics. Revisit it if complete witness validation consumes the diagnostic headroom, realistic edit/restart workloads regress, Metro cannot enforce session/witness transport, or resource/isolation checks fail. Those are rejection conditions for this candidate, not invitations to waive its gates.
