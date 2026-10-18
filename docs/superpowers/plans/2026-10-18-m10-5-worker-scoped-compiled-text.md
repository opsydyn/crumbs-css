# M10.5 Worker-Scoped Compiled-Text Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Native/inline execution is already selected; do not reopen that choice or delegate implementation.

**Goal:** Qualify one complete compiled-text reuse candidate against the unchanged M10.5 correctness and host-performance gates, or restore shipping code and commit its rejection evidence.

**Architecture:** Retain compiled JavaScript and a complete mutable-input witness in a bounded worker memo; evaluate authoring afresh per transform. Bind native Metro outer-cache receipts to a configuration session and validate them on every reuse path. Keep the authoring/runtime graph, package layout and fresh-compilation fallback intact.

**Tech Stack:** Existing TypeScript/Bun, Vanilla Extract integration, esbuild, Babel parser, Metro/Expo and fast-check; no dependency changes. Current installed compiler versions must be captured, not inferred from manifest ranges.

**Spec:** [Approved worker-scoped compiled-text design](../specs/2026-10-18-m10-5-worker-scoped-compiled-text-design.md), reviewed at `090c4fd` and approved by the owner on 2026-10-18. This implementation plan awaits written review.

## Global Constraints

- One complete implementation slice and one outcome commit. Steps below are internal checkpoints, not separately admitted roadmap slices. Stop at the first unresolved correctness premise or failed complete performance gate; preserve evidence before restoring task-owned product changes.
- Use the existing managed worktree `/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css`, branch `codex/m10-5-v12-compiler-remediation`. Preserve unrelated `.superpowers/`, `apps/storybook/ios/` and all primary-checkout changes.
- Freeze the independent production control from `090c4fd` before edits. Plan/approval documentation changes do not alter its product source. Use new owned temporary directories; never mutate shared dependency installations or existing evidence packets.
- Compiler installation is fixed for a tooling-process lifetime; compiler upgrades require full Metro restart. Valid hits need not reproduce compiler-service-start failures. Mutable application/configuration/resolution inputs remain fully witnessed, and every transformer invocation executes authoring afresh.
- No public API/options/subpaths/dependencies, runtime imports, compiler backend, package layout, numeric budgets, baseline, release policy or verification relaxation. Keep Node `>=22.0.0` and Bun `>=1.3.0` package support. SDK apps' higher Node requirements remain separate.
- Memo: **16 owners**, **8 MiB total**, **1 MiB per entry**, counting probation and ready UTF-8 text/serialized metadata. Each witness: **512 bundled files**, **512 directory observations**, **1,024 import edges**, **64 configuration/manifest/lock observations**, **128 symlink observations**. Oversized/incomplete proof compiles fresh.
- No retained contexts/watchers/timers/workers/evaluated exports/native outputs/failures. No coalesced authoring, hidden eager confirmation or benchmark-only cache path.
- Unchanged official warm absolute ceiling **6.514 ms** and **15%** regression; retained effective limit **6.51374375 ms**. Read all exact cold/incremental/other limits from `packages/css/bench/budgets.json`. **11 blocking comparisons pass; all 21 valid and complete; advisory failures remain visible.**
- Keep local development qualification distinct from clean exact-source/artifact release qualification and hosted Mac results. No public push, runner registration, version bump, tag or publication in this slice. Physical-device and spoken-reader acceptance remains deferred; owned Simulator/emulator software checks remain required.

## Review Focus

1. A nearer package, missing parent directory or higher-priority file appears without changing recorded source bytes: both worker and outer caches must invalidate (steps 2, 6 and 8).
2. A failed/mutated request completes after another request or eviction: it must not promote or resurrect old text (steps 3 and 4).
3. Metro is wrapped twice or restarted with an existing disk store: reject foreign native receipts without invalidating ordinary files or growing the store per session (steps 5 and 8).
4. Runtime-extension linkage reads a dependency outside the authoring bundle: outer-cache reuse must include that dependency or be disabled (steps 4 and 6).
5. A missing field or malformed native receipt is mistaken for an ordinary Metro result: fail closed without crashing or traversing unbounded input (steps 5 and 6).

