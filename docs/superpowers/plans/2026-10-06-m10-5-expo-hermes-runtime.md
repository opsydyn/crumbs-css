# M10.5 Packed Expo/Hermes Consumer Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect and validate one complete packed Expo/Hermes consumer matrix against matched plain React Native controls without changing Crumbs APIs or performance budgets.

**Architecture:** A dedicated CLI stages three fixed startup scenes from the playground dependency template, builds production release apps, and collects entry-to-first-layout receipts on explicitly owned software devices. Pure protocol and artifact accounting modules validate the six cells; native adapters own only recorded study resources. All tasks form one implementation slice, one final evidence decision and one commit, as requested; task boundaries are internal verification checkpoints, not partial roadmap delivery.

**Tech Stack:** TypeScript, existing Bun tests, Node loopback HTTP collector, pinned Expo/Metro/React Native/Hermes, Xcode Simulator tools and Android SDK/Gradle. No new dependency.

**Spec:** [Approved measurement design](../specs/2026-10-06-m10-5-expo-hermes-runtime-design.md). Written-spec approval was received on 2026-10-06; this plan still requires review before execution. Preserve the user's selected **Native** execution method.

## Global Constraints

- Preserve all public APIs, synchronous descriptor admission, package dependencies, export maps, existing thresholds and baselines.
- No Effect dependency, runtime restructuring, SDK upgrade, compiler cache or new styling feature belongs to this study.
- Build once with production `bun run build`; pack once with lifecycle scripts disabled. Never substitute `build:dev` or a workspace-linked package.
- Three variants (`plain`, `core`, `compatibility`) on two platforms (`ios`, `android`): five retained cold-process launches per cell, one separately excluded warm-up per cell, 30 retained samples total.
- Metric: `js-entry-to-first-root-layout-ms`; exclude native process startup, bundle prelude, frame presentation and post-layout receipt transport.
- Never operate Simulator `1F706822-9584-4340-B426-EECF36F9D8EA`. Reject physical devices and ambiguous selectors. All physical-device work remains deferred.
- No global shutdown/reset/termination, uncontrolled device selection or deletion of resources not created by this study.
- JavaScript uses mapping-based UTF-8 byte attribution; Hermes uses whole-bundle bytecode deltas. No per-source bytecode ownership claim.
- Valid study evidence does not close M10.5 or revise any target. Preserve current host failures and Expo-version mismatch.
- Use the attached authoritative worktree `crumbs-main-merge/crumbs-css`; preserve existing untracked files and the older project checkout's dirty work.

## Review Focus

- Stale/delayed receipt from a prior launch: it must not satisfy a fresh run, including after a timeout or retry (Task 1/3).
- Source-map UTF-16 columns crossing multibyte UTF-8 text or unmapped prefixes: attribution must conserve actual bundle bytes (Task 2).
- Export and executable built with different bundling options: unmatched artifacts must fail runtime admission (Task 2/3).
- Device replaced/shut down between runs, or a physical serial passed as Android target: abort collection without global recovery (Task 3).
- Cancellation after native resources exist: cleanup must retain evidence and preserve unrelated resources (Task 3/4).

## File ownership and shared records

Create `scripts/measure-expo-consumer-runtime.ts` (CLI/orchestration), `scripts/expo-consumer-protocol.ts` (records/validation/summary), `scripts/expo-consumer-fixture.ts` (staging/scene generation), `scripts/expo-consumer-artifacts.ts` (identity/provenance/maps/bytecode) and `scripts/expo-consumer-native.ts` (collector/device/build/launch/cleanup). Tests live in `scripts/measure-expo-consumer-runtime.test.ts` with task-specific describe blocks. Modify root `package.json` only to add `measure:expo-consumer-runtime`; no dependency edits. Evidence and assessment paths are specified in Task 4. Existing `scripts/playground.ts` and `scripts/runtime-bundle-contract.ts` stay unchanged.

Define these exported protocol types once; use the same names in all modules:

