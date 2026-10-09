# M11.3 — Typed native motion adapter

**Status:** Proposed written spec; awaiting review. The selected M11 roadmap and native Animated boundary are authorised; this document does not claim approval of its detailed API or implementation plan.

**Date:** 2026-10-09.

**Roadmap:** [M11.3](../../roadmap.md#m11--deliver-the-selected-native-extensions).

**Source reviewed:** `2fdc5c45cb6f23c37511c082b47f19ea1d7edb11`, managed `crumbs-main-merge` checkout, local `main`.

**Governing decisions:** runtime isolation, native semantics and explicit extension/evidence boundaries in the [native design-system compiler ADR](../../decisions/adopt-native-design-system-compiler.md). This spec does not accept the entire proposed ADR.

## Intent and scope

Give design-system teams a reusable, typed transition between named component states, with one instance owning its animation nodes and lifecycle. The added value is consistent interruption, cancellation, reduced-motion policy and cleanup. The adapter delegates continuous work to React Native Animated; it never routes animation frames through theme resolution, React state or Crumbs style caches.

The reference case is two independently owned cards under one theme: resting and selected targets change opacity and translation together. Commands on one card leave the other unchanged. A second interaction changes a target while a transition is running. Switching the native preference to reduced motion stops the current transition and reaches the latest target immediately; future commands are immediate until full motion returns.

The [2026-09-30 assessment](../../assessments/2026-09-30-m11-motion-adapter.md) remains historical. At that time the existing reference needed no new public adapter. The user has now selected M11.3 as pre-release scope; this is a product direction, not new adopter-demand evidence. The current `NativeAccessibilityContexts` sample directly owns `Animated.Value`, stops/restarts it, and responds to reduced motion, but has no dedicated component interruption/unmount checks. Preserve its existing behaviour and acceptance controls; introduce a separate shared adapter fixture rather than silently changing that sample's initial reduced-motion endpoint.

Deliver one complete M11.3 implementation slice, one final implementation commit, native dogfood, documentation and qualification. Existing public entries, compiler descriptors, styles, recipes, variables, containers, token domains and compatibility aliases retain their current meanings. No product dependency or version upgrade is required. React Native's existing peer supplies Animated. Android emulator acceptance is included; physical devices and spoken screen readers remain deferred by user instruction.

M11.4 token algebra and M11.5 extension/serialization work follow this slice. M10.5 release closure retains both the warm-transform and incremental-rebuild blockers recorded by M11.2, the approved numerical policy and matching-runner/exact-artifact prerequisites. This spec neither waives a release result nor authorises push, tag or publication. An approved deferral of M11.2 feature acceptance is not evidence that either release metric now passes.

## Approaches and recommendation

1. **Named immutable targets and a native Hook — recommended.** Define the finite state contract in a pure entry. An opt-in native entry owns the nodes, executes timing transitions and exposes explicit commands plus typed terminal results. This removes repeated lifecycle code and catches unsupported properties/unknown states before native work.
2. **A scalar Animated.Value wrapper.** It would be smaller, but callers would still assemble property bindings, coordinate multi-property endpoints and repeat state typing. It adds little beyond the existing sample.
3. **A Reanimated or general adapter registry first.** It would add a second execution/runtime contract and possibly worklet/serialization requirements. The selected scenario is expressible with the existing Animated peer. Keep independent adapters and general extension registration outside M11.3.

Timing transitions are the complete initial contract. Springs, gestures, scroll linkage, layout animation, loops, keyframes, delays, arbitrary easing functions, dynamic colour interpolation and arbitrary style dictionaries are excluded. These require their own semantics and evidence; naming them here does not commit the roadmap to their delivery.

## Public API and package separation

Add two optional public subpaths, each with ESM, CommonJS and canonical matching declarations:

- `@opsydyn/crumbs-css/theme/motion`: exactly one value export, `defineMotion`. Pure definition admission/data only: no React, React Native JavaScript, Effect, Node built-ins or compiler imports.
- `@opsydyn/crumbs-css/theme/motion/native`: exactly one value export, `useNativeMotion`. React and the public React Native peer are the only runtime externals. No deep React Native/private imports, Effect, compiler, theme runtime, vanilla-extract, Node or esbuild graph.

Do not re-export either entry through existing compatibility/core entries. Build the JavaScript graphs separately and include their declarations in the existing shared declaration build. The native entry's explicit React Native allowance must be scoped to that new entry; existing denial tests, including the container entry's React-only boundary, remain unchanged.

The pure entry exports the types `NativeMotionChannel`, `NativeMotionTarget`, `NativeMotionDefinitionInput`, `NativeMotionDefinition`, `NativeMotionState` and `NativeMotionEasing`. The native entry exports `NativeMotionOptions`, `NativeMotionController`, `NativeMotionRun` and `NativeMotionResult`. It may re-export those pure types for convenience, with no additional value exports.

`defineMotion` infers literal state names. `NativeMotionState<D>` extracts their union. Inputs require the same exact nonempty channel set in every state, reject unsupported properties on fresh and predeclared records, and preserve literal names through the Hook and commands. An options/target argument cannot widen the definition's inferred state union. No public `any` or arbitrary string/property fallback makes an invalid target appear valid. These rules are checked against the installed declarations and real peer types.

```ts
// card-motion.ts: ordinary authoring data, outside .css.ts evaluation
import { defineMotion } from '@opsydyn/crumbs-css/theme/motion';

export const cardMotion = defineMotion({
  states: {
    resting: { opacity: 0.8, translateY: 0 },
    selected: { opacity: 1, translateY: -4 },
  },
  transition: { duration: 180, easing: 'ease-out' },
});
```

```tsx
import { useEffect } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import type { NativeMotionPreference } from '@opsydyn/crumbs-css/theme/conditions';
import { useNativeMotion } from '@opsydyn/crumbs-css/theme/motion/native';
import { cardMotion } from './card-motion';

// styles are already resolved Crumbs styles; motion is the app's finite
// native preference, with 'reduced' used until the native read is known.
type SelectableCardProps = {
  readonly styles: { readonly card: StyleProp<ViewStyle> };
  readonly motion: NativeMotionPreference;
  readonly selected: boolean;
  readonly onSelect: () => void;
};

export function SelectableCard({ styles, motion, selected, onSelect }: SelectableCardProps) {
  const transition = useNativeMotion(cardMotion, {
    initial: selected ? 'selected' : 'resting',
    motion,
  });

  useEffect(() => {
    transition.animateTo(selected ? 'selected' : 'resting');
  }, [selected, transition]);

  return (
    <Pressable onPress={onSelect}>
      <Animated.View style={[styles.card, transition.style]} />
    </Pressable>
  );
}
```

The example explicitly synchronises committed selected props in an effect. The Hook itself has no implicit target prop or mount animation: components decide when to issue commands. They must not call commands during render. Preserve normal native accessibility/interaction semantics in the real fixture; the adapter supplies no wrapper component or automatic accessibility prop.

The stable controller exposes only:

- `style`: a stable, React Native assignable animated View style for this owner's channel set.
- `animateTo(state)`: return an immutable `NativeMotionRun` with `result: Promise<NativeMotionResult>` and `cancel(): void`.
- `set(state)`: stop the current run and set all target channels immediately. It returns void.
- `cancel()`: cancel the current run while retaining its current presentation. It returns void.

A result always resolves and never rejects:

- `{ status: 'finished', target, mode: 'animated' | 'immediate' }`.
- `{ status: 'cancelled', target, reason: 'cancelled' | 'superseded' | 'set' | 'deactivated' | 'driver-stopped' }`.
- `{ status: 'failed', target, code: 'CRUMBS_CSS_MOTION_DRIVER_FAILED' }`.

`target` retains the definition's state union. Run cancellation acts on that exact run token, never whichever run happens to be active later. There is no callback registration, React state subscription or per-frame event in the public adapter. A consumer attaching `run.result.then(...)` owns its own mounted/generation checks before updating application state; settling a Promise does not make an application callback safe after unmount.

## Definition admission and numeric semantics

Input is exactly `{ states, transition }`. Both it and its nested records must be plain/null-prototype records with own enumerable data fields. Inspect descriptors before reading supplied values. Reject getters/setters, inherited/symbol/hidden/extra fields, sparse arrays, unexpected prototypes and malformed nested records without executing rejected accessors. Functions and token-reference objects are not accepted as numeric targets or transition configuration.

`states` contains 1–16 entries. State names follow `[A-Za-z][A-Za-z0-9._-]*`, have at most 64 characters, and exclude `__proto__`, `prototype` and `constructor`. All state targets have precisely the same 1–6 channel keys. Allowed channels are `opacity`, `translateX`, `translateY`, `scale`, `scaleX` and `scaleY`. No channel inherits a value from another state and no empty target becomes a silent no-op definition.

Opacity endpoints are finite numbers in `[0, 1]`. Transform endpoints are finite signed numbers whose conversion to float32 is also finite, including zero and negative scales. Preserve the authored number rather than rounding it to float32; the check only rejects native float overflow. Translation uses React Native layout units, scale is unitless. No percentage/angle/unit string conversion occurs. Normalise negative zero to positive zero. The fixed transform order is translateX, translateY, scale, scaleX, scaleY, omitting absent channels. Combining scale with scaleX/scaleY is permitted and composes in that order; record insertion order cannot change geometry. Motion supplies the complete transform field; callers must keep static transforms on a separate wrapper rather than expecting React Native style arrays to concatenate transform lists.

`transition` has exactly `duration` and `easing`. Duration is finite milliseconds in `[0, 60000]`, including fractional values; normalise negative zero. The one-minute ceiling bounds native timing preparation and is an explicit adapter constraint, not a change to Crumbs' general duration token domain. Easing is exactly `linear`, `ease-in`, `ease-out` or `ease-in-out`, mapped to linear, quadratic-in, quadratic-out or quadratic-in-out respectively. These curves remain within the endpoint interval and introduce no spring overshoot.

The returned deep-copied/frozen data has exact fields `$$type: 'crumbs.css.motion-definition'`, `formatVersion: 1`, `states` and `transition`, with a type-only nominal marker. State records are copied to frozen null-prototype records; channels use the canonical order. Freeze no caller object. The native boundary requires the complete definition and its nested data to be frozen, and checks a same-format definition structurally, so a genuine definition from another package copy works; unsupported format or malformed data is an actionable error. Admission memoisation is weak and only follows complete immutable admission. No global definition registry, shared provider or package-specific WeakMap authenticity requirement is introduced.

This ordinary data definition is not a compiler descriptor, function-export protocol or a promise of portable arbitrary-function serialization. M11.5 governs that boundary separately.

## Preference, options and instance ownership

Hook options are exactly `initial`, `motion` and optional `duration`. `initial` must be a known state and seeds a new definition owner. Changing only initial on an existing owner does not reset its nodes: initialise once, use `set` for subsequent immediate changes. Duration override follows the same numeric bounds and affects commands started after that options commit. The definition supplies easing. A definition-reference change creates a fresh owner at its new initial target; retire the old owner only at commit. Recommend module-defined definitions or memoisation. Render an equal but freshly defined object and it is still a deliberate owner replacement; no hidden structural lifetime cache is promised.

`motion` is required and exactly the existing `NativeMotionPreference` union, `'full' | 'reduced'`. The adapter has no preference source, asynchronous native query or ThemeProvider requirement. Reuse the app's existing condition source, whose native read begins reduced until known. Duration tokens/condition results are resolved to numbers by ordinary app/theme reads before supplying an override. Revalidate before a command can mutate native state; no frames resolve tokens, expressions, conditions, containers or styles.

Commit options through the Hook's layout effect. An aborted/suspended render cannot cancel the committed animation, change committed preference or expose speculative configuration to an old controller. Each owner has its own 1–6 Animated values and stable style/commands. Native nodes are not frozen; freeze only definition data and public containers. Direct writes to owned values, sharing them with another driver, or mutating the returned style are outside the contract.

Use the native driver for iOS/Android and the JavaScript driver for the Expo web smoke path, chosen once per owner. No caller-configurable driver switch exists, so a value never alternates drivers. Other runtime platforms are rejected explicitly by this initial adapter; exports/types do not claim Windows/macOS/visionOS qualification. The web path is the existing native-style consumer compatibility path, not M11.6's distinct web backend.

Animated native updates and node binding avoid React reconciliation for each frame, while supported native-driver properties are limited. This scope deliberately picks opacity/transforms and leaves layout transitions out. See the [React Native 0.85 Animated reference](https://reactnative.dev/docs/0.85/animated) and [animation limitations](https://reactnative.dev/docs/0.85/animations#caveats). The reviewed installed peer is `react-native@0.85.3`; no broader performance or platform guarantee follows from the documentation.

## Commands, interruption and terminal results

Validate a command's state and all committed inputs before stopping a valid previous run. Invalid commands throw a Crumbs diagnostic and leave current nodes/run unchanged. Before owner activation, commands are an invalid usage error; call from event handlers or an effect after this Hook's setup, not during render or an earlier descendant layout effect. Commands retained after deactivation have no native side effects; `animateTo` returns an already resolved cancelled/deactivated run, while set/cancel are no-ops. Invalid targets still report invalid input rather than being hidden by deactivation.

An active `animateTo(target)` interrupts a different active target: retire the old run's authority before invoking driver stop calls that may synchronously call back, then settle it as superseded. A cleanup failure instead settles that old run failed, fails the new request and starts no replacement timing. A repeat of the same still-active target returns the same run object, with no restart. Repeating an already reached target completes immediately with no timing work. A cancelled or partly completed transition is not proof that its previous named target was reached, so a later command to that target must animate from the actual current presentation.

For a timed transition, recover each channel's current presentation through the public `stopAnimation(callback)` boundary, then begin timing from those validated stopped values. React Native 0.85's native read callback is asynchronous; its internal JavaScript value can otherwise lag the presentation. Do not read private `__getValue`, assume the prior target was reached, reset to the original initial state or sample each frame. The callback's documented contract is in [Animated.Value.stopAnimation](https://reactnative.dev/docs/0.85/animatedvalue#stopanimation).

A stopped-read cohort belongs to an owner activation epoch, with an independent run token. Rapid targets while that same cohort is outstanding supersede earlier runs and use its stopped values for the newest request rather than queuing another cohort. A set, reduced-motion immediate completion or deactivation retires that read epoch before changing nodes. Later native replies from a retired epoch cannot write, start work or settle a replacement run. A new epoch may have its own cohort; the adapter cannot promise how long an underlying native bridge retains an already queued callback. Retain only the current cohort/run in owner state and no history/cache keyed by run count.

After all channel replies pass finite/domain validation, set their stopped values and start at most one timing object per channel for the current run, all with the captured duration/easing and `isInteraction: false`. Preserve per-channel success tracking; every channel must complete successfully before returning finished/animated. A composite's last boolean alone is insufficient. Start failures and unexpected/non-finite/out-of-domain replies stop owned work and resolve failed. A driver finished=false without adapter cancellation resolves cancelled/driver-stopped. Invalidate the run before cleanup, handle synchronous callbacks/reentrancy, and settle each result exactly once.

Reduced motion or zero duration uses no timing/read cohort: stop old work, set every channel to the current requested target and finish/immediate. A caught stop/set failure resolves that run failed after best-effort cleanup; an immediate policy never fabricates success after a failed channel write. When reduced motion is committed during preparation or a running transition, finish that current run at its latest target immediately; it is not reported as a user cancellation. Returning to full motion does not replay completed work. Changing duration alone does not alter an already started/preparing run's captured policy. No background timeout fabricates success if the native system never returns; explicit cancellation, reduced motion, set and deactivation can still settle a pending run.

`run.cancel` and controller cancel retire run authority, stop all current owned work and settle cancellation without jumping to a named target. A synchronous driver-stop failure produces failed instead; attempt cleanup of every channel even if one throws. Stale run cancellation is idempotent and cannot stop a newer run. `set(state)` supersedes the active run with reason set, then immediately writes the complete state; it does not emit a new run result. If driver stop/set throws, retire current authority, attempt all remaining cleanup and throw the bounded driver-failure diagnostic from this imperative set call. Do not mark a named target reached or claim rollback of a partially changed native presentation. No public queue, sequence, restart mode, frame listener or implicit state replay is introduced.

## Functional core and lifecycle boundary

Keep admission, target/policy selection and the finite transition reducer pure. Private reducer events cover activation, command, read cohort reply, per-channel completion, preference/options commit, cancellation, set and deactivation. Its output describes state plus bounded stop/read/set/start/settle commands. A small Animated interpreter and Hook lifecycle own the effects. Do not introduce Effect execution or a general extension framework merely to implement the reducer. Private injectable driver contracts enable deterministic tests; they are not a public backend registration promise.

Use owner activation epochs and unique run/cohort tokens for late-callback safety. Deactivation first retires authority, stops owned work, settles current results with reason deactivated (or failed for a caught driver-stop failure), and removes adapter-owned references/listeners. Cleanup continues after a driver error and never throws from the Hook cleanup; a failed result records the operational error. Strict Mode setup can activate a fresh epoch on the retained owner; it never revives a retired run. Committed Suspense hide/reveal must exercise cleanup/re-setup, retain the stopped presentation, and allow a fresh command after reveal. Unmounted/replaced owners never write a later owner's nodes. Two Hook calls using one definition still own separate nodes and results.

Constructing the Hook's candidate owner must start no animation, add no frame listener, invoke no command or mutate a global slot. An abandoned render needs no native run cleanup. No process-wide context/provider means duplicate ESM/CJS copies do not need a new React context ABI; structural definition admission and one supported React peer are enough. Separate React installations remain outside the peer contract.

The cost contract is structural: no React updates, theme resolutions, style-cache keys or production JavaScript listeners per animation frame; at most six values and timing objects, one current run and one current read cohort per active owner; no growing retained run history. Promise settlement occurs only at terminal command boundaries. Test-owned telemetry must distinguish its overhead from the adapter's work.

## Diagnostics and review focus

Add the actionable codes `CRUMBS_CSS_INVALID_MOTION_DEFINITION`, `CRUMBS_CSS_MOTION_UNSUPPORTED_VERSION`, `CRUMBS_CSS_INVALID_MOTION_OPTIONS`, `CRUMBS_CSS_INVALID_MOTION_TARGET`, `CRUMBS_CSS_MOTION_NOT_ACTIVE`, `CRUMBS_CSS_MOTION_UNSUPPORTED_PLATFORM` and `CRUMBS_CSS_MOTION_DRIVER_FAILED`. Use field/state/channel paths and bounded context rather than dumping whole objects. Driver failure is the typed terminal code `CRUMBS_CSS_MOTION_DRIVER_FAILED`; validation errors are synchronous and leave valid current work unchanged. Diagnostic additions must not force motion modules into existing graphs.

Review specifically checks adversarial accessor admission; exact channel-set/type widening escapes; transform composition; numeric/easing bounds; React Native asynchronous read semantics; synchronous stop/completion reentrancy; partial completion incorrectly reporting finished; run/read/activation token confusion; aborted-render option publication; repeated Strict/Suspense lifecycle; one owner cancelling another; Promise settlement exactly once; native-only external allowance accidentally admitting React Native into old entries; and mocked host proof being mistaken for actual native delivery.

## Qualification and acceptance

The implementation plan must state concrete commands, prerequisites, identity checks and expected results before execution. Complete these in the single slice:

1. **Admission/types:** RED before implementation, then installed and workspace declarations. Assert literal state inference, unknown state rejection, extra/missing channel rejection on predeclared inputs, invalid property/value/config rejection, canonical transform ordering, copy/freeze without caller mutation and getter execution count zero. Cross-copy same-format definitions are accepted; malformed and unsupported descriptors fail.
2. **Pure/property laws:** independent test-owned target/run oracle and seeded fast-check sequences (seed 20261009, 300 runs per law). Assert exactly-once terminal settlement, latest-run/read epoch authority, idempotent stale cancellation, no writes after deactivation, instance independence, no speculative option publication, bounded owner state and no animation for immediate policy. The oracle does not call the production reducer.
3. **Driver/lifecycle:** a controllable fake public Animated boundary delivers reads/completions in arbitrary orders, delayed, synchronously during stop, after replacement, duplicated and partially failed. Test native current presentation differing from stale JS value; repeated pending-target coalescing; cancellation before samples complete; reduced motion during reads/runs; zero duration; driver exceptions; all channel completions; 3 committed Suspense hide/reveal cycles and Strict Mode replay/unmount. Fake checks are host semantics, not native acceptance.
4. **Package/targets:** frozen original lock, complete build/CSS/Storybook suites, strict typechecks and docs build. Genuine Node 22.0.0/current supported Node load the pure packed entry in ESM/CJS with no runtime peers. The native entry is a React Native bundler target, not a promise that Node can parse React Native's Flow source. Real peer declarations plus Expo iOS/Android/web exports and actual native checks establish that boundary. Any Node renderer with a fake RN peer is labelled synthetic. Verify both-copy definition consumption and all old export/alias/denial controls.
5. **Shared dogfood/native:** one canonical two-card fixture used by internal Storybook and Expo playground and copied verbatim into a separately installed exact tarball consumer. Exercise independent targets, actual in-flight and final rendered opacity/translation, mid-transition replacement, cancelled presentation versus later restart, stale run cancel, set, zero duration, native reduced-motion switching during a run and restoration, repeated unmount/remount and late callbacks. Retain raw commands, timestamps, UI/capture inspection and final served bundle/map/source/artifact hashes for iOS Simulator and Android emulator. Host counters or a green exported bundle cannot substitute for native action/result inspection. Keep simulated policy overrides distinct from actual native preference observations, and restore only owned settings/processes.
6. **Cost/evidence:** raw/gzip bytes for both new entries and deltas for existing graphs; first-load cost for the pure entry and native bundle/initialisation evidence for the native entry; owner/command allocation/count checks under repeated interruption with no history growth; no per-frame React/theme-resolution count increase; documentation of any benchmark instrumentation. Run the approved unchanged matched M10.5 collector/comparator, retain every valid result and report any new blocking metric. Do not repeatedly recollect a valid failure to obtain a pass, change baseline/limits or silently extend M11.2's feature deferral. Distinguish host/synthetic evidence, development native acceptance and release-Hermes/device performance.

Accept M11.3 only when the API, semantic/type/property, lifetime/cost, distribution and native reference checks above pass, Important review findings are repaired with RED/GREEN evidence, documentation/roadmap state matches observation and the single implementation commit exists. Any new blocker has its actual disposition recorded before accepting the slice. Keep M10.5 releasePolicyQualified false until its unchanged gate and release prerequisites are met; M11.3 completion does not publish the package.

## Handoff

The next stage is the **M11.3 implementation plan**, after review of this written spec. Preserve the native/inline preference and one complete implementation slice. After the implementation commit recommend **M11.4 — richer token algebra**. M11.4 implementation, release-policy changes and publication are not authorised by this design.