## File boundaries and interfaces

New private modules under `packages/css/src/compiler/`:

- `compiled-text-witness.ts`: `captureCompiledTextWitness(request: CompiledTextRequest, inputs: CompileInputs): WitnessAdmission`; `validateCompiledTextWitness(witness: CompiledTextWitness): boolean`; `decodeCompiledTextWitness(value: unknown): CompiledTextWitness | undefined`. No cache ownership.
- `compiled-text-memo.ts`: `createCompiledTextMemo(): CompiledTextMemo`; production owns one instance per loaded transformer module. It owns admission, payload limits and generations, not compilation/evaluation.
- `metro-cache-session.ts`: `createNativeCacheSession(projectRoot: string, configIdentity: string): NativeCacheSession`; `readNativeCacheSession(value: unknown): NativeCacheSession | undefined`. No global mutable cross-project registry. Private transformer-config field is `__crumbsNativeCacheSession`.

Private types, defined once and imported by consumers:

```ts
type CompileInputs = Readonly<Record<string, unknown>>;
type CompiledTextRequest = Readonly<{
  owner: string; // logical/canonical root and entry, unambiguous encoding
  key: string;   // source/options/environment/worker epoch digest
  cwd: string;
  absoluteEntryPath: string;
  options: Readonly<Record<string, unknown>>; // only admitted internal options
}>;
type FileFact = Readonly<{path: string; canonical: string; sha256: string}>;
type DirectoryFact = Readonly<{path: string; canonical: string;
  entries: readonly Readonly<{name: string; kind: string; target: string | null}>[]}>;
type LinkFact = Readonly<{path: string; target: string; canonical: string}>;
type ImportFact = Readonly<{importer: string; request: string; kind: string;
  destination: string; external: boolean}>;
type CompiledTextWitness = Readonly<{
  version: 1; requestKey: string;
  files: readonly FileFact[]; directories: readonly DirectoryFact[];
  links: readonly LinkFact[]; imports: readonly ImportFact[];
  absent: readonly Readonly<{ancestor: string; components: readonly string[]}>[];
  configurationPaths: readonly string[];
}>;
type WitnessAdmission = {kind: 'eligible'; witness: CompiledTextWitness}
  | {kind: 'fresh'; reason: string};
type CompiledTextValue = Readonly<{
  source: string; inputs: CompileInputs; witness: CompiledTextWitness
}>;
type MemoTicket = Readonly<{owner: string; generation: number}>;
type CompiledTextMemo = {
  begin(request: CompiledTextRequest):
    {ticket: MemoTicket | undefined; hit: CompiledTextValue | undefined};
  finish(ticket: MemoTicket | undefined, value: CompiledTextValue | undefined,
    freshConfirmations: number): void;
  abort(ticket: MemoTicket | undefined): void;
  clear(): void;
  inspect(): Readonly<{owners: number; bytes: number; probation: number; ready: number}>;
};
type NativeCacheSession = Readonly<{
  version: 1; token: string; root: string; canonicalRoot: string; configIdentity: string
}>;
```

`begin` reserves a bounded owner/generation and validates a ready hit before returning it. `finish` runs only after successful full-request post-validation; a missing ticket/value is a no-op. Fresh confirmation counts refer only to independent compiler calls with complete matching before/after witnesses; never count a memo hit. A mismatched/old ticket cannot mutate a replacement. `inspect`/`clear` are private module test controls, not package exports. Requests beyond owner capacity can run fresh without a retained ticket.

Modify `stable-resolution-compile.ts` only to expose internal before/after-attempt observations needed to prove fresh confirmations; retain its three-attempt limit, diagnostics and authored-hint behavior. Modify `transformer.ts` for explicit compiler-input return/replay, memo lifecycle and final validation. Keep all existing public function signatures, source maps, manifest sidecars and emitted metadata contracts.