- `Variant = "plain" | "core" | "compatibility"`; `Platform = "ios" | "android"`.
- `Cell = { platform: Platform; variant: Variant }`.
- `Identity = { studyId: string; cohortId: string; fixtureHash: string; sourceHash: string; packageHash: string | null; buildId: string; platform: Platform; variant: Variant }`. SHA-256 digests are lower-case hex; plain alone uses null packageHash. `buildId` is an immutable pre-build input fingerprint, not the final binary hash.
- `RunPermit = { identity: Identity; runId: string; deviceId: string; warmup: boolean; round: number; launchUrl: string; deadlineEpochMs: number }`.
- `Receipt = { identity: Identity; runId: string; deviceId: string; entryMs: number; layoutMs: number; elapsedMs: number; width: number; height: number; dev: boolean; hermes: boolean }`.
- `Attempt = { origin: "native" | "test"; permit: RunPermit; outcome: { kind: "valid"; receipt: Receipt } | { kind: "failed"; code: string; detail: string } }`.
- `ArtifactRecord = { identity: Identity; dependencyLockHash: string; nativeBinaryPath: string; nativeBinaryHash: string; embeddedHermesPath: string; embeddedHermesHash: string; exportedHermesPath: string; exportedHermesHash: string; javascriptPath: string; sourceMapPath: string; inventoryPath: string }`.
- `OwnedDevice = { platform: Platform; id: string; ownershipRecordPath: string }`; preflight validates this record against the actual software device, not its name alone.
- `StudySummary = { complete: boolean; cells: Array<{ cell: Cell; retained: number; attempted: number; warmups: number; minMs: number | null; medianMs: number | null; maxMs: number | null }>; comparisons: Array<{ platform: Platform; variant: "core" | "compatibility"; deltaMs: number; ratio: number | null }>; failures: string[] }`. A zero control median yields null ratio with an explicit diagnostic.
- `ResourceLedger` is an append-only inventory of created paths, child process IDs, app installations, port mappings and disposable devices; every entry includes study ID, exact identity, creation evidence and cleaned status. Cleanup receives this ledger, not inferred resources from a prefix search.

---

### Task 1: Receipt protocol and equivalent packed fixtures

**Files:** `scripts/expo-consumer-protocol.ts`, `scripts/expo-consumer-fixture.ts`, `scripts/measure-expo-consumer-runtime.test.ts`.

**Interfaces:** `validateReceipt(input: unknown, permit: RunPermit, consumed: ReadonlySet<string>): { ok: true; receipt: Receipt } | { ok: false; code: string; detail: string }`; `summariseStudy(attempts: readonly Attempt[], artifacts: readonly ArtifactRecord[]): StudySummary`; `stageFixtures(options: { root: string; archive: string; tarball: string; exactDependencies: Record<string, string>; studyId: string; sourceHash: string }): Promise<Record<Variant, string>>`.

- [ ] **Step 1 — Add failing protocol/fixture tests.** In `describe("protocol")`, test finite monotonic timestamps, `elapsedMs === layoutMs - entryMs` within 0.001 ms, positive dimensions, exact identity/device/run match, false dev, true Hermes, duplicate/consumed ID, missing completion, and non-object/oversized input rejection. Assert `[9, 1, 5, 3, 7]` gives min 1/median 5/max 9; missing cell/sample yields incomplete; warm-ups/failures never become zero timings. In `describe("fixture")`, assert exactly ten cards, identical native-tree/resolved-style snapshots, static import absence before the entry marker, and only the requested styling entry. Both Crumbs variants have identical lock-resolved dependencies and tarball hash; plain has zero Crumbs dependency.
The assertions include these minimal protocol/fixture checks, expanded with the exact cases above:

```ts
expect(validateReceipt(null, permit, new Set()).ok).toBe(false)
expect(validateReceipt(receipt, permit, new Set([permit.runId])).ok).toBe(false)
expect(summariseStudy([], []).complete).toBe(false)
```

Here `permit` and `receipt` are typed valid records built from the shared definitions in this task; malformed variants change one field at a time.

