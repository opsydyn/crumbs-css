# M7.1 typed component slots design

**Status:** Proposed — the conversational design is approved; written-spec review is pending.

**Roadmap:** [M7.1](../../roadmap.md) — add typed slots with one shared variant selection and view/text/image-specific outputs while preserving the existing single-style recipe interface.

**Governing decisions:** D9 (component styling contracts), D12 (native/runtime qualification boundaries), and the native compiler/runtime architecture in the [design-system ADR](../../decisions/adopt-native-design-system-compiler.md).

## Intent

Crumbs currently exposes `recipe`, a serializable single-style recipe whose
branches are captured for the view primitive. Design-system components need a
single style owner for a root view, label text, and image/icon slots while
keeping one shared variant/default/compound selection space. The component
contract must be safe to export through the existing CSS-module pipeline,
cheap to resolve at runtime, and precise enough for TypeScript to reject a
text-only property in a view slot.

The new contract is additive. Existing `recipe` declarations, their payload
tag, resolver, cache semantics, and output shape remain valid. Migration is
explicit so a legacy recipe cannot silently be treated as a text or image
recipe.

## Goals

- Declare named slots with the primitive kind `view`, `text`, or `image`.
- Share one inferred variant selection type, default map, and compound matcher
  set across all slots.
- Type every slot branch against its declared primitive and return a slot map
  whose values retain the corresponding React Native style type.
- Keep component descriptors immutable, plain-data, versioned, and compatible
  with native export capture, theme-token resolution, and packed consumers.
- Resolve one selection through one bounded cache and one shared plan without
  expanding the Cartesian product of variant values.
- Provide an explicit one-slot adapter for existing view recipes.
- Keep the ordinary Expo/native runtime free of Effect imports; Effect remains
  an internal compiler/schema dependency.

## Non-goals for M7.1

M7.1 does not define exhaustive state unions or prohibited combinations
(M7.2), public/private contract metadata or extension precedence (M7.3–M7.4),
behaviour/accessibility ownership (M7.5), consumer override policy, manifest
diffing, visual Storybook acceptance, device frame/allocation qualification, or
Android acceptance. Those remain separately gated roadmap work.

## Chosen API shape

The authoring entrypoint adds `componentRecipe` and the migration helper
`componentRecipeFromRecipe` to `@opsydyn/crumbs-css/style`. Runtime consumers
use `createComponentRecipeResolver` and the one-shot
`resolveComponentRecipeStyles` from `@opsydyn/crumbs-css/theme`.

The public authoring shape is:

```ts
const button = componentRecipe({
  slots: {
    root: "view",
    label: "text",
    icon: "image",
  },
  base: {
    root: { minHeight: 44, paddingHorizontal: 16 },
    label: { fontWeight: "700" },
  },
  variants: {
    tone: {
      primary: {
        root: { backgroundColor: tokens.color.action },
        label: { color: tokens.color.onAction },
      },
      quiet: {
        root: { backgroundColor: tokens.color.surface },
        label: { color: tokens.color.text },
      },
    },
  },
  defaultVariants: { tone: "primary" },
  compoundVariants: [
    {
      variants: { tone: "quiet" },
      styles: { root: { borderWidth: 1 } },
    },
  ],
}, "button")

type ButtonProps = NativeComponentRecipeProps<typeof button>

const resolveButton = createComponentRecipeResolver(button)
const styles = resolveButton({ tone: "primary" })
// styles.root:  ReadonlyArray<ViewStyle>
// styles.label: ReadonlyArray<TextStyle>
// styles.icon:  ReadonlyArray<ImageStyle>
```

`slots` is the primitive authority. `base`, each variant branch, and each
compound branch are partial records keyed by declared slot names. An omitted
slot has no additional branch style, but every declared slot is present in a
resolved result with its correctly typed readonly style array. Compound
branches use `styles` because they contain a slot map; existing single-style
recipes retain their `style` field.

The migration path is deliberately visible:

```ts
const legacyButton = recipe({
  variants: { tone: { primary: { opacity: 1 } } },
})

export const button = componentRecipeFromRecipe(legacyButton, {
  slot: "root",
})
```

The adapter preserves the legacy recipe's view-domain capture and selection
semantics. It cannot relabel the payload as a text or image slot. Components
that need those domains author the slot branches through `componentRecipe`.

## Type contract

`NativeComponentSlotKind` is the closed union `"view" | "text" | "image"`.
The slot map is inferred from a `const` object, and mapped types derive:

- `NativeComponentSlotStyleInput<"view" | "text" | "image">` from the
  existing primitive-specific static inputs and their supported compositions;
- `NativeComponentSlotStyles<TSlots>`, a partial slot map used by `base`,
  variant values, and compound styles;
- `NativeComponentVariantsConfig<TSlots>`, whose values are slot maps but whose
  keys form one shared variant selection space;
- `NativeComponentRecipeProps<TRecipe>`, which is the same key/value selection
  model for every slot; and
- `NativeComponentResolvedStyles<TSlots>`, which maps each slot kind to a
  readonly array of `ViewStyle`, `TextStyle`, or `ImageStyle`.

Unknown slots, misspelled primitive kinds, unsupported primitive properties,
unknown variant values, and invalid default selections are rejected by the
authoring types. Constructor validation repeats structural checks at runtime
because compiled or JavaScript callers do not receive TypeScript checking.
Existing primitive helper references retain their current result types; a
component branch never widens a declared slot to the all-primitive `NativeStyle`
result.