Add `packages/css/src/metro-cache-binding.ts` for internal bound cache helpers, shared by `metro-plugin.ts` and `transform-cache.ts`. Keep existing exported helper signatures; unbound helpers reject native receipts and preserve ordinary results. Strip the session from upstream delegated configuration in both native and non-native branches; upstream configuration semantics otherwise stay unchanged. The bound adapter interface is `createBoundNativeStylesCacheStore<T>(inner: CacheStore<T>, session: NativeCacheSession): CacheStore<T>` and `hasChangedBoundNativeTransformDependencies(value: unknown, session: NativeCacheSession): boolean`; accept the existing optional-name store shape internally as the public wrapper does.

New test files: `packages/css/test/compiled-text-witness.test.ts`, `compiled-text-witness.property.test.ts`, `compiled-text-memo.test.ts`, `compiled-text-transformer.test.ts`, `compiled-text-metro.test.ts`, `compiled-text-evidence.test.ts`. Extend existing `stable-resolution-compile.test.ts`, `resolution-identity.test.ts` and `transformer.test.ts` rather than duplicating their fixtures.

New private qualification tooling: `packages/css/bench/compiled-text-reuse/qualify.ts`, `metro.ts`, `verify.ts`. Output under a fresh owned temporary root and archive final evidence at `docs/evidence/2026-10-18-m10-5-worker-scoped-compiled-text/`. The harness records output/input hashes, call/effect counts, requested versus observed backend, actual source state and all process outcomes; no timing instrumentation enters production.

## Task 1: Implement and qualify the whole candidate

### 1. Freeze control and make evidence failures observable

- [ ] Read the spec and current accepted host-policy amendment. Record Git HEAD/status, resolved Node/Bun/compiler versions, disk capacity and available owned native targets. Create a fresh temporary root with an ownership marker; record its absolute path as `CRUMBS_M105_WORK` for subsequent commands.
- [ ] Archive `090c4fd` into an isolated control directory, build with the same qualified dependency bytes/tooling as the candidate, and hash source plus artifacts. Read-only dependency links are permitted only when recorded; mutation fixtures need private copies. Preserve the original shipping dist inventory before any candidate build.
- [ ] Write evidence tests with these explicit assertions: control-versus-control has zero mismatches; changed output hash, omitted input, wrong source digest, missing raw run and forged success disposition each yield a nonempty error list. Run `bun test packages/css/test/compiled-text-evidence.test.ts` red, implement receipt comparison in `verify.ts`, then run green.
- [ ] Implement `verifyCompiledTextEvidence(packetRoot: string): readonly string[]` and CLI `bun packages/css/bench/compiled-text-reuse/verify.ts <packet-root>` (zero errors/exit 0 means valid evidence, not necessarily accepted product). Pin source/artifact/command/receipt hashes and require explicit `accepted`, `rejected` or `incomplete` disposition. Reject acceptance without every required gate; truthful rejection may contain unrun gates.

### 2. Build the full witness with differential resolution tests

- [ ] In `compiled-text-witness.test.ts`, make the retained regression concrete: compile an import resolving to `probe-input.js` with width 11, capture its witness, add `probe-input.ts` with width 22, assert `validateCompiledTextWitness(old) === false`, and assert fresh compilation now emits width 22. Run red before implementing witness capture.
- [ ] Pin resolver precedence against independently fresh installed esbuild for static import/export/require, relative/absolute file/directory imports, exact package exports and self-reference. Record its actual options and full metafile input/import structure. Reject unknown conditions/remapping/loaders/plugins, aliases, package-based extends, wildcard exports, computed/dynamic/glob imports and incomplete metadata for caching; fresh compilation must still behave as before.
- [ ] Implement the witness interfaces using byte hashes, source/config parsing, grouped directory inventories and logical/canonical route checks. Missing ancestors must record a chain from an observed existing directory. Count unique configuration/manifest/lock files separately within the 64 cap, even where they also appear in file facts. Validate absence chains, schema/count/byte bounds and digest shapes before filesystem reads. No recursive whole-tree scan or mtime shortcut.
- [ ] Add table tests for input byte edit/restore with preserved size/mtime; missing nearer package/config/lock creation; index replacement; exports and supported local JSONC extends changes; scoped package search; installed/dist inputs; symlink retarget/delete/restore; denied reads versus absence; cycles and every cap+1 overflow. For eligible cases assert invalidation and independently fresh output agreement; unsupported cases assert `kind === 'fresh'` and no new source error.
- [ ] Add fast-check edit/restore sequences over the supported graph grammar. Assert that a successful witness validation never permits a candidate output differing from its independently fresh counterpart for those histories; retain seeds and minimized counterexamples. Run `bun test packages/css/test/compiled-text-witness.test.ts packages/css/test/compiled-text-witness.property.test.ts packages/css/test/resolution-identity.test.ts` to zero failures.

