# M10.5 Cache Qualification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Preserve the user's native execution preference; commit each completed slice and recommend the next M10.5 task.

**Goal:** Qualify a private compiler-context candidate against fresh compilation before proposing production admission.

**Architecture:** Put the pure admission policy and resource-owning session in benchmark tooling. Build a disposable transformer copy with a narrowly checked compile-receipt seam, leaving shipping source and artifacts untouched. Compare fresh and retained modes of the same candidate artifact through full transforms and actual Expo/Metro graph invalidation.

**Tech Stack:** TypeScript, Bun tests, installed `fast-check`, Node v22.0.0 and the current Node executable, esbuild 0.27.7, Vanilla Extract integration 8.0.10, Expo/Metro. Existing Effect 4.0.0-rc.115 remains unchanged.

**Spec:** [Approved cache admission/lifecycle design](../specs/2026-10-05-m10-5-cache-admission-lifecycle-design.md), reviewed by the user on 2026-10-05. The user approved this plan on 2026-10-05. Tasks 1–5 are executed. Task 5 reports failed production-admission gates; completion of the qualification does not approve production retention.

## Global Constraints

- Fresh compilation remains the shipping default. No source under `packages/css/src`, package export, dependency, lockfile or production build-policy change is part of this qualification plan.
- Retained-context trial limits are 4, 8 and 16. Repeat-admission probation holds at most twice the retained limit. Dispose an eviction before creating its replacement; include quarantined/creating/disposing handles in owned-resource accounting.
- Idle trials are 1, 30 and 120 seconds; use an unreferenced owner timer with generation tokens. These are experiment settings, not selected defaults or new performance thresholds.
- Use the supported transformer integration, not a WorkerFarm replacement or signal handler. Never call global `esbuild.stop()` from shared Metro/tooling ownership.
- Every reuse calls rebuild and returns the current immutable source/input receipt; native capture/evaluation runs for every request. Entry/dependency content is not a context key.
- Serialise all candidate CSS compilation and native capture through one worker-local gate. Keep non-CSS upstream transforms outside it. Do not coalesce request results.
- Unknown options/plugins/configuration, buffer/disk conflicts and observed instability select fresh compilation. Loaded-artifact or installed package-info cache changes require module/worker restart; fresh context creation alone cannot refresh them.
- Keep compiler identity, logical/canonical paths and resolution configuration distinct from existing final native-output identity. Do not normalise away differences to manufacture exact parity.
- Own at most one active generation across projects per worker. Await direct session close; treat worker exit as process cleanup without an awaited-disposal claim. Context limits are not heap-byte limits.
- Preserve all approved baselines, thresholds and workload identities. Keep host, full-transform, incremental bundle and native/device evidence separate. Android remains last.

## Review Focus

1. A failed eviction must not permit a replacement that exceeds the live handle limit; Task 3 pins quarantine and disabled-owner behaviour.
2. A timer already queued when a new request arrives must not dispose its newer generation; Task 3 pins timer-token and gate ordering.
3. Unknown resolver inputs and same-content metadata timestamps must not produce optimistic reuse; Task 2 pins fail-closed identity and byte-hash checks.
4. A request callback must never capture another request's input map or native state; Task 4 pins repeated/concurrent complete results and the stale-receipt negative control.
5. A main-process Metro server stopping does not equal worker exit; Task 5 pins idle cleanup, restart and a second project in the same process.

## Files and interfaces

| Path | Responsibility |
| --- | --- |
| `packages/css/bench/context-reuse/admission-policy.ts` | Pure retained/probation LRU decisions; no IO, timer or context handles |
| `packages/css/bench/context-reuse/identity.ts` | Explicit qualification-domain receipts, eligibility and context keys |
| `packages/css/bench/context-reuse/compile-session.ts` | Owned handles, gate, current-build receipts, timers and disposal |
| `packages/css/bench/context-reuse/build-candidate.ts` | Checked disposable copy of the existing transformer; candidate artifact provenance |
| `packages/css/bench/context-reuse/qualify.ts` | Fresh/candidate matrix and real Expo/Metro orchestration in owned fixtures |
| `packages/css/test/context-reuse-*.test.ts` and `*.property.test.ts` | Policy, identity, lifecycle and complete-transform checks |
| `docs/evidence/<run-date>-m10-5-cache-qualification/`, matching assessment, `docs/roadmap.md` | Raw receipts, hashes, observed results and next decision |

