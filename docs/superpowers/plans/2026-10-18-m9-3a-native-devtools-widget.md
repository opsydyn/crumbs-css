# M9.3a Native Devtools Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline. Steps use checkbox (`- [ ]`) syntax for tracking. Native/inline is the user's retained choice; do not delegate implementation.

**Goal:** Ship an opt-in native style-explanation widget and qualify its usefulness in Playground and Storybook as one implementation slice.

**Architecture:** A provider owns a bounded external registry; development-only probes publish committed getters for explicit Crumbs inputs. A native launcher/sheet selects a registered target and runs the existing explanation engine only on selection or Refresh. Consumer development import boundaries remove the widget and probes from production.

**Tech Stack:** Existing TypeScript, React, React Native, Bun tests, fast-check, tsdown and Expo SDK 58; host clipboard adapters use Expo Clipboard. Effect 4 remains inside existing explanation validation.

**Spec:** [Approved M9.3a design](../specs/2026-10-18-m9-3a-native-devtools-widget-design.md), approved in chat on 2026-10-18.

**Status:** Approved and executed inline on 2026-10-18. Implementation and qualification are complete, including Android Storybook/refresh/back and native source cost comparison. See the [closure evidence](../../evidence/2026-10-18-m9-3a-qualification-closure/README.md) for exact acceptance, source/packed boundaries and explicitly deferred physical, spoken-reader, independent-usability and release frame/heap evidence. This is not a publication approval.

## Global constraints

- One complete M9.3a implementation slice, including documentation and dogfooding; one outcome commit after verification. Internal steps are not separate roadmap slices.
- New entry: `@opsydyn/crumbs-css/devtools/native`. Existing public entries and styling semantics remain unchanged. No release/version bump or publication.
- Provider limit: 200 admitted targets and one report. Copy limit: 256 KiB (262144 bytes) of UTF-8 JSON after redaction. Launcher minimum: 44 by 44 logical units.
- No getters, explanation or schema traversal during closed-panel rendering/updates. Committed getter/reference bookkeeping and isolated debug-probe subscriptions are allowed and measured.
- Only selection and explicit Refresh generate reports. Input changes mark captures stale; stale captures cannot be copied. Closing clears selection/report.
- No global registry, polling, history, auto picking, desktop transport, editing, audits or transient pressed-state sampling.
- Production exclusion must be proved through packed exports/source maps, not inferred from a no-op component. No compiler, Vanilla Extract authoring, esbuild or Node-only import in the widget graph.
- Keep Node >=22.0.0 library support, current peers and M10.5 budget policy unchanged. Use each SDK's existing supported host environment for app qualification.
- SDK58 Babel/Rust packed development and production exports cover web/iOS/Android. Live journeys cover both apps on iOS Simulator and Android emulator; separately smoke web. Physical devices and spoken screen-reader acceptance remain deferred.
- Two engineering days is the approved-spec stop-and-assess appetite, not permission to waive failures. Record actual active effort, results and incomplete gates; do not silently expand it.

## Review focus

1. Concurrent/abandoned renders, effect replay and late cleanup must not replace a current getter or remove a newer registration (steps 2–5).
2. Nested scopes, duplicate labels and remounts must retain the correct target/theme identity (steps 4, 9–10).
3. Input change or unmount during clipboard work must invalidate the UI capture without falsely reporting a new successful copy (steps 6–8).
4. Redactors can throw, cycle, return accessors/non-JSON data or exceed UTF-8 limits; no unsafe traversal or clipboard mutation (steps 6–8).
5. Conditional JSX can leave debug imports in production, and Fast Refresh can retain old modules; verify bundle graphs and live refresh explicitly (steps 11–13).

## Files and responsibilities

Create under `packages/css/src/devtools/native/`:

- `model.ts`: public props, target identity, immutable registry view, capture envelope and typed result/error codes.
- `registry.ts`: admission/lease lifecycle, revisions, selection/capture invalidation, subscriptions and disposal; React-free.
- `capture.ts`: on-demand `explainStyle` adapter and safe report serialization/redaction.
- `provider.tsx`: context, stable provider store and commit-only registration hook.
- `widget.tsx`: launcher, modal/sheet, target/property/branch views, preview/copy, accessibility focus and dismissal.
- `index.ts`: the three public value exports and their public types; no other entry re-exports it.

Modify `packages/css/package.json` and `packages/css/tsdown.config.ts` for an independent `devtools-native` JS graph and the shared declaration graph/CJS declaration stub. Extend `packages/css/test/runtime-isolation.test.ts`, `pack-consumer-contract.test.ts` and `style-explanation-export.test.ts` for the new entry.

Create tests `packages/css/test/devtools-native-{registry,capture,react,package}.test.ts`, `devtools-native-registry.property.test.ts`, `devtools-native-types.ts`, and isolated React/RN test harnesses under `packages/css/test/support/devtools-native-*.ts`. Follow the existing isolated child-process native-peer test pattern; do not globally mock React Native across the test suite. Add `packages/css/fixtures/m9-3a-devtools.css.ts` for real compiled evidence.

Create `apps/playground/src/devtools/{adapter.ts,probes.tsx,DevtoolsPanel.tsx,DevtoolsPanel.css.ts}` and integrate the development boundary/journey in `apps/playground/src/App.tsx`. Create `apps/storybook/src/components/devtools/{adapter.ts,probes.tsx,DevtoolsFixture.tsx,DevtoolsFixture.css.ts,DevtoolsFixture.stories.tsx}`; integrate the provider/widget in `.rnstorybook/preview.tsx` and probes in `ShowcaseCard.tsx`. Add `apps/storybook/test/DevtoolsFixture.test.ts` for expected fixture values. Add clipboard dependencies only to the two apps and update `bun.lock`.

Create `scripts/m9-3a-devtools-qualification.ts`, `packages/css/test/devtools-native-qualification.test.ts`, `apps/playground/e2e/native-devtools.yaml`, and `apps/storybook/e2e/native-devtools.yaml`. Store final receipts under `docs/evidence/2026-10-18-m9-3a-native-devtools/`.

Update the existing explanation guide, README and package README API inventories, docs API reference/sidebar, app/e2e readmes and `docs/roadmap.md`. Do not advertise the new API as present in published 1.2.0. Agent guidance only changes if an existing recommendation would become incorrect.

## Task 1: Implement and dogfood the complete M9.3a slice

### Interfaces fixed for implementation

Public native exports:

```ts
type CrumbsInspectorTargetId = string & { readonly __crumbsInspectorTarget: unique symbol }
type CrumbsInspectorInput = Omit<ExplainStyleInput, "previous">
type CrumbsInspectorTargetOptions = {
  readonly label: string
  readonly exportPath: StyleExplanationPath
  readonly getInput: () => CrumbsInspectorInput
}
type CrumbsDevtoolsCapture = {
  readonly type: "crumbs.devtools.capture"
  readonly version: 1
  readonly target: { readonly instanceId: CrumbsInspectorTargetId; readonly label: string }
  readonly revision: number
  readonly report: StyleExplanationReport
}
type CrumbsDevtoolsWidgetProps = {
  readonly placement?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  readonly insets?: { readonly top?: number; readonly right?: number; readonly bottom?: number; readonly left?: number }
  readonly copyText: (text: string) => Promise<void>
  readonly redactReport?: (capture: CrumbsDevtoolsCapture) => unknown
}
function CrumbsDevtoolsProvider(props: { readonly children: ReactNode }): ReactElement
function useCrumbsInspectorTarget(options: CrumbsInspectorTargetOptions): CrumbsInspectorTargetId
function CrumbsDevtoolsWidget(props: CrumbsDevtoolsWidgetProps): ReactElement | null
```

`exportPath` is separate listing metadata so getters need not run while closed. Capture verifies it equals `getInput().exportPath`; mismatch produces `target-mismatch`. The hook requires a provider; a missing provider produces a descriptive developer configuration error. No host view is added by the hook/provider. Default placement is bottom-right; omitted insets are 16, negative/nonfinite insets are rejected with a configuration message.