### 3. Implement bounded admission and completion ownership

- [ ] Write memo tests for absent/probation/ready transitions: one valid fresh observation is not a hit; two agreeing fresh observations are a hit; a changed witness is a miss. Failure never promotes or refreshes LRU. Run `bun test packages/css/test/compiled-text-memo.test.ts` red, implement `createCompiledTextMemo`, then run green.
- [ ] Assert exact caps: after 17 owner insertions, `inspect().owners <= 16`; 1 MiB+1 per-entry and aggregate 8 MiB overflow never exceed retained bounds. Include non-ASCII text byte accounting, probationary entries, pending tickets, deterministic LRU and proof metadata. No unbounded auxiliary generation/tombstone map; generation identities must remain distinct across clear/evict/recreate so a stale ticket cannot match a new owner.
- [ ] Test deferred completion after edit/replacement/eviction/clear, overlapping requests to one entry, independent roots with identical relative paths and overflow requests. An obsolete completion cannot resurrect an entry or displace newer text. Overflow takes the fresh path without a global queue or shared evaluation promise.

### 4. Integrate fresh compilation and per-request execution

- [ ] Add internal observation hooks to `compileWithStableResolution`: `before(inputs: CompileInputs): void` before each fresh attempt and `after(result: {source: string; inputs: CompileInputs}): void` after it. Hooks collect proof only; unsupported admission does not add a fresh-path error. First discovery of an unknown graph is not a verified observation. Only later calls with a complete pre-witness can count toward the two fresh confirmations. Preserve existing bounded retries.
- [ ] Replace callback-dependent `capturedInputs` with explicit compile result inputs in `transformer.ts`; retain all existing fields needed for resolution, dependency analysis and manifest/source-map output. Add a private compile request identity builder covering all effective options and supported environment values; unknown options select fresh. Detect compiler-selection environment changes without pretending disk hashes prove a loaded native executable.
- [ ] Wire `begin` before compilation, fresh VM/capture/lowering/emission on hits and misses, complete post-validation before `finish`, and `abort` on any failure. Keep the existing changed-during-transform diagnostic; do not execute authoring again after effects. The Metro wrapper must revalidate after asynchronous upstream transformation before returning; an upstream failure must not promote its pending memo entry. Direct calls finish after their own final validation.
- [ ] Write `compiled-text-transformer.test.ts` assertions for eight ambient changes producing eight distinct fresh-control-matching outputs and exactly eight effect lines; source/dependency edits; runtime-extension input changes; error then repair; manifest sidecars; source maps; canonical token/recipe bindings; mutation during consumption; upstream failure. A valid hit after an owned compiler service becomes unavailable succeeds; a changed-input miss fails like fresh compilation; a restarted child process uses the new private installation and no memo.
- [ ] Run `bun test packages/css/test/compiled-text-transformer.test.ts packages/css/test/stable-resolution-compile.test.ts packages/css/test/transformer.test.ts packages/css/test/runtime-extension-linkage.test.ts packages/css/test/runtime-extension.property.test.ts` and `bun run typecheck`; require no failures. The fresh-resolution helper test still compiles fresh when called without the memo integration.