Private candidate types are defined by the task that produces them below. Do not export them from a package entrypoint. Qualification creates its own scratch directories and package/app copies, rather than rewriting live Storybook files or the existing incremental baseline fixtures.

## Task 1 — M10.5 pure admission-policy prototype

**Files:** Create `packages/css/bench/context-reuse/admission-policy.ts`; create `packages/css/test/context-reuse-policy.test.ts` and `context-reuse-policy.property.test.ts`; update the roadmap's current handoff.

**Interfaces:** Produces `AdmissionSettings = { capacity: number; admission: "immediate" | "repeat" }`, immutable `AdmissionState = { settings: AdmissionSettings; retained: readonly string[]; probation: readonly string[] }` (oldest first), and `AdmissionPlan = { kind: "fresh" | "reuse" | "create"; key: string; evict?: string; onSuccess: AdmissionState }`. Export private tooling functions `createAdmissionState(settings): AdmissionState`, `planAdmission(state, key): AdmissionPlan`, `forgetAdmissionKey(state, key): AdmissionState`, `clearAdmissionState(state): AdmissionState`. Planning does not mutate/commit the input; the resource interpreter commits only after success.

- [x] Write unit cases for immediate `A,B,A,C` at capacity 2 (evict B), repeat `A,A` (fresh then create), probation pruning at `2 * capacity`, first access after retained eviction, failed promotion via `forgetAdmissionKey`, clearing and invalid runtime settings. Assert input state is unchanged and arrays are immutable.

```ts
expect(planAdmission(createAdmissionState({ capacity: 4, admission: "repeat" }), "A").kind).toBe("fresh")
// Commit first.onSuccess, then plan A again: kind === "create"; probation excludes A.
// Independent generated event model: retained.length <= capacity,
// probation.length <= 2 * capacity; unique/disjoint keys; frozen previous state unchanged.
```

- [x] Run `cd packages/css && bun test test/context-reuse-policy.test.ts test/context-reuse-policy.property.test.ts`. Expected RED: missing policy API; once present, assertions must fail for the relevant absent rule, not setup errors.
- [x] Implement only the pure policy. Validate positive safe integers and safe doubled capacity, supported admission modes and non-empty keys. Touch retained order on successful use; no lifetime frequency map or resource code.
- [x] Run the focused command and `bun run test` from `packages/css`. Expected GREEN: policy/model checks and package suite pass. Generated traces use existing fast-check with seed `10505`, 500 runs and at most 200 events; record shrunk counterexamples on failure.
- [x] Commit as `test(perf): model M10.5 bounded context admission`; recommend **M10.5 Task 2 — configuration identity**. Do not describe pure policy checks as real esbuild qualification.

## Task 2 — M10.5 configuration identity and eligibility

**Files:** Create `packages/css/bench/context-reuse/identity.ts`; create `packages/css/test/context-reuse-identity.test.ts`; update the roadmap handoff.

**Interfaces:** Consumes explicit fixture paths and installed compiler identity. Produces `ClosedResolutionDomain = { configurationFiles: readonly string[]; symlinkPaths: readonly string[]; allowedInputRoots: readonly string[]; loadedArtifacts: readonly string[]; installationFiles: readonly string[] }`; immutable `ConfigurationReceipt = { fingerprint: string; versions: { esbuild: string; integration: string }; files: readonly { path: string; sha256: string }[]; symlinks: readonly { logicalPath: string; targetPath: string }[] }`; `CompileRequest = { filePath: string; cwd: string; identOption: "debug" | "short"; esbuildOptions: Readonly<Record<string, unknown>>; domain: ClosedResolutionDomain; entryBytes?: Uint8Array }`.

Export `captureConfiguration(request): ConfigurationReceipt`, `assessReuse(request: CompileRequest, loadedReceipt: ConfigurationReceipt, previousReceipt?: ConfigurationReceipt): ReuseEligibility` and `createContextKey(request: CompileRequest, receipt: ConfigurationReceipt): string`. `ReuseEligibility` is `{ kind: "eligible"; key: string; receipt: ConfigurationReceipt } | { kind: "fresh"; reason: ReuseReason } | { kind: "restart-required"; reason: ReuseReason }`. `ReuseReason` is a closed union defined in this module: `unknown-build-option`, `unknown-plugin`, `incomplete-resolution-domain`, `configuration-changed`, `entry-buffer-mismatch`, `source-unstable`, `loaded-artifact-changed`, `package-info-changed`. Snapshot these strings in tests.