Internal registry contract: `createInspectorRegistry()` returns stable `getSnapshot()`, `subscribe(listener): () => void`, `register(id, options): TargetLease | null`, `open()`, `close()`, `capture(id, explain): CaptureResult`, `dispose()`. `TargetLease` has `update(options): void` and idempotent `release(): void`; a lease token prevents stale cleanup from changing another registration. `explain` has signature `(input: CrumbsInspectorInput) => StyleExplanationReport`. The immutable view contains admitted target summaries/revisions, selected ID, open state, capture/stale flag and bounded diagnostic state; it never exposes getters/modules to UI or export.

`CaptureResult` is `{ ok: true; capture: CrumbsDevtoolsCapture } | { ok: false; code: "target-missing" | "target-mismatch" | "capture-failed" | "capture-invalidated" }`. A captured revision is checked again after calling the getter/explainer. Closing, disposal or unmount invalidates pending requests. A null registration exposes a bounded capacity indicator; rejected getters are not retained. Retry admission on the probe's next commit, not via a timer.

`prepareInspectorCopy(capture, redact?): { ok: true; text: string; byteLength: number } | { ok: false; code: "redaction-failed" | "non-json" | "too-large" }` validates plain JSON data without invoking getters or `toJSON`, rejects cycles/functions/symbols/bigints/nonfinite values, and measures actual UTF-8 bytes. Preview and clipboard share the exact prepared string. Changing target/revision/redactor invalidates that preview. One preparation per preview request; copy never regenerates or reruns redaction.

- [x] **1. Establish an owned execution environment.** Read the approved spec and applicable instructions, inspect worktree/branch/disk/tool versions, and record the start/effort ledger. Reuse this task's suitable worktree or create an attached one per the worktree skill. Its existing dependency directories are symlinks to another task: do not install into or delete their targets. Before dependency mutation, use an owned checkout/install with the repository lockfile. Preserve unrelated work and existing simulators; reserve an owned simulator/AVD and ports. Stop destructive cleanup for separate authorization.

- [x] **2. Write failing registry and model tests.** Assert: zero getter/explainer calls for register/update/open/close; selection and Refresh each call once; updating a selected target increments revision and marks capture stale; release clears selection/report; old leases cannot update/release replacements; identical labels remain separate; independent stores do not share targets; close/dispose removes report references; admission 201 returns null without eviction and later retry after release succeeds. Add fixed-seed fast-check event sequences against an independent map/selection model, asserting count <=200 and at most one report after every event. Run `bun test packages/css/test/devtools-native-registry.test.ts packages/css/test/devtools-native-registry.property.test.ts` and record the expected missing-implementation failures.

- [x] **3. Implement model and pure registry, then rerun step 2.** Explanations are dependency-injected into `capture`, not imported into the registry. Notify only inspector subscribers; keep snapshot object identity stable between mutations. Store revisions with target leases and reject stale capture results. Use a bounded single capacity diagnostic, not a retained rejected-target list. Expect all registry tests to pass.

- [x] **4. Write failing React lifecycle and compiled-input tests.** Exercise effects with a real React commit-capable harness, rather than SSR (which does not run effects). In a child-process test using the existing app React/ReactDOM runtime and an isolated minimal host, assert abandoned render does not publish, commit replaces the getter, effect replay leaves one registration, unmount leaves none, and widget/store updates do not rerender target parents. Compile the new fixture through the existing transform helper and assert a nested theme capture resolves the nested token, invalid exports are recoverable, original module metadata is retained, missing metadata is visibly unavailable, and export-path mismatch fails before explanation. Run `bun test packages/css/test/devtools-native-react.test.ts` to confirm failures. If the existing host cannot exercise real commits, add a matching-version test-only renderer in an isolated harness; do not substitute SSR or claim lifecycle proof from pure-store tests.