### 5. Establish the Metro session transport and stable store keys

- [ ] Write `compiled-text-metro.test.ts` around actual installed Metro cache-key/worker interfaces: private session reaches the worker; changing only session token leaves ordinary module store keys unchanged; rewrapping a config reuses its valid bound session instead of mixing wrappers; a newly constructed config gets a new token. Run red before integration.
- [ ] Implement session creation/binding in `metro-plugin.ts` and strip the private field before delegating to upstream Babel/Rust transforms, preserving all other fields. Keep the token out of emitted JavaScript and the global cache-key function. Local Metro 0.84.4/0.84.5/0.87.1 `getTransformCacheKey` calls the existing transformer `getCacheKey`; verify actual end-to-end key behavior rather than assuming this read proves all integrations.
- [ ] Keep native store lookup keys stable across sessions and replace values at the same keys; native receipt/result identity changes trigger reconstruction without adding a session namespace to every file. A missing transport or unavoidable ordinary-cache invalidation/unbounded per-session store growth rejects the candidate. Do not patch installed Metro or introduce a new public option.

### 6. Close every outer-cache and extension path

- [ ] Define private native metadata version 2 as the existing tag/dependencies/resolution fields plus `formatVersion: 2`, `session: NativeCacheSession`, `reuse: 'verified' | 'fresh-only'`, and `witnesses: readonly CompiledTextWitness[]`. Verified receipts contain at least the authoring witness plus any separately compiled linkage witness; apply aggregate schema/byte bounds. If linkage coverage cannot be proved, emit `fresh-only` instead of truncating dependencies. Keep generated public metadata unchanged.
- [ ] Implement bounded decoding with distinct ordinary/native-invalid/native-valid results. Missing, malformed, legacy, foreign-session and `fresh-only` native receipts miss/stale; ordinary results retain current behavior. Use the same validator for bound store reads, result-key binding and live-graph invalidation. Do not mistake an invalid tagged object for absence of Crumbs metadata.
- [ ] Test synchronous and asynchronous stores, store arrays/functions, absent configured stores, malicious receipt shape/counts, config/root mismatch, legacy native results, unbound exported helpers, extension-only edits and missing session. Assert native misses without throws and ordinary hits unchanged. Update old legacy-hit test expectations only where this approved cache-format transition requires it.
- [ ] Run `bun test packages/css/test/compiled-text-metro.test.ts packages/css/test/resolution-identity.test.ts packages/css/test/transformer.test.ts`; require zero failures before real Metro timing.

### 7. Build and check package isolation before expensive consumers

- [ ] Run `bun run build`, `bun run typecheck`, `bun run test`, then `bun test packages/css/test/runtime-isolation.test.ts packages/css/test/theme-runtime-boundaries.test.ts packages/css/test/packed-runtime-graph.test.ts packages/css/test/runtime-extension-package.test.ts`. Capture genuine Node 22.0.0 floor coverage using `CRUMBS_AUDIT_NODE_FLOOR`; do not run SDK 58 itself on an unsupported floor.
- [ ] Inspect packed ESM/CJS/declarations and independent runtime graph checks. Runtime closures must retain existing approved bindings and deny compiler/authoring dependencies; no new shared-helper allowlist or graph workaround. A product-isolation failure rejects the whole candidate before native checks.
- [ ] Pack once without rebuilding using `npm pack --ignore-scripts --json --pack-destination "$CRUMBS_M105_WORK/artifact"` from `packages/css`; record the returned artifact as `CRUMBS_M105_TARBALL`. Verify archive file hashes against this build. Every subsequent installed consumer must use these exact bytes.

### 8. Exercise real Metro, SDK consumers and software-native behavior