- [ ] **Step 2 — Confirm the new tests fail for missing implementation.** Run `bun test scripts/measure-expo-consumer-runtime.test.ts --test-name-pattern 'protocol|fixture'`; retain the failing assertions, not an unrelated environment error.
- [ ] **Step 3 — Implement protocol records and pure functions.** Persist attempts append-only. Build deterministic round order `[plain, core, compatibility]`, rotated by round index modulo three separately per platform. Generate fresh random IDs for each attempt. Require exactly five retained runs per cell; no silent trimming of a changed cohort. Cross-check six artifact records before returning complete. Reject test-origin attempts in published study evidence; transport logs and launch/exit proof must accompany every native attempt.
- [ ] **Step 4 — Implement fixture generation.** Copy the playground allowlisted configuration into owned staging roots, replace `src` with the measurement scene, and use stock Expo Metro configuration in every app. Resolve shared dependency versions from the current installed template, then pin those exact versions in generated manifests; install with retained locks. Assert dependency graph equality after accounting for Crumbs-only dependencies. Generate module-scoped `StyleSheet` values in plain and token references/provider/`useThemedStyles` in core/compatibility.

Pin scene values: canvas `#101827`, card `#1d293d`, text `#f1f5f9`, accent `#7dd3fc`, root padding 16, card padding 12, card bottom margin 8, label font size 16, description font size 14, action height 32. Theme keys use `--crumbs-m105-canvas`, `--crumbs-m105-card`, `--crumbs-m105-text`, `--crumbs-m105-accent`; generate a static serialized theme with the current `NativeTheme` fields (`contract`, `tokens`, `values`), legacy `var(--crumbs-m105-...)` contract leaves and matching values. Verify it through `resolveThemeStyles` against the expected style snapshot; only type imports may accompany its generated declaration. No `createTheme` authoring executes at startup. Static values and native-tree order are identical across variants. The root contains title, description and the ten cards; each card contains label and a view representing the action. One positive-size root layout ends measurement.

- [ ] **Step 5 — Generate entry and delivery code.** Set `performance.now()` before synchronous `require` of Expo/React Native/scene. Capture layout once and freeze timing fields immediately. After capture, obtain the cold-launch URL via `Linking.getInitialURL()`; validate scheme, study/build/variant and unique run ID, then fetch the collector. App IDs/schemes are unique under `dev.crumbs.m105`; each owned launch URL carries its permit and collector authentication. Never fetch the run permit or await Linking before the marker/layout. Missing or mismatched URL produces a failed attempt. Binary hash is joined by buildId in the external manifest, avoiding an impossible self-hash embedded in the binary itself.
- [ ] **Step 6 — Verify fixture equivalence and protocol.** Re-run the Task 1 command; all tests pass. Typecheck generated apps with their staged `tsc --noEmit`. Validate resolved Crumbs entries are inside each stage's installed package and verify a single React realpath. Persist exact fixture/locks/snapshot/hash receipts in the study archive. No native operation yet.

### Task 2: Source provenance and conservative artifact accounting

**Files:** `scripts/expo-consumer-artifacts.ts`, `scripts/measure-expo-consumer-runtime.test.ts`.

**Interfaces:** `attributeJavaScript(bundle: string, map: unknown, variant: Variant): { totalBytes: number; groups: Record<string, number>; unmappedBytes: number; sources: string[] }`; `validateArtifacts(record: ArtifactRecord): Promise<{ ok: boolean; failures: string[] }>`; `exportArtifacts(stage: string, identity: Identity, archive: string): Promise<{ javascriptPath: string; sourceMapPath: string; exportedHermesPath: string; inventoryPath: string }>`.

- [ ] **Step 1 — Add failing artifact tests.** In `describe("artifacts")`, test CRLF, emoji/surrogate pairs, non-ASCII text, unmapped prefix/lines, sourceRoot, indexed maps, invalid offsets, duplicate/out-of-order mappings and conservation: sum groups plus unmapped bytes equals `Buffer.byteLength(bundle, "utf8")`. Assert compiler/Effect/workspace-source rejection; plain cannot contain Crumbs; core/compatibility must contain the selected packed entry. Test wrong bytecode magic/version, missing bundle/map, export/embedded bytecode mismatch, hash drift and a wrong binary/buildId mapping.
Representative assertions (a fixture map containing only an unmapped non-ASCII line, plus an intentionally missing artifact):

