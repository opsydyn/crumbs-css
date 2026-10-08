# M11.1 — Typed standalone variables and local assignment

**Status:** Proposed. The conversational design was approved on 2026-10-08; written-spec review is pending.

**Date:** 2026-10-08.

**Roadmap:** [M11.1](../../roadmap.md#m11--deliver-the-selected-native-extensions).

**Source reviewed:** `4b2d5b68387672521126f9d51ed20d113f1e6e74` in the managed `crumbs-main-merge` checkout.

**Governing decisions:** D2–D6 and D12 in the [native design-system compiler ADR](../../decisions/adopt-native-design-system-compiler.md). This design extends the existing domain, identity, immutable-snapshot and runtime-isolation contracts.

## Intent and agreed release scope

The user has selected five native extensions before aiming to ship: standalone variable assignment, container conditions, a native motion adapter, richer colour/typography algebra, and a constrained extension/serialization protocol. Number these M11.1–M11.5 and deliver each as one coherent implementation slice with documentation, relevant checks, native dogfood and a commit. Design-tool/editor adapters and a separate web backend remain parked as M11.6.

M11.1 lets a design-system component accept an instance-owned scalar styling input without introducing a theme contract or using a brand/mode/density scope for that input. The first reference scenario is two cards with independently assigned accent and opacity values under one shared theme. Clearing a local accent restores the theme-backed default; changing one card leaves the other card's values unchanged.

The earlier [dogfood assessment](../../assessments/2026-09-30-m11-standalone-token-assignment.md) found no demonstrated need in the then-existing app. The user's new direction activates delivery; this spec defines the reference scenario to qualify it. Neither changes the historical assessment into adopter-demand or performance evidence.

After M11.5, return to M10.5 release closure. The active consumer-scope host policy, its blocking warm-transform failure, matching-runner prerequisite and exact-release-artifact qualification remain explicit. This spec changes no limit, baseline or publication gate. Physical-device work remains deferred. Completing these extensions does not itself authorise npm publication.

## Goals and boundaries

- Add native, domain-aware `createVar`, `fallbackVar` and `assignVars` APIs.
- Make assignment ownership explicit in the resolver call; preserve the surrounding theme and all existing semantic scopes.
- Preserve view/text/image property types, domain checks and native composition order through capture, generated artifacts and resolution.
- Support literal-only consumers without a theme provider, and mixed consumers using the active existing theme.
- Preserve stable package-owned identity across independent compilation, duplicate package copies and refresh.
- Reuse unchanged output identities without retaining an unbounded history of instance values.
- Keep compiler/Effect dependencies out of the new ordinary runtime entry.

M11.1 does not introduce CSS variable inheritance, a `vars` CSS control field, arbitrary theme-token overrides, a local provider hierarchy, animated values, expression operands, container conditions or function exports. Existing styles, token contracts, scopes, recipes, exports and descriptor versions retain their current meanings. M11.3 owns continuous animation updates.

## Approaches and decision

1. **Explicit local snapshots and resolution — selected.** Definitions and fallbacks are immutable data; an instance passes its own admitted assignment snapshot to a pure resolver or React hook. Ownership is visible, scalar updates are independent of semantic themes, and existing consumers need no migration.
2. **A new implicit variable provider/cascade.** It would make nesting convenient but add precedence, portal, subscription and propagation contracts before this scenario needs them. Exclude it from M11.1.
3. **A general extension registry first.** It would move the feature behind registration and runtime dispatch without reducing its domain or lifecycle requirements. M11.5 will define the separate portable extension boundary after the native features have concrete contracts.

## Public API and entrypoints

Add `createVar` and `fallbackVar` to the existing authoring entry `@opsydyn/crumbs-css/style`. Add `assignVars`, `resolveAssignedStyles` and `useAssignedStyles` to the opt-in runtime entry `@opsydyn/crumbs-css/theme/vars`. Publish matching ESM, CommonJS and declaration exports. Keep the existing compatibility and focused runtime entries' exports unchanged; do not add these implementations to their import graphs.

The new runtime exports the types `NativeLocalVar`, `NativeLocalFallback`, `NativeLocalVarShape`, `NativeLocalVarValues`, `NativeVarAssignments` and `ResolvedAssignedStyles`. Authoring and runtime declarations share one nominal type graph, following the existing declaration build. Ordinary callers receive plain values and synchronous results; they do not construct Effect services or run Effect programs.

The API examples below specify the intended new contract and are not claims that these functions already exist:

```ts
// LocalCard.css.ts
import { createVar, fallbackVar, viewStyle } from '@opsydyn/crumbs-css/style';
import { vars as themeVars } from '../styles/theme';

export const accent = createVar('color', {
  owner: '@opsydyn/crumbs', name: 'LocalCard.accent', version: 1,
});
export const opacity = createVar('opacity', {
  owner: '@opsydyn/crumbs', name: 'LocalCard.opacity', version: 1,
});

export const localVars = { accent, opacity };
export const styles = {
  root: viewStyle({
    backgroundColor: fallbackVar(accent, themeVars.color.accent),
    opacity: fallbackVar(opacity, 1),
  }),
};
```

```tsx
// LocalCard.tsx
import { useMemo } from 'react';
import { View } from 'react-native';
import { assignVars, useAssignedStyles } from '@opsydyn/crumbs-css/theme/vars';
import { localVars, styles } from './LocalCard.css';

function LocalCard({ opacity }: { opacity: number }) {
  const assignments = useMemo(
    () => assignVars({ opacity: localVars.opacity }, { opacity }),
    [opacity],
  );
  const resolved = useAssignedStyles(styles, assignments);
  return <View style={resolved.root} />;
}
```

For non-React callers, `resolveAssignedStyles(styles, assignments, theme?)` performs the same resolution. `theme` is the existing native theme snapshot. It is necessary only when a reached declaration or fallback needs a theme token. `useAssignedStyles(styles, assignments)` reads the same existing theme context/store; it does not create a second theme authority. A literal-only input works without a provider. Theme reads obey existing contract-identity rules.

`useAssignedStyles` applies to a plain compiled primitive-style map or marked native style map. Its resolved result retains each export's view/text/image type. Existing composition references are valid inside an export, with current last-declaration precedence. A compiled style involving a local variable is a branded local style plan, not an already-resolved React Native style object. Types prevent passing that plan directly to a native `style` prop; its intended consumer is the new resolver or hook.

Existing recipe, component-recipe, Sprinkles, condition and expression authoring surfaces do not gain local-variable operands in this slice. A component may combine resolved local primitive styles with its already-resolved recipe output using normal native style composition. Diagnostics reject unsupported local-variable placements rather than pretending all descriptor families support them.

## Definitions and stable identity

`createVar(domain, identity)` requires a `TokenDomainDefinition` and explicit `{ owner, name, version }` identity. Reuse the existing normalised token domain and package/name/positive-safe-integer identity grammar. No untyped no-argument overload or evaluation-counter identity is introduced.

Supported domains are the existing colour, length, duration, opacity and finite-enum domains. Length declarations preserve `allowNegative`; enum declarations preserve their exact finite values. A domain is not evidence that every native property supports it: duration has no ordinary native scalar-style property in this slice, for example.

The returned handle is immutable, nominally typed and represented by a new plain-data descriptor with tag `crumbs.css.local-var`, version `1`, identity and normalised domain. Its canonical key includes a local-variable namespace distinct from theme-contract identifiers. Package copies with the same identity/domain describe the same variable. Conflicting domains for one identity are errors at compilation or admission, including conflicts across separately compiled inputs and assignment snapshots. Neither path overwrites earlier metadata to make a conflict disappear.

Generated payloads carry the information needed for runtime admission; they do not depend on the build process's object identity or a persistent runtime declaration registry. Changing a published domain requires a new compatibility version. Arbitrary strings, caller casts and lookalike objects do not establish variable ownership or domain validity.

## Assignment semantics

`assignVars(shape, values)` accepts a nested plain record whose leaves are standalone handles. `NativeLocalVarValues<typeof shape>` infers one literal native value for each leaf. Values must fully populate the supplied shape, with no extra keys or explicit `undefined`. To assign a subset, pass a subset shape as shown above. `assignVars({}, {})` is the canonical empty snapshot and clears every assignment when supplied to the resolver in place of a previous snapshot.

Assignments contain literal domain values, not theme references, local references, closures, React values or animated values. Theme-backed defaults belong in `fallbackVar`. Preserve existing native value-domain semantics: finite numbers, opacity in `[0, 1]`, non-negative duration, declared negative-length permission, enum membership and the existing colour-string boundary. A colour assignment is not newly certified as renderable or contrast-safe by this feature.

Admission checks own enumerable data descriptors before reading values. Reject accessors without invoking them, symbol/extra fields, decorated shapes, unsupported prototypes, arrays as shape containers, cycles and inherited values. Follow the existing plain-data boundary's 64-container depth limit. A reference hidden in a cast cannot be treated as a literal colour string. Unsupported Proxy behaviour remains outside the same-realm plain-data contract, consistent with existing codecs.

Build a canonical flat binding table keyed by variable identity, carrying its normalised domain and value. Sort bindings by canonical identity, freeze the snapshot, and leave input objects unchanged. Repeated identities with the same domain and value collapse to one binding; conflicting repeated values or domains fail rather than choosing one from record order. Literal equality uses `Object.is`, including the distinction between `0` and `-0`. Preserve the existing numeric semantics, including `-0` where relevant.

The public snapshot uses a new `crumbs.css.local-assignments` tag and version `1`. Shape paths are diagnostic provenance, not identity. One snapshot replaces the previous local snapshot in the resolver call; omitted variables never inherit an earlier call's values. There is no mutable setter, implicit parent assignment or assignment merge API in this slice. Reconstruct a complete next snapshot using normal immutable application data.

## Fallback and error semantics

`fallbackVar(primary, ...alternatives, terminal)` requires a primary local handle, zero or more same-domain local handles, and a terminal literal or public typed theme token with the same normalised domain. A chain admits at most 16 local handles; repeated handles are allowed and retain first-match semantics. Nested fallback descriptors and legacy unscoped theme tokens are not alternatives. The descriptor uses tag `crumbs.css.local-fallback`, version `1`, with ordered local references and one terminal.

Try local handles in declaration order. Select the first present valid assignment. Values such as `0`, `-0` and an allowed empty enum member are present values, not missing. Only absence advances the chain. A malformed snapshot, wrong domain or invalid assigned value fails admission even if the binding would otherwise be unused. An invalid fallback descriptor or terminal literal is rejected at its ingress, regardless of which branch would be selected.

A terminal theme token is resolved only when all local alternatives are absent, using existing theme ownership and required-token behaviour. A missing provider, wrong contract, malformed theme or missing required token remains an error; it is never reinterpreted as an absent local assignment. A populated local assignment can resolve without reading an unused theme-backed terminal.

A direct local handle in a property has no implicit fallback. If it is unassigned when that effective declaration is selected, throw a missing-local-variable diagnostic. Literal and assigned values also pass the target property's native constraints: a length value accepted by its broad domain can still be rejected for a property that excludes percentages, `auto` or negative values.

Use stable diagnostic codes for invalid local descriptors/assignments, identity/domain conflicts, unsupported versions or placements, missing assignments and invalid resolved property values. Messages identify the variable, logical style export/property path and phase. Preserve existing theme diagnostic codes and native composition's first-error ordering. Do not publish partial output or invoke user getters while assembling a diagnostic.

## Capture, generated output and validation

Keep native IR as the canonical compiler representation. Extend primitive scalar capture to recognise validated local handles and fallback descriptors before browser CSS conversion. Reuse existing view/text/image property-domain rules and provenance; allow a local value only in a property whose existing scalar token domain admits it. Structured native values and nested references remain outside this slice.

The compiler emits new versioned local style plans (`crumbs.css.local-style-plan`, version `1`) containing static declarations, validated local/fallback slots, primitive/property metadata and exact local/theme dependency IDs. Existing payload tags and version meanings stay unchanged. Preserve authored composition order and resolve only effective declarations after current shorthand and last-write semantics. A shadowed missing local variable must not fail an otherwise valid final declaration.

Fully static declarations keep the current native StyleSheet path. Declarations requiring assignments are resolved through the new plan; an unresolved descriptor must not reach `StyleSheet.create` or a React Native style prop. Marked style maps and ordinary maps preserve their export names, order where semantic, and primitive output types. A map may mix static exports, existing theme-only exports and local plans.

Compilation and external/generated artifact ingress validate tag, version, identity, domains, exact fields and property compatibility. Effect 4 Schema remains at compiler/tooling boundaries using the currently pinned package. Runtime first-use admission uses bounded plain-data/domain checks and weak admission memoisation; schema traversal, compiler imports and authoring execution stay outside ordinary resolution. Use compact shared scalar/property validators where necessary so runtime and compiler have one native rule source; avoid a broad compiler/runtime refactor.

Emit new generated payloads as deeply frozen data, and copy/freeze other admitted payloads without mutating caller objects. Only fully admitted immutable inputs participate in identity caches. A mutable unknown input is checked and copied on every admission; never memoise an original mutable object as if it were the sealed clone. A duplicate-copy payload or decoded plain artifact receives structural admission in its consuming runtime; a brand, tag, freeze or prior cache entry alone cannot bypass validation. Encode canonical data deterministically in both module formats, preserve reserved export names and record local-variable dependencies in compiler metadata/manifests. Adding an unused definition must not change another definition's identity.

New local plans require the runtime version that implements this opt-in entry. Document that package minimum in packed-consumer receipts. The current existing resolvers report a diagnostic directing local-plan consumers to the new resolver; they must not silently pass a plan through as a native style. Older already-published runtimes are not claimed to understand these new payloads.

## Runtime ownership, React and caching

Resolution receives three explicit inputs: immutable styles/plans, an immutable assignment snapshot and an optional immutable theme snapshot. Validate incoming plans/snapshots once per admitted object; normal cache hits use admitted data. The same inputs return the same resolved map and export identities. Do not mutate assignments, plans, themes or previous resolved outputs.

Use weakly held object identities for shared memoisation. No process-wide strong map retains every numeric value, colour or instance snapshot. Theme absence uses one immutable internal sentinel. A hook owns only its current input/output state and the bounded comparison state needed to reuse exports. Unmount releases its subscriptions and state.

Within a mounted hook, compare the declared dependencies of each export. An assignment change affecting only one export preserves unrelated export identities; a changed unused assignment preserves the complete result identity. Theme changes re-resolve only outputs whose reached theme values change, including a terminal fallback becoming relevant after a local assignment is cleared. Switching a local branch must update the effective dependency choice coherently. First validate the next input, then publish one complete result.

The React integration uses the existing theme context/store through an optional subscription adapter. Hooks execute unconditionally; provider absence is a stable no-theme input, not a conditional Hook call. Purely local consumers need no provider. Mixed consumers observe the current existing semantic scope. Passing one assignment snapshot to two consumers deliberately shares values, while each consumer's update replaces only its own prop/input. Portal use requires explicitly passing the intended snapshot, just as ordinary component props do.

No per-frame style resolution, background service, layout subscription or additional package dependency is introduced. Preserve import boundaries and binding identity for the existing runtime entries; report any size drift from their new unsupported-plan diagnostic. Measure the new opt-in graph and the actual local resolution work; do not claim that creating snapshots inside every render is free. Document `useMemo` for prop-derived assignments and retain admission cost in first-use/update measurements.

## Verification and native reference case

The implementation is one M11.1 slice. Its plan must include:

- Type rejection for colour/opacity/length/enum mismatch, wrong primitive properties, invalid assignment keys/shape, private or legacy theme terminals, mixed fallback domains, local plans passed directly to native style props and unsupported recipe/structured placements. Verify both new declaration formats and existing cross-entry nominal relationships.
- Property-based comparison with an independent simple interpreter: local isolation; ordered first-present fallback; empty-snapshot replacement; snapshot immutability; record-order-independent assignment meaning; duplicate binding consistency; static/theme/local composition equivalence; and dependency-based output reuse. Scope codec round-trip laws to the new specified plain-data payloads, not arbitrary source programs.
- Adversarial ingress checks for missing/extra fields, invalid versions, conflicting identities, non-finite values, bounds, accessors with execution counters, symbols, cycles, sparse/decorated arrays inside descriptors, wrong prototypes, duplicate-copy admission and unsupported property values. Reachable missing theme/local values fail; shadowed or unused valid fallback dependencies do not force reads.
- Compiler controls for ordered composition, static fast paths, deterministic ESM/CJS output, exported handles/shapes, dependency metadata, source edit/removal/restore and refreshed changed definitions. Run existing scalar-property, theme, recipe and packed-consumer regression checks appropriate to the touched shared rules.
- React checks for initial no-provider local use, theme-backed fallback, provider updates, assignment clearing, sibling isolation, unchanged export identities, failure atomicity and unmount subscription cleanup. Do not infer these behaviours solely from the pure resolver tests.
- An internal Storybook/Expo reference with two independently controlled cards under one theme. Controls change literal values at human interaction frequency, clear an accent to the theme default, toggle the shared theme and demonstrate a wholly local/no-provider sample. Reuse the existing native harness and accessibility labels; no animation or new UI dependency is needed.
- Fresh packed consumer imports/types and matched iOS Simulator/Android emulator exports and interaction receipts for the new entry, with exact source/package identities. A source symlink demo alone does not establish distributable package compatibility. Physical devices and spoken-reader acceptance remain separately deferred; these examples make no device-performance or accessibility-conformance claim.
- Relevant build/type/test checks, import-graph isolation, clean-install/package reproducibility, and a bounded host cost record for snapshot admission, first resolution, unchanged hits and changed/unused assignments. Use named fixture sizes and deterministic operation/identity assertions. Preserve active M10.5 metrics and report failures explicitly rather than rebasing them to admit the feature.

## Acceptance and handoff

Accept M11.1 when its API/type, native semantic, ingress, isolation, identity, packed consumer and reference-case checks pass; relevant costs and limitations are retained; documentation and roadmap status match the observed evidence; and the implementation is committed. A host-only or synthetic receipt cannot substitute for the stated native interaction check. A blocker leaves M11.1 open with its precise reason.

Keep the authored API additive and use the current Effect 4 pin. Add no animation dependency or serialization framework. Implementers may choose private file boundaries, but any change to the public API, ownership, fallback, compatibility or qualification contract requires an explicit spec revision.

After written-spec approval, prepare the M11.1 implementation plan for review, then execute the approved method. After its implementation commit recommend M11.2 container conditions. After M11.5 return to M10.5 release qualification; none of these milestones silently waives the remaining release gate.

## References

- [Native compiler ADR](../../decisions/adopt-native-design-system-compiler.md).
- [Existing standalone/local-assignment assessment](../../assessments/2026-09-30-m11-standalone-token-assignment.md).
- [Current consumer-scope host policy evidence](../../assessments/2026-10-08-m10-5-consumer-policy-implementation.md).
- Vanilla-extract [createVar](https://vanilla-extract.style/documentation/api/create-var/), [fallbackVar](https://vanilla-extract.style/documentation/api/fallback-var/) and [assignVars](https://vanilla-extract.style/documentation/api/assign-vars/) describe the familiar browser authoring APIs. The native ownership and resolution semantics above are an explicit Crumbs design.