- [ ] Implement `bun packages/css/bench/compiled-text-reuse/metro.ts <control-root> <candidate-root> <output-root>` as a serial, owned-process journey. Use existing `context-reuse` and matched-scaffold helpers as references, not as acceptance evidence. Compare real fresh-control bundles with candidate bundles for entry/dependency edit/remove/restore, new higher-priority candidate, symlink/package/config changes, syntax repair, installed dependency and extension-only mutation, two roots, same-session hits, worker restart and full Metro restart with old disk data. Retain actual keys, counts, output/input hashes and store cardinality across repeated sessions; record warm/startup/memory costs separately. Stop only owned servers and descendants.
- [ ] Prepare the host fixture with `bun scripts/prepare-matched-metro-scaffold.ts <baseline-root> "$CRUMBS_M105_WORK/host-scaffold"`, using frozen baseline `43c5ece39360cf321fdb074d82cee41d5daaba23`. Verify Expo 56.0.4/Metro 0.84.4/RN 0.85.3 and the helper's complete version/fixture contract. This environment is separate from SDK compatibility consumers.
- [ ] Run `bun scripts/qualify-sdk56-tarball.ts "$CRUMBS_M105_TARBALL" "$CRUMBS_M105_WORK/sdk56/qualification.json"`. Run `bun run playground:sdk-candidate --sdk=57 --pinned --keep --tarball "$CRUMBS_M105_TARBALL" "$CRUMBS_M105_WORK/sdk57/qualification.json"` and the corresponding `--sdk=58` command/output. Use compatible current Node. Require strict peers, installed hashes, types/motion/module order, iOS/Android/web exports and runtime isolation with no forced install.
- [ ] Run `bun scripts/measure-sdk-workers.ts "$CRUMBS_M105_WORK/sdk57/qualification.json" "$CRUMBS_M105_WORK/sdk58/qualification.json" "$CRUMBS_M105_WORK/workers"`. Its matrix is SDK57 Babel and SDK58 Babel/Rust; SDK56 retains its supported default path. Retain observed Rust backend evidence, not merely the option flag. Extend the new private Metro journey to run the session/invalidation controls on these exact installed consumers.
- [ ] Run the existing `apps/storybook/e2e/native-storybook-ui.yaml` flow with explicitly owned iOS Simulator/Android emulator targets and the candidate SDK58 app under Babel and Rust. Use `maestro --device <owned-id> test apps/storybook/e2e/native-storybook-ui.yaml` with the actual app-ID environment prescribed by `apps/storybook/e2e/README.md`. Prove the running app consumes the exact candidate artifact; record native logs, screenshots, theme/recipe/action checks and CSS edit/restore. Preserve unrelated generated iOS files by building the app from an owned staged copy. No physical-device claim.
- [ ] Keep development receipts' real dirty/source states. The clean release SDK matrix verifier must still reject a dirty development snapshot; do not rewrite those fields or treat that expected release rejection as a compiler failure. Clean exact-commit SDK/host sealing remains the next release slice after a successful outcome commit.

### 9. Freeze final source, then run the complete unchanged timing gate