```ts
const bytes = attributeJavaScript("🙂\n", { version: 3, sources: [], names: [], mappings: "" }, "plain")
expect(bytes.totalBytes).toBe(5)
expect(bytes.unmappedBytes).toBe(5)
expect((await validateArtifacts(missingRecord)).ok).toBe(false)
```

- [ ] **Step 2 — Confirm failures.** Run `bun test scripts/measure-expo-consumer-runtime.test.ts --test-name-pattern artifacts`; failures must identify absent artifact implementation.
- [ ] **Step 3 — Implement attribution/provenance.** Resolve the existing source-map decoder through the staged Metro dependency tree using `createRequire`; record its resolved version and fail clearly if unavailable. Interpret generated columns as UTF-16 positions. Allocate each generated span to its active mapping until the next segment/end of line; put gaps, explicit unmapped segments and line separators in unmapped bytes. Reject mappings splitting a surrogate pair or exceeding the line. Support indexed-map offsets, retain mapping coverage and hash the source map. Reuse existing runtime source rejection helper, supplemented with strict staged-path/selected-entry/React checks; do not alter its existing contract. Apply provenance to the Metro JavaScript map, not original TypeScript names inside an upstream library map.
- [ ] **Step 4 — Export production JS/Hermes pairs.** From each stage run its installed `expo export --platform ios|android --source-maps --no-bytecode --clear --output-dir <owned-js-directory>`, then the same production command without `--no-bytecode` into the Hermes directory. No `--dev` or `--no-minify`. Set `EXPO_NO_METRO_WORKSPACE_ROOT=1`; fix worker settings consistently and retain commands/environment identities. Inspect actual files and Hermes headers/version; enumerate and hash every generated bundle/map. Report JS mapped groups and whole-Hermes byte counts/deltas only.
- [ ] **Step 5 — Implement binary matching contract.** Hash the release app/APK and extract its embedded Hermes bundle. Match it byte-for-byte to the export cohort; align entry, environment and bundling settings if needed, then rebuild/export as one new cohort rather than waiving equality. Validate recorded native configuration and buildId. Record native packaging transformations explicitly. Missing artifacts or unmatchable bytecode means incomplete runtime evidence; source-map compatibility alone never substitutes for the match.
- [ ] **Step 6 — Verify accounting.** Re-run artifact tests; all pass. Execute export/provenance checks on all six staged cells, retain inventory and verify attribution totals. No timing results are created by this export task.

### Task 3: Owned release builds, collector and cold-process launches

**Files:** `scripts/expo-consumer-native.ts`, `scripts/measure-expo-consumer-runtime.test.ts`.

**Interfaces:** `preflightDevices(iosUuid: string, androidSerial: string, ledger: ResourceLedger): Promise<OwnedDevice[]>`; `buildRelease(stage: string, identity: Identity, device: OwnedDevice, archive: string, ledger: ResourceLedger): Promise<ArtifactRecord>`; `collectAttempt(permit: RunPermit, artifact: ArtifactRecord, device: OwnedDevice, ledger: ResourceLedger): Promise<Attempt>`; `cleanupOwned(ledger: ResourceLedger): Promise<{ failures: string[] }>`.

- [ ] **Step 1 — Add failing native-adapter tests with injected process/HTTP adapters.** In `describe("native")`, assert the protected UUID, physical Android serial, generic `booted` selector and no ownership receipt are rejected before any mutation. Assert every simctl command names the exact UUID and every adb command uses `-s <serial>`. Test late/duplicate HTTP receipts, wrong token/device/cohort, body over 64 KiB, 120-second launch timeout, unexpected shutdown/app replacement, exited child/collector, port collision and cancellation after install/reverse mapping. Cleanup twice must preserve unrelated apps/devices/processes and retain all evidence.
Representative protected-target assertion; the injected process adapter must record zero commands before rejection:

```ts
await expect(preflightDevices("1F706822-9584-4340-B426-EECF36F9D8EA", "emulator-5554", ledger)).rejects.toThrow()
expect(processAdapter.commands).toEqual([])
```

