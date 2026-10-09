# M11.2 — Named native container conditions

**Status:** Approved as written by Alan Currie on 2026-10-09 following commit `99d81fe`. The implementation plan at `5410f17` was also approved for one native/inline slice. Final qualification passes; whole-slice review and commit remain pending.

**Date:** 2026-10-09.

**Roadmap:** [M11.2](../../roadmap.md#m11--deliver-the-selected-native-extensions).

**Source reviewed:** `c71f0e29867b981228547004ad9e1c96657af59f` in the managed `crumbs-main-merge` checkout.

**Governing decisions:** D2, D3, D6, D7, D11 and D12 in the [native design-system compiler ADR](../../decisions/adopt-native-design-system-compiler.md). This spec applies its finite-condition, native-ownership, runtime-isolation and evidence boundaries without accepting the entire proposed ADR.

## Intent and release scope

Let a shared design-system component select its layout from the size of an explicitly owned native region, independently of the app window. One component rendered in a narrow pane and a wide pane must be able to select different compiled styles under the same theme and window conditions. Ownership must remain understandable across nested containers, package copies and remounts.

The user approved the headless design on 2026-10-09: named definitions; measurement attached to an existing native View; explicit unmeasured behaviour; nearest-owner lookup; finite bucket snapshots; selective subscriptions; and a pure functional core. The [2026-09-30 assessment](../../assessments/2026-09-30-m11-container-conditions.md) remains a historical finding that the then-existing app did not demonstrate adopter demand. The new direction activates delivery and defines a reference scenario; it does not rewrite that evidence.

Deliver M11.2 as one coherent implementation slice and one final implementation commit, including public APIs, semantic/type/property tests, cost evidence, packed-consumer qualification, native dogfood and documentation. Continue with M11.3–M11.5, then return to M10.5 release closure. The existing blocking warm-transform result, numerical host policy, matching-runner requirement and exact-release-artifact qualification remain separate. Android emulator acceptance is included; all physical-device and screen-reader work remains deferred by user instruction. No push, tag or publication is authorised here.

## Approaches and decision

1. **Headless layout owner — selected.** A hook owns the measurement store; a provider supplies that owner to descendants; the hook callback attaches to an existing native View. This preserves the component's layout/accessibility/ref choices and makes measurement ownership visible.
2. **A native Container component.** It reduces wiring but binds ownership to a particular native wrapper. It is unnecessary for the selected scenario and excluded from this slice.
3. **Compiler-embedded container branches.** It would add descriptor, expression and resolver integration before the ownership boundary is qualified. M11.2 instead selects already authored values, following the existing M6 finite-condition pattern.

## Public API and package boundary

Add one optional entry: `@opsydyn/crumbs-css/theme/containers`, with ESM, CommonJS and matching declarations. Its six value exports are:

- `defineContainer(input)` — validate and return an immutable named definition.
- `getContainerBucket(definition, size?)` — pure classification; absent size yields `unmeasured`.
- `resolveContainerValue(definition, bucket, values)` — pure exhaustive selection, preserving the selected value's identity.
- `useContainerLayout(definition)` — create an instance-owned measurement handle.
- `ContainerProvider({ layout, children })` — supply that handle to descendants.
- `useContainerValue(definition, values)` — select a value from the nearest matching owner.

Publish the types `NativeContainerAxis`, `NativeContainerDefinitionInput`, `NativeContainerDefinition`, `NativeContainerBucket`, `NativeContainerValues`, `NativeContainerLayout` and `ContainerProviderProps`. The definition/input types infer the finite bucket-name union from a literal record. `NativeContainerBucket<TDefinition>` is that union plus `unmeasured`; `NativeContainerValues<TDefinition, TValue>` requires every member. Literal inference must not widen through the values argument: unknown/missing bucket names and bucket arguments outside the inferred name union are type errors. Bucket names themselves are plain finite strings; identical names in different definitions are not nominal proof of measurement origin. The React ownership boundary verifies the requested identity and shape at runtime. Heterogeneous branch values retain their inferred union, including native view/text/image style types.

The runtime entry imports React and pure internal rules only. React Native's `LayoutChangeEvent` is a type-only dependency. No React Native JavaScript, Node built-ins, compiler modules, Effect, vanilla-extract or esbuild may enter its graph. Keep existing compatibility/focused entry exports and build groups unchanged; build the new JavaScript entry independently and include its declarations in the canonical shared declaration graph. No new product dependency or dependency upgrade is required.

Define containers in ordinary `.ts` modules, outside `.css.ts` evaluation. This slice adds no compiler syntax, captured container descriptor, CSS control field, expression axis, theme axis or implicit conversion of window conditions into container conditions. Values are ordinary JavaScript inputs; selecting a recipe variant or Sprinkles input is valid, but does not change those APIs' condition semantics. A selected function is returned as a value, never invoked or serialized.

The example specifies the proposed API, not a shipped guarantee:

```tsx
// card-container.ts
import { defineContainer } from '@opsydyn/crumbs-css/theme/containers';

export const cardContainer = defineContainer({
  owner: '@acme/ui',
  name: 'card',
  version: 1,
  axis: 'width',
  buckets: { narrow: 0, wide: 320 },
});
```

```tsx
// CardRegion.tsx
import { View } from 'react-native';
import { useThemedStyles } from '@opsydyn/crumbs-css/theme/core';
import {
  ContainerProvider,
  useContainerLayout,
  useContainerValue,
} from '@opsydyn/crumbs-css/theme/containers';
import { cardContainer } from './card-container';
import * as s from './Card.css';

export function CardRegion() {
  const layout = useContainerLayout(cardContainer);
  return (
    <ContainerProvider layout={layout}>
      <View onLayout={layout.onLayout}>
        <CardContent />
      </View>
    </ContainerProvider>
  );
}

function CardContent() {
  const styles = useThemedStyles(s);
  const root = useContainerValue(cardContainer, {
    unmeasured: styles.stacked,
    narrow: styles.stacked,
    wide: styles.horizontal,
  });
  return <View style={root}>{/* native content */}</View>;
}
```

The measured View's queried axis must be constrained independently of the selected child layout. The example above only illustrates wiring; the qualified reference fixture supplies that independent constraint. For raw bucket reads, `useContainerValue` can select the bucket names themselves; no additional snapshot hook is needed.

## Definition admission and stable identity

The exact input fields are `owner`, `name`, `version`, `axis` and `buckets`. Reuse the existing package-owner/contract-name grammar and positive-safe-integer compatibility version from token identities, with a distinct container key namespace. `axis` is exactly `width` or `height`; one definition measures one axis. Two axes require two explicitly owned definitions rather than a Cartesian snapshot; no atomic combined width/height snapshot is promised.

`buckets` is a plain or null-prototype record with 1–16 own enumerable data entries. Names follow `[A-Za-z][A-Za-z0-9._-]*`, are at most 64 characters, and exclude `unmeasured`, `__proto__`, `prototype` and `constructor`. Thresholds are finite non-negative numbers. Normalise negative zero to positive zero. Exactly one entry starts at zero; all minima are distinct. Canonically sort by minimum, independently of insertion order. Reject empty/oversized records, duplicate minima, missing zero, negative/non-finite numbers, arrays, accessor fields, symbol/extra fields and unexpected object prototypes. Read data descriptors before values so rejected getters do not execute.

The immutable definition has exact data fields `$$type: 'crumbs.css.container-definition'`, `formatVersion: 1`, `identity: { owner, name, version }`, `axis` and a dense canonical `buckets` array of `{ name, min }`. Public types have a type-only nominal marker. The compatibility `identity.version` and descriptor `formatVersion` have different meanings. Deep-copy/freeze definition data on admission without freezing caller inputs. An unsupported descriptor format is an error. Admission memoisation is weak and only applies after complete immutable-data admission.

Use the canonical key `crumbs.css.container:${owner}#${name}@${version}` and a canonical shape signature of axis plus ordered bucket names/minima. Matching identity and signature are interchangeable across separately evaluated package copies and equivalent reordered records. Equal identities with different signatures are incompatible when encountered in provider lookup or nested ownership. Do not silently fall back to another owner on mismatch. Changing bucket meanings requires a compatibility-version change in a published design system.

No process-wide definition or measurement registry is added. Only a versioned shared React context is process-wide, following the existing mixed-entry context approach. Validate an existing registry slot's data/ABI shape rather than blindly casting it. ESM/CJS and duplicate same-protocol package copies under one supported React installation must share ownership. An incompatible context ABI produces an actionable diagnostic. Separate React installations remain outside the supported peer contract.

## Pure classification and value selection

For an admitted definition and a finite size `s >= 0`, choose the bucket with the greatest minimum `<= s`. Lower bounds are inclusive; a bucket's upper bound is the next minimum and is exclusive. Fractional native layout units are supported without rounding, unit conversion or an epsilon. Classification depends only on the selected axis. The final bucket has no upper limit.

`getContainerBucket(definition, undefined)` returns `unmeasured`; omitting the argument is equivalent. A valid zero returns the zero-minimum bucket. Explicit null, negative or non-finite input is invalid and cannot reset an owner. The pure function neither mutates the definition nor allocates a cache key containing the size.

`resolveContainerValue(definition, bucket, values)` validates the bucket against that definition and requires a plain or null-prototype record with an own enumerable data entry for every bucket and `unmeasured`, with no extra/symbol/accessor/non-enumerable entries. Value presence is separate from its content: an explicitly present undefined, null or false is a valid selected value. No branch inheritance, threshold accumulation, specificity tie or fallback cascade applies. Selection returns the exact supplied reference/value; it does not clone styles, freeze their contents or execute callbacks. Return types preserve the actual supplied branch-value union.

A copied, immutable value table may be retained per current hook selection. Do not mutate/freeze the caller's table or deeply traverse the selected values. Replacing a values record must refresh selection against the current bucket, even if no new layout event occurs. Inline tables are supported for correctness; recommend memoised tables where a stable consumer can avoid repeated shallow admission. Rejected/missing values cannot be hidden by an unmeasured fallback.

## Measurement ownership and lifecycle

`useContainerLayout(definition)` returns a stable, opaque `NativeContainerLayout<TDefinition>` handle with the admitted `definition` and stable `onLayout: (event: LayoutChangeEvent) => void`. The store and imperative update controls stay private. Cross-copy access uses a versioned owner-local internal protocol under `Symbol.for("crumbs.css.container-owner.v1")`, with a closed, validated facade for snapshots, subscriptions and lifecycle/claim operations. Do not rely on an entry-local WeakMap or module-private symbol to recognise handles created by another supported copy. Handles are runtime capabilities created by the hook, not an accepted serialized-input format; the slot does not register or retain owners globally. Each hook instance owns one store, independent of all other instances using the same definition. A semantically unchanged definition preserves the handle; changing its canonical key or signature creates a fresh owner starting unmeasured.

Attach a handle's callback to exactly one measured native View for that owner's lifetime, and mount exactly one ContainerProvider for it. Sharing one handle across multiple Views is unsupported because the headless API has no host ref with which to establish physical identity. Reject simultaneous multiple committed providers claiming the same handle; do not present that guard as proof that only one native View invokes the callback. Virtualised/replaced measured Views use a keyed owner component so a genuine new instance starts unmeasured.

Call onLayout only as a native event handler, never during render. Read only `event.nativeEvent.layout[definition.axis]`; x/y, the other dimension and window dimensions do not affect classification. The reading is the local layout size reported for the owner, not its scroll extent, transformed visual bounds or a calculated content box. Compose an application-owned onLayout handler explicitly when needed; call the Crumbs callback first, then the application handler. The library installs no Dimensions listener, polling, observer, timer or animation-frame subscription.

The initial client and server selection is unmeasured until a valid native layout event. Do not seed it from window size or an outer owner. Accept a valid event arriving during initial commit before subscription setup so that later subscribers observe the latest complete snapshot. Receiving onLayout establishes calculated layout, not painted/native-frame completion; React Native documents that distinction in [View.onLayout](https://reactnative.dev/docs/view#onlayout). Native observation remains a separate check.

On committed owner replacement or unmount, disable the retired callback and detach owner/selector subscriptions. A late callback for a retired owner is a no-op before reading its payload; it cannot update the replacement or throw a validation error. Explicit React Strict Mode effect cleanup/setup replay must reactivate the same live owner without leaking, permanently disposing it, manufacturing a new measurement or losing its previously observed bucket. A real keyed remount creates a fresh owner. A never-committed render creates no global registration, host resource or active subscription.

A stable mounted owner begins with at most one interned snapshot per bucket plus unmeasured: at most 17. Snapshot data contains canonical owner identity/signature and the bucket only, never raw dimensions or a dimension history. The callback validates the selected dimension before transactionally publishing. Invalid live events preserve the previous snapshot and send no notifications.

## Provider lookup, nesting and portals

ContainerProvider adds its handle to an immutable context map keyed by canonical container identity; map entries hold owner handles, not changing measurements. Measurement updates do not replace the provider context value or render every descendant. Sibling provider instances using the same definition remain independent. State is owned by the tree, not by the definition or global context singleton.

A consumer selects the nearest provider of its requested identity and then verifies the shape signature. A same-identity inner provider shadows the outer owner, including while unmeasured. Different identities leave each other accessible. A nested same-key/different-signature provider is an error rather than an implicit compatibility upgrade. Missing provider, incompatible shape, unsupported protocol and invalid handles report errors with the requested owner/name/version.

Lookup follows the React context tree, including normal React portals; it does not infer a physical native parent from the portal destination. A portal requiring destination-owned size must mount a destination owner/provider explicitly. Providers may coexist with existing theme scopes: container updates do not change NativeConditionSnapshot, theme identity or the native window/accessibility store.

## Subscription, memory and feedback contracts

Use cached immutable snapshots and useSyncExternalStore, following its [snapshot and server-render contracts](https://react.dev/reference/react/useSyncExternalStore). getSnapshot is a read and never creates a new snapshot for an unchanged bucket. Commit the complete snapshot before notification. Same-bucket events return without publication or listener iteration. Different buckets publish once. Repeated read/subscribe/unsubscribe operations are safe and unsubscribe is idempotent.

useContainerValue derives a selector store from the current owner and admitted current values. Subscribe to the owner only while the selector has listeners; detach on the final unsubscribe, owner/value replacement and unmount. Notify React only when the selected output differs by Object.is. Therefore crossing between two buckets selecting the same style reference sends no selector notification. Distinct selected references notify even if their object contents look equal. These are subscription/output guarantees; parent/context/theme updates can still cause ordinary React renders.

The server snapshot selects the explicit unmeasured value, and initial hydration uses that same value. No measured owner state is transferred across requests. Provider/store objects are render-tree local, and no server measurement or native resource is allocated. Hook selection must detect an update between render and subscribe without tearing or missing the current value.

Store/selector state retains the current owner snapshot and current selection/table only, plus the finite snapshot set. No global strong owner history, raw-dimension history, tuple cache or value-table history is admitted. Tests inspect private lifecycle counters and retained finite collections; do not add a production telemetry or getStats API just for qualification.

Bucket publication avoids continuous resize work but cannot guarantee convergence when selected content determines the measured axis. Require the measured axis to be constrained independently in the documented/reference pattern. The implementation neither rewrites layout styles nor applies hidden rounding, debouncing or hysteresis. A reentrant measurement that would publish a different bucket from a subscriber is rejected before a second transaction, preventing recursive notification-stack growth. Same-bucket events remain no-ops during notification. Separate sequential native layout oscillations are an application layout problem; do not silently suppress them or claim universal loop prevention. Qualification includes an explicit oscillating negative control and a stable independently constrained fixture.

## Diagnostics

Add codes using the existing diagnostic formatter:

| Code | Trigger |
| --- | --- |
| CRUMBS_CSS_INVALID_CONTAINER_DEFINITION | Invalid identity, axis, bucket shape/minima, descriptor or handle data |
| CRUMBS_CSS_CONTAINER_UNSUPPORTED_VERSION | Unsupported container descriptor/context protocol |
| CRUMBS_CSS_INVALID_CONTAINER_MEASUREMENT | Invalid selected dimension or malformed live layout event |
| CRUMBS_CSS_INVALID_CONTAINER_VALUES | Unknown bucket or missing/extra/accessor value-table entry |
| CRUMBS_CSS_CONTAINER_PROVIDER_REQUIRED | No owner for the requested container identity |
| CRUMBS_CSS_CONTAINER_CONTRACT_MISMATCH | Matching identity with incompatible axis/bucket signature |
| CRUMBS_CSS_CONTAINER_OWNER_IN_USE | One handle claimed by multiple committed providers |
| CRUMBS_CSS_CONTAINER_REENTRANT_UPDATE | A measurement attempts publication while that owner is notifying |

Keep existing diagnostic strings and public behaviour unchanged. Report precise owner/bucket/field context without dumping selected application values. Treat invalid definitions/tables as errors, never as absence or an unmeasured fallback.

## Implementation boundaries

Keep new concerns in focused private modules under `packages/css/src/containers/`: definition/admission and canonical identity; pure classification/selection; finite owner and selector stores; shared context; React ownership/provider/selection. A thin `src/theme-containers.ts` exports the public surface. Shared identity rules may be reused through pure files; do not import theme-runtime or compiler code merely to access them.

Modify only the package export/declaration/build wiring, diagnostic catalogue, focused runtime/type/graph controls, consumer qualification harnesses, documentation and the new native examples as needed. Preserve existing compiler/artifact descriptor versions, static emission, theme/local-variable APIs, window-condition semantics, recipe/Sprinkles precedence and host-budget policy. Changes required beyond those boundaries must be named in the implementation plan and reviewed before expanding scope.

## Qualification and acceptance

The implementation plan must specify actual commands, owned fixtures and evidence destinations. Required coverage:

1. **Definition/type admission:** 1/16/17 buckets; unordered definitions; identity/version/axis errors; reserved names; getters that remain uncalled; prototype/symbol/extra fields; mutable prior inputs; duplicate-package equivalent/mismatched definitions. Type cases reject missing/unmeasured/extra keys and invalid bucket arguments while preserving view/text/image and heterogeneous selected values.
2. **Pure laws with independent oracles:** threshold boundaries and fractional sizes; zero distinct from absence; deterministic/order-independent classification; monotonic bucket indices as size increases; no input mutation; selection reference preservation; invalid transactions leave prior state unchanged. Generate invalid/adversarial cases independently of production admission, retain reproducible seeds and shrunk regressions.
3. **Store and real React:** same-bucket notification count zero; one publication per crossing; same-value crossing suppressed; changed table applied without measurement; independent siblings; same/different-name nesting; missing/mismatched providers; update-before-subscribe; Strict Mode replay; replacement/unmount/stale events; keyed remount; SSR/initial hydration; portal context; duplicate ESM/CJS entry orders. Check active subscription counts return to zero. Reentrant publication fails deterministically, while sequential oscillation is detected by the test's bounded negative-control recorder rather than hidden by production suppression.
4. **Native reference:** public-API-only Storybook/reference and playground fixtures show one component in A=176 and B=288 native-unit regions under one window/theme, using a 240-unit wide threshold. Change A within its narrow bucket, across the boundary, to exactly 240, back to narrow, then unmount/remount. B remains unchanged. Show nested same-name/different-name ownership and a fixed-height owner crossing its own threshold. Inspect actual calculated and rendered layouts, not only a bucket label. Constrain the measured axes independently and check that event/transition activity settles after each action. Capture iOS Simulator and Android emulator states from the same packed artifact/source receipt. Physical and screen-reader gates stay deferred.
5. **Packed distribution and regressions:** locked clean install; export/declaration/files inventory; genuine Node 22.0.0/current Node ESM/CJS; supported real React with shared context; Expo iOS/Android/web exports with no denied runtime imports; final native served bundle/source/artifact hashes. Run the CSS and Storybook suites, build/typecheck and docs build, including retained M11.1 controls. A web export or Node renderer is not native acceptance.
6. **Cost evidence:** retain full samples and environment/workload identities for classification, same-bucket events, crossings, selector hits, mount/unmount and 1/16/64 owners/consumers with 1/4/16 buckets. Record publication/selection counts and bounded collection sizes separately from timing. Measure new ESM/CJS and gzip graphs and existing-entry graph isolation. Repeat the unchanged complete host collector with the approved matched Expo/Metro pair; retain all failures/incomparable results without changing policy, baselines or numerical limits. These costs are diagnostic unless already governed by the active policy; no new device/frame/allocation guarantee is inferred from host results.

Retain one whole-slice review against this spec, the approved implementation plan and the existing compatibility contract. Resolve important findings before the single final implementation commit. Publish an assessment/evidence packet with exact source/artifact/environment identities and limits; update the roadmap only to the status actually supported by that evidence.

## Documentation and next step

Before implementation, this spec and the subsequent plan live outside shipped API documentation. At implementation completion, document the opt-in entry, exhaustive maps, initial unmeasured state, inclusive thresholds, one-axis ownership, nesting/portals, callback composition, virtualised/keyed owners, independently constrained layout, diagnostics and evidence limits. Provide ordinary React Native examples and stable memoisation guidance without promising zero total renders or automatic layout-loop prevention.

The next stage is **M11.2 implementation planning**, after explicit written-spec review. Preserve the user's native/inline execution preference for the eventual single implementation slice. After that slice is complete and committed, recommend **M11.3 — native motion adapter**. No M11.3 design, implementation or release work is authorised by this document.