- [ ] If adopting, finish consumer guidance in `README.md`, `packages/css/README.md`, `docs/src/content/docs/how-to/configure-metro.mdx`, `docs/src/content/docs/explanation/how-the-metro-transform-works.mdx` and `.agents/skills/crumbs-css/references/expo-sdk.md`: fixed compiler installation, full Metro restart on upgrade, fresh authoring per transform, conservative fallback, session-limited native cache reuse. Do not claim qualification until results exist. Run `bun run docs:build` and `bun run budgets:validate`.
- [ ] Freeze all non-document source/test/harness/agent-guidance files and rebuild/repack if any artifact input changed; rerun affected consumer qualification for changed bytes. Capture source with `scripts/guarantees-matrix/source-identity.ts`, before/after dist hashes, policy/registry/baseline hashes and actual tool/host identities. Use the currently pinned release environment; mismatch is an incomplete gate, never a new baseline. Stop task-owned build/native servers before serial timing.
- [ ] Implement the `qualify.ts` CLI `bun packages/css/bench/compiled-text-reuse/qualify.ts <control-root> <candidate-root> <output-root>` to run matched independent processes and retain parity/resource/startup/edit/restart observations. Use official warm/cold workloads and selectors without hidden memo prepopulation. A diagnostic improvement is not admission. No repeated tuning after a failed complete candidate; a defective test harness can be corrected with its failed evidence retained.
- [ ] Set validated `CRUMBS_AUDIT_NODE_FLOOR`, `CRUMBS_INCREMENTAL_REPO_ROOT`, `CRUMBS_INCREMENTAL_APP_ROOT`, and an owned `CRUMBS_METRO_PORT`. Run `bun run measure:host-budgets "$CRUMBS_M105_WORK/final-host"`. This collects the current 21 measurements, including five official benchmark processes and matched Metro incremental results. No concurrent candidate/control timing or unrelated task-owned load.
- [ ] Set `CRUMBS_HOST_BUDGET_REPORT` to that output and run `bun scripts/check-release-host-budgets.ts`. Require `releasePolicyQualified=true`, 11 blocking passes, zero incomplete/invalid measurements, unchanged policy/registry/baselines, and visible advisory failures. Preserve every raw failed run; do not average away a failing selector. The original v1.2.0 report is never overwritten.

### 10. Review, archive and make the single outcome commit

- [ ] Apply the native execution workflow's whole-change review, focusing on spec coverage and the five Review Focus cases. Resolve code-review defects, then rerun affected tests and all timing/identity qualification invalidated by source changes. No unqualified tweak after the final report.
- [ ] Create `docs/assessments/2026-10-18-m10-5-worker-scoped-compiled-text.md`, the evidence packet README/inventory and `verify.py` wrapper for offline evidence replay. Reuse the existing host-policy verifier rather than duplicate threshold logic. Record all required results as passed/failed/unrun/incomplete, exact candidate diff/archive/artifact/report hashes and actual source state. Add synthetic evidence tests rejecting forged accepted status, omitted advisory measurements and stale consumer artifacts.
- [ ] **Accepted development candidate:** all preceding correctness/isolation/software-consumer gates and the complete local host policy pass. Update ADR/roadmap with measured behavior and remaining exact-commit/hosted-release qualification. **Rejected candidate:** archive its diff, sources/artifacts and first failing gate, then restore only task-owned product/consumer-guidance changes to the captured base; rebuild and verify original shipping source/artifact inventories. Remove candidate-only product modules. Retain qualification tooling only if independently useful, tested and not an accidental shipping entry. **Infrastructure incomplete:** record the actual blocker, retain owned work for resumption, and do not claim acceptance or force a rejection through fabricated results.
- [ ] Run the offline evidence verifier, `git diff --check` and staged-scope check. Commit exactly one coherent outcome: `perf(m10.5): qualify worker-scoped compiled-text reuse` for accepted development work, or `docs(m10.5): record compiled-text candidate rejection` for rejection. Do not commit an unfinished production candidate as accepted to make release source appear clean.
- [ ] Reconcile the committed content with the measured source digest; rerun the existing host verifier with `CRUMBS_RELEASE_SOURCE_REVISION` set to the genuinely recorded measurement revision where its protocol requires it. This is a content-preservation check, not new-SHA release qualification. Report the commit and next **M10.5** slice: exact-commit/artifact and hosted qualification if admitted, explicit release disposition if rejected, or the precise missing prerequisite if incomplete. Clean up only recorded owned processes/temp dependency links; preserve unrelated files.

## Plan review and handoff

Self-review checks: the spec's mutable proof, lifetime exception, fresh evaluation, bounds/concurrency, outer-cache binding, all output/SDK/native/host checks and rejection behavior map to steps above. The five additional Review Focus cases have explicit tests. This plan does not revive the rejected kernel/runtime-provenance work or alter accepted release policy.

The owner's native/inline choice is retained. Written plan review is the remaining handoff before implementation; approval of the prior spec is recorded separately and is not requested again.