- [ ] **Step 2 — Confirm failures.** Run `bun test scripts/measure-expo-consumer-runtime.test.ts --test-name-pattern native`; expect missing adapter functions/behaviour, not a real native operation.
- [ ] **Step 3 — Implement preflight and scoped ownership.** Inventory Xcode/SDK/Java/Gradle/OS/runtime versions read-only. Require dedicated software devices and recorded ownership. If provisioning is needed, create a disposable Simulator/AVD using the platform tools before invoking this function, record its exact UUID/serial and creation receipt in the study ledger, then pass those explicit selectors. Preflight itself never creates or substitutes a device. Reject the protected UUID at the central command constructor, even if a forged ledger says owned. Check Android emulator identity using selected serial and AVD metadata. Verify device/app identity before every attempt. Missing release prerequisite stops the relevant phase with its exact command/output; do not switch SDK or use a debug fallback.
- [ ] **Step 4 — Build release binaries in the isolated stages.** Run installed `expo prebuild --no-install` then required CocoaPods/Gradle setup locally. Obtain actual iOS scheme from `xcodebuild -list -json`; build it with `-configuration Release -sdk iphonesimulator -destination id=<owned UUID>` and owned DerivedData. Build Android using generated `gradlew :app:assembleRelease` with pinned toolchain and retain the signing/configuration receipt. No Expo Go/dev-client dependency. Set local collector HTTP permission only in these generated apps (iOS local-network ATS exception; Android local fixture cleartext permission). No production native file changes. Record Hermes/release settings and use Task 2's binary matching before installing on the explicit device.
- [ ] **Step 5 — Implement collector and launch adapter.** Bind the Node collector to `127.0.0.1` on an available owned port, create unpredictable per-study authentication and single-use permit allowlist. Redact authentication in public command logs. On Android add only the selected emulator's owned `adb reverse` port mapping. Terminate the selected app and prove its prior process exited before each launch; launch with its deep-link URL using explicit Simulator `openurl` or selected Android VIEW intent, including the unique runId. Collect exactly one frozen receipt within 120 seconds; validate the permit via Task 1. Log the launch/PID/exit proof and all failed attempts. If transport loses the receipt, classify delivery failure rather than inferring a timing. A shutdown/identity change aborts further collection; never recover with a global reset.
- [ ] **Step 6 — Verify the adapters and release preflight.** Re-run native tests; all pass. Run one excluded warm-up per cell through the real adapters and validate engine/dev flag, identities, positive layout and transport. Retain these receipts as excluded. Any mismatch blocks retained sampling. Test interruption cleanup against owned disposable resources; do not touch the protected Simulator to test rejection.

### Task 4: Consolidated study CLI, evidence and one final decision

**Files:** `scripts/measure-expo-consumer-runtime.ts`, `scripts/measure-expo-consumer-runtime.test.ts`, root `package.json`, `docs/assessments/2026-10-06-m10-5-expo-hermes-runtime.md`, `docs/roadmap.md`, `docs/evidence/2026-10-06-m10-5-expo-hermes/`. Use a later actual execution date consistently if execution occurs after 2026-10-06; never overwrite a prior cohort.

**Interfaces:** `parseStudyArgs(args: readonly string[]): { phase: "prepare" | "collect" | "report"; archive: string; iosUuid?: string; androidSerial?: string }`; `runStudy(options: ReturnType<typeof parseStudyArgs>): Promise<StudySummary | null>`. Prepare creates the immutable study/ledger manifest; collect requires that manifest plus both explicit device selectors; report validates existing evidence without launching anything.

- [ ] **Step 1 — Add failing orchestration tests.** In `describe("study")`, reject unknown flags, unsafe archives or prepare targeting an existing populated archive, missing collect selectors, incomplete manifests, digest drift between phases, attempts to report synthetic samples as native, and signal interruption. Assert exactly six cells/30 retained samples, deterministic five-round schedule, failures/retries visible and artifact archive availability required for complete. Reports must state software context and cannot mark budgets passing. Assert prepare/report cannot invoke device mutation.
Representative CLI assertions:

```ts
expect(() => parseStudyArgs(["collect", "--archive", "/tmp/crumbs-study"])).toThrow()
expect(() => parseStudyArgs(["report", "--unknown"])).toThrow()
```