- [x] Write tests: entry/theme byte edits preserve context keys; logical roots and symlink targets remain distinct; aliases/extends, manifests, lockfile and explicit settings change eligibility; byte edits with preserved mtimes invalidate; missing files, unknown options/plugins and unlisted input roots select fresh. Only package-info/loaded-artifact changes return `restart-required`.
- [x] Run `cd packages/css && bun test test/context-reuse-identity.test.ts`; expected RED, then implement byte-hash/canonical-order receipts without an mtime-only shortcut. Whitelist the measured compile option domain and known file-scope/receipt plugins; unknown executable plugin configuration stays fresh.
- [x] Keep initial receipt completeness restricted to explicit disposable fixture domains. Include root/nested tsconfig plus their complete extends closure, relevant project/dependency package manifests, package name used by file-scope setup, install/lock identity and symlink targets. Verify discovered build inputs against declared roots and configuration inventory; unprovable resolver coverage cannot become eligible merely because compilation succeeded.
- [x] Test installed Vanilla Extract's package-info cache in a disposable process: changing package name at the same cwd requires a new process/module lifetime. Record the old fresh compiler's limitation; do not claim a context reset fixes it. Mutable ordinary config inputs must either recreate correctly or remain explicitly unqualified/fresh.
- [x] Run focused tests and the package suite; expected GREEN. Commit as `test(perf): define M10.5 compile identity receipts`; recommend **M10.5 Task 3 — resource session**.

## Task 3 — M10.5 resource-owning compile session

**Files:** Create `packages/css/bench/context-reuse/compile-session.ts`; create `packages/css/test/context-reuse-session.test.ts` and `context-reuse-session.property.test.ts`; update the roadmap handoff.

**Interfaces:** Consumes Tasks 1–2. Produces `CompileReceipt = { source: string; inputs: Readonly<Record<string, unknown>>; watchFiles: readonly string[] }` and `CompileSession` with `compile(request: CompileRequest): Promise<CompileReceipt>`, `runNative<T>(request: CompileRequest, evaluate: (receipt: CompileReceipt) => Promise<T>): Promise<T>`, `invalidate(reason: string): Promise<void>`, `snapshot(): SessionSnapshot`, `close(): Promise<void>`.

Export `createCompileSession({ settings, idleMs, mode, backend, clock }): CompileSession`. `mode` is `fresh | immediate | repeat`; retained modes must agree with `settings.admission`; each request supplies its resolution domain. The qualification `backend` implements `fresh(request: CompileRequest): Promise<CompileReceipt>`, `create(request: CompileRequest): Promise<CompileHandle>` where `CompileHandle` has `rebuild(): Promise<CompileReceipt>` and `dispose(): Promise<void>`; `clock` supplies `now(): number`, `schedule(delayMs: number, callback: () => void)` returning `{ cancel(): void; unref(): void }`. Real backend/clock defaults live in this module; controlled test implementations belong in test support. `SessionSnapshot` records state (`open | closing | closed | disabled`), generation, live/creating/disposing/quarantined counts, retained/probation counts, hit/miss/bypass/eviction/disposal totals and queue wait, without exposing handles.

- [x] Write a controlled-resource RED test that holds an eviction's dispose promise: no replacement create occurs before it resolves. Inject disposal failure: the owner becomes disabled, quarantine stays accounted for, later requests use fresh and do not increase owned-context count. Assert original build/native errors survive cleanup failures.
- [x] Add tests for stale timer tokens, a queued request canceling idle expiry, three idle/reopen cycles, same completion outcome on repeated close, admitted queued work draining before close and new work rejecting after close. Idle generation disposal must allow later use; whole-session close must not.
- [x] Run `cd packages/css && bun test test/context-reuse-session.test.ts test/context-reuse-session.property.test.ts`; expected RED. Implement the gate and resource interpreter; commit policy state only after success, detach each capture slot in `finally`, evict after native evaluation failure, and never return last-good output.
- [x] Add real-esbuild checks for numeric entry and imported-token changes, syntax error/repair, fresh metadata per rebuild and direct session cleanup. Resolve the installed esbuild through the measured integration in qualification tooling, assert exact versions 0.27.7/8.0.10, and add no package dependency. Include all actual backend/config work in later timing.
- [x] Run focused tests, `bun run test` and `bun run typecheck` from `packages/css`; expected GREEN. Model resource traces with seed `10506`, 500 runs, bounded trace length 200; use controlled clocks for all 1/30/120-second timer semantics, plus real idle smoke checks.
- [x] Commit as `test(perf): qualify M10.5 context session lifecycle`; recommend **M10.5 Task 4 — complete-transform candidate**. No global esbuild stop or Metro bootstrap adapter is introduced.