- [x] **5. Implement provider/hook and capture adapter; rerun step 4.** Create the store once per provider; use a separate stable context so target probes do not subscribe to widget changes. Publish/update leases in layout effects, release on cleanup, and retain stable hook IDs for each mount. Dispose on final provider cleanup while supporting React effect replay. `capture.ts` is the only native module that calls existing `explainStyle`; catch failures as recoverable capture results. Add public type checks for valid props and rejected missing getters/copy adapters/path segment types.

- [x] **6. Write failing copy and UI tests.** Pin UTF-8 boundaries at 262144/262145 bytes, multibyte text, throwing redactor, cycles, accessors, custom `toJSON`, nonfinite values and clipboard rejection. Assert previews match copied bytes exactly, stale report cannot start a copy, and update/unmount while `copyText` is pending cannot label a newer capture copied. An already-started OS clipboard write cannot be revoked; UI reports only the captured revision. Test minimum launcher size, placement/insets, list selection, slot/property/winner display, partial/unavailable reasons, Refresh, close, Android back, web Escape and focus restoration. Run `bun test packages/css/test/devtools-native-capture.test.ts packages/css/test/devtools-native-react.test.ts` and verify the added cases fail.

- [x] **7. Implement serializer and widget, then rerun step 6.** Use static React Native styles, a bounded target list, scrollable property/branch sections and a modal with explicit close. Native accessibility focus and web keyboard focus are restored using host-appropriate APIs. Use labels “Supplied Crumbs inputs”, “Stale — refresh to inspect current inputs”, and “Transient pressed/animation state is not captured”. Show revision, target/path and coverage; do not imply final host-view styles. Provide a separate preview action and explicit copy confirmation. Clear report/preview on close or release; render/copy never calls the explanation engine.

- [x] **8. Add and verify the isolated public package entry.** Add `./devtools/native` pointing to `dist/devtools-native.{mjs,cjs,d.mts}` and the canonical CJS declaration stub. Add its independent JS build and declaration entry. Extend ESM/CJS graph tests to reject compiler/authoring/Node imports and confirm ordinary entries cannot reach it. In isolated RN peer probes assert all three named exports load; packed types import the public entry. Run `bun run build`, `bun run typecheck`, and `bun test packages/css/test/devtools-native-package.test.ts packages/css/test/runtime-isolation.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/style-explanation-export.test.ts`. Do not weaken existing provenance assertions to accommodate chunk names.

- [x] **9. Add the app development boundaries and deterministic fixtures.** `adapter.ts` uses a Metro-foldable `__DEV__` conditional require of the local probe/widget module, with passthrough/null production components; production code does not import the native entry directly. Probes read `useTheme` from the same scope as `useThemedStyles`, receive explicit selections/conditions/extensions and register the full module namespace. Mount provider/widget once per app root/Storybook decorator. Wire ShowcaseCard root and idle/disabled action slots without changing `onActionPress` or the Pressable callback. Exclude transient pressed-state claims. Use nested light/dark cards, two deliberate opacity declarations (0.4 then 0.8), and default/selected variants with distinct values. Register distinct targets for duplicate instances. Add debug-only missing-metadata and unmount controls.

- [x] **10. Wire copy and prove fixture expectations.** Expo58's installed `bundledNativeModules.json` recommends `expo-clipboard ~58.0.3`; install SDK-compatible Clipboard in the two owned app installs and lock the resolved versions. Supply `setStringAsync` through `copyText`; do not add Expo dependencies to the library. Add safe-area-aware host insets (reuse Storybook's existing safe-area dependency; use a compatible app-only dependency in Playground if required). Assert fixture values independently of `explainStyle`, compare those expected values against real compiled reports, and verify action once/disabled never behavior in live UI. Run `bun run --filter @crumbs/playground typecheck`, `bun run app:typecheck`, and `bun run --filter @crumbs/storybook test`. Rebuild native development clients if added native facilities are absent; record actual client/package identities.