- [ ] **Step 2 — Confirm failures.** Run `bun test scripts/measure-expo-consumer-runtime.test.ts --test-name-pattern study`; observe intended missing CLI/orchestration failures.
- [ ] **Step 3 — Implement CLI orchestration and command entry.** Add `measure:expo-consumer-runtime` pointing to the CLI. Prepare records checkout status/digests, production build, `npm pack --ignore-scripts --json` tarball/hash, pinned staged installs and Task 2 exports. Collect performs Task 3 release builds/matching/warm-ups, then five rotated rounds per platform. A failed attempt is retained; at most two explicit replacements per cell, with fresh IDs and a labelled schedule. Abort on identity/device drift. Report uses only validated receipts/artifacts. Hook cancellation to owned cleanup and flush attempt/ledger records before exiting. Use exit code 0 only for successful prepare or complete collection/report; incomplete collection/report exits 1 and lists concrete missing requirements.
- [ ] **Step 4 — Run complete focused verification.** Run `bun test scripts/measure-expo-consumer-runtime.test.ts`, `bun scripts/performance-budgets.ts validate` and `git diff --check`. Expect all focused tests pass and no registry changes. If shared package/tooling files unexpectedly change, either remove that change or run their existing package/runtime isolation checks before proceeding. Do not count documents or mock adapters as executed native proof.
- [ ] **Step 5 — Execute the full matrix.** Run `bun run measure:expo-consumer-runtime prepare --archive <empty-dated-archive>`, then `bun run measure:expo-consumer-runtime collect --archive <same-archive> --ios-uuid <owned-UUID> --android-serial <owned-emulator-serial>`, then `bun run measure:expo-consumer-runtime report --archive <same-archive>`. These placeholders are execution arguments discovered and recorded during preflight, not defaults or ambiguous device selectors. Retain complete stdout/stderr/commands and lock/source/toolchain/device identities. Archive exact fixtures, tarball, JS/maps/Hermes and release binaries in an identified persistent local artifact directory; store location, inventory, hashes and reproduction instructions in the Git evidence directory. Retain every attempted run and excluded warm-up. Verify 30 valid samples, six cells, six binary/export matches, six JS/Hermes export pairs and cleanup results before any completion claim. If a prerequisite blocks native execution, retain the failure and declare the study incomplete; do not commit a partial study as the completed M10.5 slice.
- [ ] **Step 6 — Write the single assessment and roadmap entry.** Include per-cell min/median/max and raw attempt counts; same-platform deltas/ratios; JavaScript mapping coverage/groups/unmapped bytes; total Hermes deltas; source/package/app/device identities; artifact access; cleanup outcome; failed attempts and limitations. Reconcile against existing host evidence without replacing it. Keep M10.5 open, physical work deferred and all budget values unchanged. Recommend **M10.5 — consumer-evidence review and explicit performance-target policy decision** only when the matrix is complete; otherwise name the actual missing prerequisite as next work.
- [ ] **Step 7 — Review and commit the consolidated implementation slice.** Use a fresh final reviewer under the selected Native workflow to inspect receipt/identity correctness, native selector safety, attribution conservation and evidence boundaries. Address findings; rerun only affected checks. Inspect staged names and `git diff --cached --check`, then commit code/tests/assessment/roadmap/evidence receipts together as `feat(css): qualify packed Expo Hermes consumer study`. Verify `git show --check HEAD` and preserve unrelated untracked files. Recommend the next numbered slice after the commit. No threshold/ADR acceptance change is bundled into this commit.

## Plan self-review and handoff

Coverage: Task 1 owns workload equivalence/timing/records; Task 2 owns provenance/JS/Hermes accounting and matching; Task 3 owns release/native/collector/cleanup; Task 4 owns source pinning, complete sampling, evidence retention and final decision. Each Review Focus case has an explicit failing test above. Interfaces share the protocol records; no budget/API/dependency modification is required. Tests use existing tooling; native evidence is executed separately from adapter tests.

Next numbered slice: **M10.5 — execute the consolidated packed Expo/Hermes consumer study**, after this plan is reviewed. Native execution remains selected. This plan is not runtime qualification and does not resolve the existing host-budget failures.