## Task 4 — M10.5 disposable full-transform receipt integration

**Files:** Create `packages/css/bench/context-reuse/build-candidate.ts`; create `packages/css/test/context-reuse-transformer.test.ts`; create task evidence/assessment; update roadmap handoff.

**Interfaces:** Consumes Task 3 `runNative` and `CompileReceipt`. Produces `buildCandidate(outputRoot: string): Promise<CandidateArtifact>`, where `CandidateArtifact = { transformerPath: string; packageRoot: string; artifactFiles: readonly { path: string; sha256: string }[]; patchReceipt: readonly { operation: string; matches: number }[] }`. The candidate has normal transformer exports plus private `__crumbsQualificationSnapshot(): SessionSnapshot` and `__crumbsQualificationClose(): Promise<void>`. `CRUMBS_CONTEXT_QUALIFICATION_CONFIG` points to a fixture JSON file containing `{ mode, settings, idleMs, domain }`; its absence selects fresh. Parse it once per worker/module lifetime. This flag exists only in the disposable copy, not shipping configuration.

- [x] Write RED tests for the candidate builder and exact fresh/retained receipts: alternating requests must not reuse a prior capture callback; three concurrent entries cannot leak native capture; a queued failing stylesheet followed by a repaired request must recover. Include strict/dev/platform/explanation settings and plain/nested/workspace dependencies.
- [x] Build an owned temporary package copy. Copy current compiler source and package metadata; preserve logical fixture paths and the package-relative `src`/`dist` layout; copy authoring artifacts so file-scope/package identities and compiler-dist exclusion remain coherent. Use the existing build toolchain without rebuilding or overwriting shipping `dist`.
- [x] Apply checked TypeScript-AST edits only to the copied transformer: replace its compile/capture block with the session receipt; rename the private native operation to a helper receiving that receipt; wrap its original private entry with `runNative` so all native compilation entry points share the gate. Require exactly one match for each named edit and hash original/copied sources. Keep every later lowering/emission operation intact. Do not monkey-patch dependency exports.
- [x] Build once per evidence collection and reuse the **same candidate artifact and fixture paths** for fresh/immediate/repeat variants. Record its genuine compiler key. Assert exact generated source, inputs, native metadata, serialized Metro results and diagnostics across candidate modes. Compare candidate-fresh with shipping-fresh semantic golden tests separately: artifact compiler markers are legitimately different and cannot be normalised into an exact-parity claim.
- [x] Deliberately retain a prior receipt in an isolated negative control; require it to fail native metadata/result parity even if esbuild source hashes match. Buffer/disk conflicts, unstable known inputs and unknown settings must report fresh bypass; installed package-info/artifact changes must report restart-required scope rather than pretend to reload modules.
- [x] Run `cd packages/css && bun test test/context-reuse-transformer.test.ts`, then the package suite and typecheck; expected GREEN. Run complete-transform smoke processes on exact Node v22.0.0 and current Node. Record before/after hashes proving shipping source/artifacts and fixture originals are unchanged; await only owned session close in tooling.
- [x] Commit as `test(perf): qualify M10.5 full-transform receipt candidate`; recommend **M10.5 Task 5 — incremental Metro qualification**. Candidate parity is not production adoption.

## Task 5 — M10.5 actual incremental Expo/Metro and host qualification

**Files:** Create `packages/css/bench/context-reuse/qualify.ts`; create `packages/css/test/context-reuse-qualification.test.ts`; create run-date evidence and assessment; update roadmap and ADR evidence. Reuse `packages/css/bench/metro-incremental.ts`'s receipt protocol as a reference without changing its baseline fixtures or approved workload identity.

**Interfaces:** Consumes `CandidateArtifact`, session counters and receipt types. Produces `runCacheQualification({ outputRoot, floorNode, currentNode }): Promise<QualificationReport>` with per-gate `passed | failed | not-run` status, reason, exact environment/artifact/workload identity, raw receipt paths and restoration checks. Verify the floor executable returns exactly `v22.0.0`; use actual current `node --version`, not Bun's embedded Node field.

