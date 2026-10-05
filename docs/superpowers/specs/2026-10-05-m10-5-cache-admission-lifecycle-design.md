# M10.5 compiler context admission and lifecycle design

- Status: Proposed written spec; design-slice scope approved, detailed contracts awaiting review
- Date: 2026-10-05
- Roadmap: M10.5 in [roadmap](../../roadmap.md)
- Source inspected: `4383250`
- Governing ADR: [native design-system compiler](../../decisions/adopt-native-design-system-compiler.md), D3, D6 and D11
- Evidence: [bounded contexts](../../assessments/2026-10-05-m10-5-context-cache-cardinality-lifecycle.md), [complete transformer and Metro lifecycle](../../assessments/2026-10-05-m10-5-full-transform-cache-metro-lifecycle.md)

## Intent and scope

Improve repeated native stylesheet compilation for large React Native design systems while preserving emitted code, diagnostics, dependency metadata, public APIs and runtime isolation. Reuse esbuild's compilation work; run native evaluation and emission for every request. A context hit is never a cached native-result hit.

This spec describes an opt-in qualification candidate, not a shipped feature, approved cache default or permission to change production code. The next slice writes its implementation plan after review. Production admission follows independent incremental Metro and performance qualification. Existing approved budgets and Android-last sequencing remain unchanged.

## Evidence and alternatives

The seven-entry full-transform replay measured fresh compilation at 41.088 ms and capacity 8 at 37.902 ms (-7.8%), with sampled esbuild-service RSS increasing from 45.1 to 59.2 MiB. Capacity 4 had no hits. All 567 result/compile receipts matched fresh output; retaining the first request's capture callback broke all 56 cache hits in the negative control. These are Node 24 serial worker measurements, not concurrent, incremental graph or device acceptance.

| Approach | Benefit | Cost / limitation | Recommendation |
| --- | --- | --- | --- |
| Worker-local contexts through the existing transformer | Uses current Metro integration; avoids another persistent process; can evict and idle-dispose contexts | No awaited Metro shutdown callback; native service RSS may stay high until process exit | Qualify this first, opt-in only |
| Replace Metro's worker bootstrap to add teardown | Explicit awaited disposal demonstrated in the experiment | Private WorkerFarm replacement is not a supported production hook; upgrades and single-worker mode differ | Keep as experimental lifecycle control |
| A dedicated compiler service owned by Crumbs | Explicit close boundary; isolates native compilation and service memory | Additional process/RPC, failure recovery and deployment work may outweigh a 7.8% gain | Revisit if the worker-local lifecycle or isolation gate fails |

Fresh compilation remains the default and fallback for requests whose compilation identity cannot be established. Capacity 8 is a trial setting; seven files in one worker do not select a universal bound.

## Ownership and supported integration