The existing `NativeRecipe`, `NativeRecipeProps`, and `NativeRecipeResolver`
types are unchanged. New tags and type names are additive and are exported
from the style/theme entrypoints only; the package root remains a diagnostics
and Metro integration surface.

## Serializable data model

The constructor emits a deeply frozen descriptor with a new tag and version,
for example `crumbs.css.component-recipe` and version `1`. Its data contains
the slot-kind map, a partial base slot map, ordered variant records, default
selection, and ordered compound records. Branch values are the same native
class references already emitted by `authorStyle`; no functions, React
elements, Effect values, or runtime services are stored in the descriptor.

The existing export capture and code emitter already recurse through plain
records and class references. M7.1 adds focused recognition for the component
tag where runtime/theme code needs it, while preserving deterministic key
ordering and the current reserved metadata export. A malformed tag, version,
slot map, or branch record fails closed with the existing structured
compatibility diagnostics rather than falling back to CSS or silently dropping
a slot.

## Resolution and data flow

`createComponentRecipeResolver` builds one component resolution plan. The plan
precomputes authored variant order, canonical selection keys, default values,
compound matchers, and per-slot branch references. For a selection it:

1. merges defaults with the caller selection;
2. walks authored variant order once, appending a matching branch to the
   relevant slot array;
3. walks compound matchers in authored order, appending matching slot styles;
4. freezes each slot array and the enclosing result map; and
5. stores or returns the result using the existing bounded LRU controls.

The work is linear in authored variants, matching branch count, and declared
slots. It does not enumerate all variant products. Equivalent selections use
the same canonical key and, when retained, the same result identity. Cache
capacity, `clearCache`, `dispose`, and post-disposal errors follow the
existing recipe resolver contract.

The one-shot resolver performs the same plan evaluation without retaining a
selection cache. `resolveComponentRecipeStyles` is the direct analogue of
`resolveRecipeStyle`.

Theme resolution recognises the component tag and recursively resolves token
references in every base, variant, and compound slot branch. If no token value
changes, it preserves the descriptor identity. A changed theme produces a
fresh frozen descriptor and leaves the original immutable, matching existing
recipe/theme behaviour.

## Primitive capture and compiler boundary

Each inline branch is captured with the declared slot primitive domain rather
than the legacy recipe's fixed view domain. The component authoring module
reuses the existing capture and `authorStyle` path; it does not add a second
CSS serializer or a parallel native IR. Existing compiler admission remains
the final property/value oracle, so properties unsupported by React Native or
by a declared primitive fail with the established diagnostics.

The explicit migration adapter wraps already-captured legacy class references
without changing their domain. New component branches use the slot-specific
authoring input and preserve primitive provenance through native emission.
The compiler must retain slot paths in diagnostics (for example,
`button.label.color`) so a large component contract can be debugged without
inspecting generated class names.

## Error and compatibility policy

- Empty or duplicate slot names, unknown slot keys, invalid kinds, malformed
  variant records, and invalid defaults throw a descriptive `TypeError` at
  construction.
- A malformed compiled component payload reports the existing structured
  compatibility diagnostic with its export/slot path and does not partially
  resolve.
- An invalid runtime selection follows the existing recipe policy: development
  diagnostics name the component, variant, selected value, and supported
  values; the invalid branch is skipped and other slots remain deterministic.
- A missing branch is an intentional empty contribution, not an invalid
  payload. The resolved map still includes the declared slot.
- `recipe` and its current payload tag remain supported without an automatic
  legacy/new fallback. Only the named adapter converts a legacy recipe to the
  new component contract.

## Testing and acceptance

M7.1 is complete when the following are covered:

- positive and negative type fixtures for view/text/image slot inputs, shared
  variant props, defaults, compounds, and resolved output types;
- focused runtime tests for branch order, missing slot branches, invalid
  selections, frozen output, cache identity, cache bounds, disposal, and the
  one-slot legacy adapter;
- a seeded property test comparing the component resolver with an independent
  slot-by-slot reference evaluator across generated variant maps, selections,
  and compound requirements;
- a property assertion that plan/descriptor size grows with authored branches,
  not with the Cartesian product of variant values;
- theme-token resolution tests across every slot and identity preservation for
  unchanged themes;
- compiler/emission tests proving primitive capture and slot-path diagnostics;
- public style/theme API, ESM/CommonJS pack-consumer, and runtime-isolation
  tests proving that ordinary native consumers do not load compiler-only or
  Effect modules; and
- documentation and roadmap evidence naming M7.1 as shipped while retaining
  the explicit performance-registry, device, visual, and Android gates.

No device frame, allocation, memory-retention, or Android acceptance claim is
made by this slice. Those gates remain backlogged until the approved Expo and
device harnesses are available.

## Alternatives rejected

Overloading `recipe` with a second slots form would make the most-used API
carry two payload contracts and would complicate inference, tag handling,
theme resolution, and future state/extension semantics. Composing one
independent recipe per slot would permit variant/default drift and require a
second contract to prove shared selection; it would also create one plan and
cache per slot. A separate descriptor preserves the old ABI, gives the
component one selection plan, and leaves room for M7.2–M7.4 to extend the
contract without changing the legacy recipe.

## Delivery boundaries

The implementation plan may touch `packages/css/src/components/`, the native
tag and public style/theme exports, the theme runtime, the compiler's focused
component traversal, and new component/type/runtime/pack tests. It may update
the package API documentation, the M7.1 assessment, and the roadmap ledger.
It must not alter protected release-version files, introduce an Effect
userland import, add state/extension APIs, or claim device/Android
qualification.