- [x] Write RED evidence-admission tests: a changed entry alone cannot stand in for dependency invalidation; a source-only hash match cannot hide metadata divergence; a surviving process or failed disposal cannot pass lifecycle; an app serialization error cannot be admitted as a successful bundle; a missing environment/control stays not-run.
- [x] Establish a successful fresh Expo bundling path in an owned app copy before candidate incremental measurements. Use Expo's normal CLI/configuration path and correct dependency/watch roots. If the recorded full-source-map serializer error persists, retain it and mark bundle-dependent gates failed/not-run; finish independent tests without inventing bundle acceptance.
- [x] Run actual bundle requests after entry, plain-token, nested CSS and workspace-source edits; assert new unique baked values are present and prior values absent in unchanged importing entries. Add/remove imports and edit alias/extends, manifest exports, lock/install identity and symlink target receipts. Record fresh bypass or required restart explicitly and compare against a fresh reference at the same coherent state.
- [x] Exercise stock Metro with one and multiple workers, worker-thread mode where available, shutdown/restart, a long-lived main process, another project, and syntax repair. Idle cleanup must dispose owned contexts; worker exit must leave no observed process/service survivors. Do not demand shared-service termination after single-worker idle cleanup or use global stop to manufacture it. Unsupported topology remains not-run, not passed.
- [x] Freeze the current-Node performance matrix before collection: three workloads (seven-entry loop, four-hot-plus-32-entry scan, 32-entry loop), three limits (4/8/16), immediate and repeat admission, and fresh reference. Run five fresh-process blocks per workload, alternating mode order: **105 processes** (`3 * 5 * (1 fresh + 6 retained variants)`). Pair each retained variant with its block's fresh run. Retain cold, complete-transform and queue timings, receipts, hit/miss/eviction/resource counts and Node/service RSS; include configuration hashing and session overhead in timed operations.
- [x] Qualify real idle/reopen with three cycles at each 1/30/120-second setting on the selected fixed seven-entry workload, outside the main throughput matrix; log progress during long trials. Run behavioural/package/tooling checks on exact Node v22.0.0 separately, without asserting current-Node performance passes floor budgets. Do not recalibrate or rerun unchanged host-budget baselines merely because this private prototype exists.
- [x] Run focused qualification tests, the package suite, typecheck, `bun run docs:build` and raw identity/hash/restoration verification. Record every failed or not-run gate; successful controls do not require every existing M10.5 budget to pass. Update the guarantees matrix only if supported/measured scope actually changes.
- [x] Commit as `docs(perf): report M10.5 cache qualification gates`; recommend either **M10.5 production-admission review** with measured trade-offs, or the named blocking remediation. Adoption, dependency declarations, public opt-in config, default bounds and shipping compiler edits require a separate concrete review. Android remains last.

## Spec coverage and execution handoff

| Spec requirement | Owning task |
| --- | --- |
| Immediate/repeat admission and finite history | 1, with actual resources in 3 |
| Identity, configuration closure, restart/bypass domain | 2; real resolver changes in 5 |
| Disposal, quarantine, idle, close, error recovery | 3; stock Metro ownership in 5 |
| Current input/native receipts, concurrency and native gate | 4 |
| Actual incremental graph and package/worker topology | 5 |
| Full-transform, cold, queue, memory and workload evidence | 4–5 |
| Node floor, runtime isolation, unchanged budgets and Android-last | Global constraints and 4–5 |

Self-review: interfaces are defined before consumption; trial settings match the spec; unknown resolution coverage remains fresh; private candidate artifact identity is distinct from shipping identity; all five review-focus failures have named tests. Initial resolver support is deliberately a closed qualification domain, not a general production resolver guarantee.

After plan review, continue natively with **M10.5 Task 1 — pure admission-policy prototype**. Commit each task before recommending the next numbered task. A plan approval does not approve production admission or release.

Task 5 evidence: [assessment](../../assessments/2026-10-05-m10-5-cache-qualification.md). The direct-entry, import-removal, dependency, idle/floor and stock owner controls pass; resolution/receipt and performance benefit gates fail, and installed-package replacement and host/device budgets remain not-run. The original 105 throughput timings are invalidated and excluded; 105 isolated processes are recollected. This is completed qualification with failed admission, not completed production adoption.