Integrate through the existing `withNativeStyles` / Metro `transformerPath` boundary. Metro documents that interface and runs worker code in its main process when `maxWorkers <= 1`; [configuration documentation](https://metrobundler.dev/docs/configuration/#transformerpath). Installed Metro's `WorkerFarm` hardcodes its bootstrap and its normal worker has no teardown export. Do not patch WorkerFarm, install process signal handlers, or assume a transformer export will receive shutdown notification.

One module-local owner manages Crumbs contexts in each transform worker process or worker thread. In single-worker mode it resides in Metro's main process. Keep ownership local to the actual loaded compiler module; do not place contexts in an application-global symbol store or share them across workers. Each owner has one active configuration generation, one finite context budget and one optional finite admission-history budget across all projects it serves. Changing projects drains the old generation before admitting the new one; there is no unbounded map of project owners.

Use a worker-local CSS-operation gate around compilation and native capture/evaluation. All Crumbs native compilation entry points using shared capture state must participate. Different requests receive distinct results; do not merge them into one in-flight rebuild, because esbuild can coalesce concurrent rebuild calls. Ordinary non-CSS upstream transforms remain outside this gate. Pending caller requests are not retained cache entries; record queue wait separately and qualify concurrent load before making a throughput claim.

The owner exposes private `compile(request)`, `invalidate(reason)`, `snapshot()` and idempotent `close()` operations for tooling and qualification. Direct tooling callers that create a session must await `close()` in `finally`. Metro uses the worker-local owner and idle cleanup, not a new public resource API.

## Compilation identity and fresh receipts

Do not monkey-patch Vanilla Extract's exported `compile` function. Add a private compile adapter that returns an immutable receipt containing the current generated source, metafile input map and watch paths. The native transformer consumes that receipt directly. A retained plugin may collect current-build inputs into a request-local slot while the CSS-operation gate is held; it must never write into a previous transform's closure. Clear the slot before every rebuild, reject a missing/error receipt and detach it in `finally`.

The context key contains both the logical and canonical entry/root paths, identifier mode, explicit normalized build options, the compiler artifact identity, and actual esbuild/Vanilla Extract versions. Preserve logical paths in generated source identities. Entry and stylesheet dependency content are **not** part of the context key: every admitted request calls `rebuild()` to read those changes, then recomputes native dependencies and output. Existing final-result identity still includes native platform, dev, strict diagnostics, stylesheet mode and explanation settings through `dependency-analysis.ts`; these options cannot be skipped by context reuse.

Only the known Vanilla Extract file-scope plugin and Crumbs receipt plugin are eligible initially. Unknown plugin identity, unmodelled environment-dependent resolution or unrecognised build options bypass retention and use fresh compilation. Do not silently discard custom options.

Each generation also has a resolution-configuration receipt: relevant tsconfig files and their `extends` closure, package name/configuration used by the file-scope plugin, relevant package manifests/exports and installation/lockfile identity, explicit resolver/build settings and observed symlink targets. Recheck this receipt before reuse. Resolution inputs discovered after rebuilding join the receipt. A missing, changed or incompletely discoverable configuration receipt disposes the generation and takes the fresh path; it must not be guessed from stylesheet input lists, which do not enumerate every resolver configuration file. Compilation implementation must document the admitted receipt domain before enabling retention for it.

Changing compiler artifacts, loaded dependency versions or environment-sensitive options requires a new worker/module lifetime, not simply clearing contexts while continuing to execute old imported JavaScript. If the current loaded artifact identity no longer matches disk, disable retention and require the same worker restart needed by the fresh transformer; do not claim in-process compiler hot replacement.

Metro's entry buffer and the disk source used by esbuild must agree for an admitted request. When they disagree, bypass retention through the unchanged fresh path and record the bypass. The current fresh transformer also reads disk during compilation; this spec does not promise compilation of an older buffer snapshot. Before/after dependency checks can detect common mid-build edits but do not provide an atomic filesystem snapshot. Record this limit, exercise edits during builds, discard a retained context after observed instability, and use fresh compilation; do not promote an after-build hash into proof that esbuild read those exact bytes. Qualification must distinguish stable-input parity from overlapping filesystem-edit behaviour.

## Admission, bounds and idle disposal

Qualification compares the existing immediate-admission LRU with a bounded repeat-admission candidate. Both use finite integer limits supplied explicitly by the harness; no production defaults are selected here.

- Trial retained-context limits: 4, 8 and 16 per owner, including owned contexts currently being created or disposed. Await eviction disposal **before** creating a replacement so owned context count does not transiently exceed the limit. Temporary fresh-build resources are outside this retained-handle count and must remain included in process/service RSS measurements; the limit is not a native heap-byte bound.
- Immediate admission: create a context on the first eligible request; touch an existing context after successful rebuild; evict the least recently used context.
- Repeat admission: first access compiles fresh and records the key in a probation LRU of at most twice the context limit. A second access while the key remains in probation promotes it to a retained context. Remove probation entries on promotion, configuration replacement and failure. A hit touches the retained LRU. Evicted entries return to the same first-access rule; no lifetime frequency table survives eviction.
- Trial idle durations: 1, 30 and 120 seconds. These are experiment settings, not guarantees or existing performance thresholds. Arm one unreferenced timer only after queued/active CSS work drains. A queued request cancels the idle deadline. A stale timer's generation token cannot close a newer generation.
- Idle expiry awaits disposal under the owner gate and clears both LRUs. A request arriving during disposal waits, then starts a new generation. Idle expiry does not interrupt a build or invalidate a result already returned.

Represent eligibility, generation state and admission transitions as plain immutable tagged values with a pure policy function. Keep esbuild context handles, timers, the gate and disposal in a small resource interpreter. Property tests compare event sequences against an independent model and invariants, rather than exposing effectful handles to the policy. This follows the ADR's functional-programming direction without adding a userland programming model.

Do not introduce a new Effect version or package. Existing `effect@4.0.0-rc.115` can be used for a concrete compiler resource boundary if it simplifies ownership, but is not required in the admission-policy hot path. If production source imports esbuild directly, declare the measured `esbuild@0.27.7` as an exact compiler dependency rather than relying on transitive resolution; audit build policy and runtime graphs before adoption. This design slice installs nothing.

## Lifecycle and failure contract

| Event | Required behaviour |
| --- | --- |
| Successful hit or admission | Return this request's rebuilt source and fresh input receipt; evaluate/emit native output normally |
| Eviction / configuration replacement | Stop admission to the removed context; await disposal before replacement; remove handle and probation state |
| Idle expiry / direct tooling close | Drain active work, dispose every owned context once, clear references; repeated close returns the same completion outcome |
| Build or native-evaluation failure | Return the existing diagnostic, never the last good output; evict/dispose the affected context and allow a repaired later request to compile afresh |
| Cleanup failure | Remove the unusable handle from admission, retain it in a bounded cleanup quarantine, record the cleanup error, disable further retention for that owner and preserve the original build diagnostic; do not report successful cleanup |
| Worker/process exit | Operating-system ownership releases process resources; no claim that async context disposal was awaited |
| Single-worker Metro shutdown | Contexts can persist until idle disposal or main-process exit; test a long-lived main process after server shutdown explicitly |

`close()` atomically marks an owner closing and rejects new session work; it drains requests already admitted to that session. Metro idle cleanup closes only the current generation so a later request can create another. Distinguish these states in tests. Disposal errors do not permit creating replacements beyond the live-context limit; a disabled owner keeps any unresolved disposal accounted for until successful cleanup or process exit.

Use only owned `context.dispose()` calls. esbuild documents that disposal waits for existing builds and frees context resources; [build-context API](https://esbuild.github.io/api/#build). Do not call global `esbuild.stop()` in the shared Metro process: another compiler may use the same service. The previous experiment used stop only as an isolated measurement control. Idle disposal is not a promise to lower service RSS; the measured allocator high-water persisted after disposal.

## Qualification requirements

All boxes are pending implementation. Existing benchmark thresholds are unchanged; trial cache selection requires its own review of performance and memory trade-offs.

- [ ] Exact generated source, current metafile inputs, native dependency metadata, complete Metro results and diagnostics match fresh compilation on entry, plain-token, nested CSS and workspace-source edits.
- [ ] Real Metro graph invalidation rebuilds unchanged importers after dependency edits, with new baked values present and prior values absent. A direct WorkerFarm replay alone does not pass this gate.
- [ ] Added/removed imports, tsconfig aliases/extends, manifest/exports changes, installation changes and symlink retargeting either produce correct reused results or deliberately select fresh compilation.
- [ ] Concurrent calls under controlled stable input/settings each match their fresh reference; different entries cannot leak capture state; queued failures do not poison subsequent work. Buffer/disk conflicts and mid-build edits select the documented fresh bypass without claiming snapshot isolation.
- [ ] Model-based sequences cover acquire, hit, eviction, failed creation/rebuild/disposal, idle expiry, stale timers, configuration replacement and repeated close. Live context count never exceeds its explicit limit; probation count never exceeds twice that limit.
- [ ] Idle cleanup and direct session close await exactly-once disposal; repaired syntax/dependency errors recover without cached output or changed diagnostics. No negative-cache entry retains a source error.
- [ ] Actual Expo/Metro runs exercise one and multiple workers, process and worker-thread modes where supported, server shutdown/restart, and a second project in the same long-lived process. Observe child resources after exit separately from awaited disposal.
- [ ] Stock fresh compilation, immediate admission and repeat admission are measured in at least five fresh-process pairs with alternating order. Capture cold setup, complete transform time, edit-to-bundle receipt time, queue wait, hit/miss/eviction counts, context count and process/service RSS separately.
- [ ] Replay seven-entry, four-hot-plus-scan and high-cardinality workloads across explicit trial limits; measure through at least three idle/reopen cycles. Freeze workloads and trial settings before collection. Select no bound from hit rate alone and label RSS as process evidence.
- [ ] Node v22.0.0 package/tooling behaviour and current Node qualification both pass their required checks; approved host-budget comparisons retain their existing workload/identity. Consumer runtime graphs remain free of esbuild/compiler imports.
- [ ] Resolve the recorded Expo serializer issue or use an independently qualified Expo bundling path before claiming incremental app-bundle success. Device, screen-reader and release performance evidence stay separate; Android remains last.

## Candidate implementation boundaries and next slice

After written-spec review, write the **M10.5 cache qualification implementation plan**. It should split work into a private session/policy prototype, full-transform receipt integration, then actual incremental Metro/lifecycle A/B. Keep initial experimentation in disposable fixtures; production admission is a separate decision after these gates.

Affected paths are `packages/css/src/compiler/` for a prospective compile-session/policy adapter; `src/transformer.ts` for current receipts and the CSS-operation gate; `src/compiler/dependency-analysis.ts` and `src/transform-cache.ts` for existing final-result identity/invalidation; `src/metro-plugin.ts` for the existing transformer boundary; and `packages/css/test/`, `packages/css/bench/metro-incremental.ts`, `scripts/`, and `docs/evidence/` for qualification. Any later direct esbuild import also affects `packages/css/package.json`, `build-policy.ts` and `bun.lock`. No ordinary authoring, theme/core, recipe or Sprinkles API changes are proposed.

Stop at fresh compilation if unsupported configuration, lifecycle mode or insufficient benefit prevents safe admission. The spec does not convert a prototype into a shipping cache, promise lower service memory, or accept the existing proposed ADR as a whole.