- [x] **11. Implement fail-closed qualification receipts and packed matrix.** Add a test-first script with CLI `bun scripts/m9-3a-devtools-qualification.ts --out=<owned-directory> --worker=babel|rust`. It builds/packs source once per candidate, stages an SDK58 consumer using existing playground helpers, and exports development/production bundles with source maps for all three platforms. Reuse existing runtime provenance traversal; do not treat filename absence as sufficient exclusion. Development must include working metadata/widget; production must exclude their mapped implementation and provenance with default settings, and ordinary theme/token imports must not reach debug code. Validate source SHA, tar SHA256, SDK/worker identity, per-command exit and output digests. Missing output or absent platform fixture fails. Run `bun test packages/css/test/devtools-native-qualification.test.ts`, then execute the script for both worker modes. Never write raw machine-specific paths or credentials into public receipts.

- [x] **12. Dogfood live native and web flows.** Start each app on reserved ports and open its owned iOS Simulator/Android emulator using existing app/e2e recipes; add parameterized `APP_ID`/`APP_URL` to the new Maestro flows rather than assume Expo Go. For both apps and both native platforms: open widget, choose each of the three diagnosis cases, identify/assert cause, update theme/variant, observe stale state, Refresh, preview/copy, close, invoke the underlying action and unmount/remount. Read copied text back using the app's clipboard facility in a debug-only probe and compare the prepared payload digest. Test Fast Refresh by a reversible edit to the owned fixture and restore; old module data must not remain current. Record screenshots/automation receipts and default worker identity. Smoke web selection/refresh/copy plus Escape/focus separately. Automated flows are functional evidence, not independent human usability evidence.

- [x] **13. Record cost and diagnostic usefulness within the appetite.** In the same app/host/fixture compare tooling disabled, mounted/closed and selected/Refresh. Count getter/explanation calls, target/report counts, target-parent renders and explanation durations using test-only instrumentation. Closed updates must generate zero explanations, and disposed/unmounted targets must release registry-held references. Do not infer whole-process leak freedom from these counts. For the three causes, compare raw-report versus widget diagnosis with expected answers, operator/order, steps/time and correctness recorded; report an independent-operator gap if only agent dogfooding is available. No speedup claim without recorded comparison. At two engineering days stop and report unresolved gates; do not silently extend the experiment.

- [x] **14. Update consumer docs and review the complete slice.** Document exact production-safe setup, explicit registration, scoped inputs, metadata opt-out, copy/redaction, coverage and transient-state limitations. Add the explanation guide to the sidebar and update both README/API inventories as “next release / source build” until publication. Record source/tar/tool identities, matrix/live/functional/cost/usability outcomes separately in `docs/evidence/2026-10-18-m9-3a-native-devtools/README.md` and `qualification.json`. Update M9.3a status honestly. Use the required whole-slice review from the execution workflow; resolve concrete findings within this slice.

- [x] **15. Verify and commit the outcome once.** Run `bun run check`, `bun run app:check`, `bun run --filter @crumbs/playground typecheck`, `bun run docs:build`, and `git diff --check`, plus the named packed/live checks above. Inspect each result; do not replace missing native proof with unit/export results. If all required gates pass, mark implementation/native dogfooding complete while retaining explicit physical/usability gaps. If a gate fails or appetite expires, commit the bounded outcome with precise incomplete status and do not claim ready-to-release. Stage only this slice's files and commit `feat(m9.3a): add native devtools widget and dogfooding` when delivered, or a truthful outcome message if incomplete. Recommend the next roadmap action from the observed results; do not publish or expand scope automatically.

## Plan self-review

Spec coverage is mapped to steps 2–8 (API, lifecycle, presentation, safety and isolation), 9–10 (host integration and correct scoped inputs), 11–13 (packed/native/cost/usability evidence), and 14–15 (docs, honest closure and commit). The five review-focus cases have explicit owning tests/checks. Public names and copy-envelope fields match the approved spec; the registry helper names above are private. Existing npm 1.2.0 remains unchanged. Written-plan approval was received before inline execution. Steps 12–13 were closed by the approved qualification continuation; independent usability and release frame/heap measurements remain explicit evidence gaps rather than claimed results. See both dated outcome packets for the historical sequence.
