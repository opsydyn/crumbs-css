# Typed component slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a serializable, primitive-aware `componentRecipe` contract with one shared variant selection and a bounded multi-slot resolver, while preserving the existing single-style `recipe` ABI.

**Architecture:** Add a focused `packages/css/src/components/` authoring module backed by a versioned component descriptor. Reuse the existing native capture path and class references, then add a shared component resolution plan that appends authored branches into frozen slot arrays without enumerating variant products. Keep the legacy `recipe` and its resolver unchanged; expose an explicit view-only adapter for migration.

**Tech Stack:** TypeScript, React Native 0.85 style domains, vanilla-extract class capture, Effect 4 internal compiler/schema boundaries, Bun test, fast-check, tsdown ESM/CommonJS builds.

**Spec:** `docs/superpowers/specs/2026-09-22-typed-component-slots-design.md`

## Global Constraints

- M7.1 adds typed slots with one shared variant selection and view/text/image-specific outputs; M7.2–M7.5 remain separate.
- Existing `recipe`, `NativeRecipe`, `NativeRecipeProps`, `NativeRecipeResolver`, payload tag, cache semantics, and output shape remain unchanged.
- Component descriptors are deeply frozen plain data with no functions, React elements, Effect values, or runtime services.
- Runtime resolution is linear in authored variants, matching branches, and declared slots; it never materialises a Cartesian product.
- `componentRecipeFromRecipe` preserves a legacy recipe's view domain and cannot relabel it as text or image.
- Effect remains an internal compiler/schema dependency; ordinary Expo/native consumers must not acquire a userland Effect import.
- Do not modify `.release-please-manifest.json`, `bun.lock`, or `packages/css/package.json` unless a later approved slice explicitly requires it.
- Android, device frame/allocation/memory qualification, visual Storybook acceptance, and performance-registry activation stay backlogged.
- Every task ends with focused verification and a commit; protected unrelated work must remain unstaged.

## Review Focus

- A branch that omits a slot must still return that slot as a frozen empty style array; pin this in Task 2 runtime tests.
- A text-only or image-only property in a different slot must be rejected statically and at the constructor boundary; pin this in Task 1 type/validation tests.
- A component with many variant values must have one shared plan/cache rather than one plan per slot or a product expansion; pin this in Task 2 and Task 5 property tests.
- A theme update must resolve token references in every slot while preserving descriptor identity for an unchanged theme; pin this in Task 3 theme tests.
- A packed CSS module must preserve the component tag, slot map, class references, and primitive capture without loading compiler or Effect code in the runtime graph; pin this in Task 4 pack/isolation tests.

---

### Task 1: Establish the component authoring contract and typed descriptor

**Files:**
- Create: `packages/css/src/native-authoring.ts`
- Create: `packages/css/src/components/index.ts`
- Modify: `packages/css/src/native-style.ts:1-12, 330-435` to use the extracted authoring helper and re-export component APIs/types
- Modify: `packages/css/src/native-tags.ts:1-8` to add `NativeComponentRecipeType` and `NativeComponentRecipeVersion`
- Modify: `packages/css/src/index.ts` to expose the additive style/root type and value exports
- Create: `packages/css/test/component-recipe-types.ts`
- Create: `packages/css/test/component-recipe-authoring.test.ts`
- Modify: `packages/css/test/public-api.test.ts` to assert the new style exports and unchanged root policy

**Interfaces:**
- Consumes: existing `NativeViewStyleInput`, `NativeTextStyleInput`, `NativeImageStyleInput`, `NativeStyleComposition`, `NativeRecipe`, `NativeRecipeProps`, `NativeRecipeVariantsConfig`, and `NativePrimitiveDomain`.
- Produces:
  - `NativeComponentSlotKind = "view" | "text" | "image"`;
  - `NativeComponentSlots`, `NativeComponentSlotStyleInput<K>`, `NativeComponentSlotStyles<TSlots>`, and `NativeComponentVariantsConfig<TSlots>`;
  - `NativeComponentRecipe<TSlots, TVariants>`;
  - `NativeComponentRecipeConfig<TSlots, TVariants>`;
  - `NativeComponentRecipeProps<TRecipe>` and `NativeComponentResolvedStyles<TSlots>`;
  - `componentRecipe(config, debugId?)`;
  - `componentRecipeFromRecipe(recipe, { slot, debugId? })`;
  - `NativeComponentRecipeType` and `NativeComponentRecipeVersion`.

- [ ] **Step 1: Write the failing type fixture and public API assertions**

Create `packages/css/test/component-recipe-types.ts` with a three-slot example and compile-time checks. The fixture must include these valid calls:

```ts
import {
  componentRecipe,
  componentRecipeFromRecipe,
  recipe,
  type NativeComponentRecipeProps,
  type NativeComponentResolvedStyles,
} from "../src/native-style"

const button = componentRecipe({
  slots: {root: "view", label: "text", icon: "image"} as const,
  base: {
    root: {paddingHorizontal: 12},
    label: {fontWeight: "700"},
    icon: {resizeMode: "contain"},
  },
  variants: {
    tone: {
      primary: {root: {opacity: 1}, label: {color: "white"}},
      quiet: {root: {opacity: 0.8}, label: {color: "black"}},
    },
  },
  defaultVariants: {tone: "primary"},
})

type ButtonProps = NativeComponentRecipeProps<typeof button>
const selection: ButtonProps = {tone: "quiet"}
const resolved: NativeComponentResolvedStyles<typeof button.slots> = {
  root: [], label: [], icon: [],
}
void [selection, resolved]

const legacy = componentRecipeFromRecipe(
  recipe({variants: {tone: {primary: {opacity: 1}}}}),
  {slot: "root"},
)
void legacy
```

Add negative assertions for `label: {resizeMode: "contain"}`, `icon: {fontWeight: "700"}`, an unknown slot key, an unknown variant selection, and a default value not present in its variant map. Update `public-api.test.ts` with the exact additive names while asserting the package root still has no runtime resolver export. Do not change protected files.

- [ ] **Step 2: Run the red type/API gate**

Run:

```bash
bun run typecheck
bun test packages/css/test/public-api.test.ts
```

Expected: failure because the component exports and descriptor types do not exist. Record the first missing symbol; do not weaken the negative fixtures.

- [ ] **Step 3: Extract the shared authoring helper**

Move the implementation currently named `authorStyle` in `packages/css/src/native-style.ts` into `packages/css/src/native-authoring.ts` as an internal function with this signature:

```ts
import type {NativePrimitiveDomain} from "./compiler/native-capture"

export function authorNativeStyle(
  rule: unknown,
  primitiveDomain: NativePrimitiveDomain,
  debugId?: string,
): string
```

Keep the existing string, composition, native-capture metadata, vanilla-extract registration, and debug-id behaviour byte-for-byte equivalent. Replace the old local calls in `style`, `viewStyle`, `textStyle`, `imageStyle`, `styleVariants`, and legacy `recipe` with `authorNativeStyle`. This extraction must not add a public package export.

- [ ] **Step 4: Implement frozen component types, constructor, and adapter**

In `packages/css/src/components/index.ts`, define the primitive mapping and implement `componentRecipe` with the following construction rules:

```ts
export type NativeComponentSlotKind = "view" | "text" | "image"

export type NativeComponentSlots = Readonly<Record<string, NativeComponentSlotKind>>

export type NativeComponentSlotStyleInput<K extends NativeComponentSlotKind> =
  K extends "view" ? NativeViewStyleInput | ViewStyle | NativeStyleComposition<NativeViewStyleInput, ViewStyle>
    : K extends "text" ? NativeTextStyleInput | TextStyle | NativeStyleComposition<NativeTextStyleInput, TextStyle>
      : NativeImageStyleInput | ImageStyle | NativeStyleComposition<NativeImageStyleInput, ImageStyle>

export type NativeComponentSlotStyles<TSlots extends NativeComponentSlots> = Partial<{
  readonly [TSlot in keyof TSlots & string]: NativeComponentSlotStyleInput<TSlots[TSlot]>
}>
```

Use a const-generic config so variant keys and values infer from the call. Validate and freeze, in order: slot names and kinds; base/variant/compound slot keys; non-empty variant maps; default selections; and compound requirement keys/values. For each slot branch call `authorNativeStyle` with exactly the declared primitive domain and debug-id segments `slot`, slot name, branch kind, and branch index. Store a new `crumbs.css.component-recipe` descriptor with version `1`, `slots`, `base`, `variants`, `defaultVariants`, and `compoundVariants`. Omit optional base fields, but emit empty frozen records for required maps.

Implement `componentRecipeFromRecipe` as a view-only wrapper: copy the legacy variant/default/compound selection maps into a one-slot component descriptor and preserve each legacy class reference without changing its domain. Reject `slot` values that are empty; do not accept a primitive-kind override.

Add runtime tests for deep freezing, deterministic key order, duplicate/unknown slot rejection, invalid defaults, the view-only adapter, and preservation of the legacy recipe's variant keys.

- [ ] **Step 5: Wire additive exports and pass the focused gate**

Re-export component values/types from `native-style.ts` and the package root's explicit lists. Add the tag/version constants to `native-tags.ts`; do not make the root expose runtime resolver functions. Run:

```bash
bun test packages/css/test/component-recipe-authoring.test.ts packages/css/test/public-api.test.ts
bun run typecheck
```

Expected: PASS with the negative type fixture included by the package typecheck. Inspect `git diff --check` and `git status --short` to confirm only Task 1 files plus the three protected pre-existing files are dirty.

- [ ] **Step 6: Commit the authoring slice**

```bash
git add packages/css/src/native-authoring.ts packages/css/src/components packages/css/src/native-style.ts packages/css/src/native-tags.ts packages/css/src/index.ts packages/css/test/component-recipe-types.ts packages/css/test/component-recipe-authoring.test.ts packages/css/test/public-api.test.ts
git commit -m "feat: add typed component recipe authoring"
```

Do not stage `.release-please-manifest.json`, `bun.lock`, or `packages/css/package.json`.

### Task 2: Add one shared component resolution plan and bounded resolver

**Files:**
- Create: `packages/css/src/runtime/component-recipe-resolution-plan.ts`
- Modify: `packages/css/src/theme-runtime.ts:15-110, 700-760` to expose component resolver types/functions
- Create: `packages/css/test/component-recipe-runtime.test.ts`

**Interfaces:**
- Consumes: `NativeComponentRecipe`, `NativeComponentRecipeProps`, `NativeComponentResolvedStyles`, and the existing canonical selection/cache helpers in `runtime/recipe-resolution-plan.ts`.
- Produces:
  - `ComponentRecipeResolutionPlan` with frozen slot order, variant order, default selection, per-slot branches, and compound matchers;
  - `createComponentRecipeResolutionPlan(recipe)`;
  - `resolveComponentRecipeResolutionPlan(plan, selection, reportInvalidVariant?)`;
  - `ComponentRecipeResolverOptions`, `NativeComponentRecipeResolver`, and resolver controls matching the legacy resolver (`plan`, `getCacheStats`, `clearCache`, `dispose`);
  - `resolveComponentRecipeStyles(recipe, selection?)`;
  - `createComponentRecipeResolver(recipe, options?)`.

- [ ] **Step 1: Write the failing resolver tests**

Use a hand-authored three-slot descriptor in `component-recipe-runtime.test.ts` and assert the exact ordered arrays:

```ts
const resolved = resolveComponentRecipeStyles(button, {tone: "quiet"})
expect(resolved.root).toEqual([{padding: 12}, {opacity: 0.8}, {borderWidth: 1}])
expect(resolved.label).toEqual([{fontWeight: "700"}, {color: "black"}])
expect(resolved.icon).toEqual([])
expect(Object.isFrozen(resolved)).toBe(true)
expect(Object.isFrozen(resolved.root)).toBe(true)
```

Cover defaults, authored variant order, compound order, omitted slots, invalid values, duplicate equivalent selections, `cacheSize: 0`, LRU eviction, `clearCache`, and disposal. Include the one-slot adapter in this runtime suite. Import the planned resolver names so the test fails before implementation.

- [ ] **Step 2: Run the focused red test**

Run:

```bash
bun test packages/css/test/component-recipe-runtime.test.ts
```

Expected: failure for missing component resolver exports. Keep the expected array order explicit; do not compare only flattened objects.

- [ ] **Step 3: Implement the shared plan**

Create `component-recipe-resolution-plan.ts` with a component plan that stores one canonical `selectionKeys` array and one `defaultSelection`. Store slot names in authored order. Each variant entry contains its name and a frozen partial slot map; each compound matcher stores frozen `[variantName, value]` requirements and a frozen partial slot map. Reuse `canonicalRecipeSelectionKey`, `createBoundedRecipeSelectionCache`, and `validateRecipeResolverCacheSize` rather than copying their algorithms.

`resolveComponentRecipeResolutionPlan` must initialise every declared slot to a mutable local array, append base styles first, then selected variant slot styles in variant order, then matching compound slot styles in compound order, and finally freeze arrays and the enclosing object. Invalid variant values call the reporter once for the offending variant and append nothing for that branch. No loop may iterate over products of variant values.

- [ ] **Step 4: Implement resolver controls and pass runtime tests**

Add the one-shot and bounded resolver functions to `theme-runtime.ts`. The bounded resolver must canonicalise the whole selection once, return the cached frozen slot map on a hit, use the same `0..1024` cache validation as recipes, and throw `Component recipe resolver has been disposed` after disposal. Reuse the existing diagnostic formatter with a component-specific target name.

Run:

```bash
bun test packages/css/test/component-recipe-runtime.test.ts
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit the resolver slice**

```bash
git add packages/css/src/runtime/component-recipe-resolution-plan.ts packages/css/src/theme-runtime.ts packages/css/test/component-recipe-runtime.test.ts
git commit -m "feat: add shared component recipe resolver"
```

### Task 3: Integrate component descriptors with theme resolution

**Files:**
- Modify: `packages/css/src/theme-runtime.ts:440-485, 800-925` for resolved-style typing, component token walking, and component tag recognition
- Modify: `packages/css/src/theme-core.ts` only if the lean resolver re-export requires a pure component token path; keep advanced component resolver APIs out of `theme/core`
- Create: `packages/css/test/component-recipe-theme.test.ts`
- Modify: `packages/css/test/theme-entrypoint-policy.test.ts` if exact API sets need additive advanced names

**Interfaces:**
- Consumes: `NativeComponentRecipe`, `NativeComponentRecipeProps`, `NativeComponentResolvedStyles`, and existing `resolveThemeTokens`, `resolveThemeStyles`, and theme cache helpers.
- Produces: `resolveThemeTokens(componentRecipe, theme)` returning a component descriptor of the same generic type; `ResolvedThemeStyles` mapping component descriptors to resolved component descriptors; unchanged lean `theme/core` API names.

- [ ] **Step 1: Write failing token-resolution and identity tests**

Create a component descriptor with token references in the root, label, icon, variant, and compound branches. Assert that every token is replaced, the original descriptor remains unchanged, and repeated resolution under the same theme returns the same descriptor object. Assert that a theme with no referenced token changes returns the original descriptor identity.

```ts
const resolved = resolveThemeTokens(button, theme)
expect(resolved.base?.root).toEqual({backgroundColor: "#2463eb"})
expect(resolved.variants.tone.primary.label).toEqual({color: "#ffffff"})
expect(resolved).toBe(resolveThemeTokens(button, theme))
expect(button.base?.root).toEqual({backgroundColor: tokenReference})
```

Add a `useThemedStyles` type assertion for `NativeComponentRecipe` and a policy assertion that `createComponentRecipeResolver` is not added to `theme/core`.

- [ ] **Step 2: Run the red theme test**

```bash
bun test packages/css/test/component-recipe-theme.test.ts packages/css/test/theme-entrypoint-policy.test.ts
```

Expected: component descriptors are currently treated as ordinary records or lack the resolved-style type branch.

- [ ] **Step 3: Add component-aware token resolution**

Add an `isNativeComponentRecipe` guard and a sibling to `resolveRecipeThemeTokens` that walks base slot records, every variant slot record, and every compound `styles` record. Preserve descriptor identity when all nested values are unchanged; otherwise create and freeze a new descriptor while retaining `slots`, tag, version, debug name, defaults, and selection maps. Keep the existing token resolution cache key/lifetime rules.

Extend `ResolvedThemeStyles<TStyles>` with a component conditional branch before the generic nested-record branch. The branch must preserve `TSlots`/`TVariants` and must not change the existing recipe/sprinkles inference. If `theme/core` would pull the advanced resolver plan into its graph, factor the pure descriptor walker into `runtime/component-recipe-theme.ts` and import that module directly from the lean entrypoint.

- [ ] **Step 4: Pass theme and entrypoint tests**

Run:

```bash
bun test packages/css/test/component-recipe-theme.test.ts packages/css/test/theme-entrypoint-policy.test.ts packages/css/test/theme-resolution-cache.test.ts
bun run typecheck
```

Expected: PASS, with `theme/core` retaining its exact lean API list and no compiler/Effect import.

- [ ] **Step 5: Commit the theme slice**

```bash
git add packages/css/src/theme-runtime.ts packages/css/src/theme-core.ts packages/css/src/runtime/component-recipe-theme.ts packages/css/test/component-recipe-theme.test.ts packages/css/test/theme-entrypoint-policy.test.ts
git commit -m "feat: resolve component recipe theme tokens"
```

Only include `component-recipe-theme.ts` if the implementation creates it; never stage protected files.

### Task 4: Qualify compiler emission, primitive capture, and packed consumers

**Files:**
- Inspect: `packages/css/src/compiler/export-ownership.ts` and preserve its generic nested class-reference traversal
- Inspect: `packages/css/src/compiler/code-emission.ts` and preserve its deterministic plain-record recursion
- Inspect: `packages/css/src/export-values.ts` and preserve its cyclic/accessor/symbol checks
- Modify: `packages/css/src/native-authoring.ts` or `packages/css/src/components/index.ts` to include slot names in debug identifiers used by native diagnostics
- Create: `packages/css/test/component-recipe-compiler.test.ts`
- Modify: `packages/css/test/pack-consumer-contract.test.ts`
- Modify: `packages/css/test/runtime-isolation.test.ts` only for an additive component runtime assertion

**Interfaces:**
- Consumes: compiled `.css.ts` modules using `componentRecipe`, existing transformer/export capture, and the Task 3 descriptor walker.
- Produces: packed ESM/CommonJS modules whose component export contains the tag, frozen slot map, class references, and native style output; diagnostics identify a failing component slot path where the existing compiler admission reports a property error.

- [ ] **Step 1: Write a compile/emission fixture and packed consumer checks**

Create a temporary `.css.ts` source in the test using `componentRecipe` with view, text, and image branches, a token reference, a composition, a compound branch, and a deliberately invalid primitive value behind `as never`. Compile it through the same helper used by existing native IR tests. Assert:

```ts
expect(exports.button.$$type).toBe("crumbs.css.component-recipe")
expect(exports.button.slots).toEqual({root: "view", label: "text", icon: "image"})
expect(exports.button.variants.tone.primary.label).toEqual({color: "#fff"})
expect(String(error)).toContain("button.label")
```

Extend the packed type/runtime consumer source to import `componentRecipe`, `NativeComponentRecipeProps`, `createComponentRecipeResolver`, and `resolveThemeTokens` from the published tarball. Exercise both ESM and CommonJS paths. Keep the existing public export assertions exact apart from the approved additive names.

- [ ] **Step 2: Run the red compiler/pack gate**

```bash
bun test packages/css/test/component-recipe-compiler.test.ts packages/css/test/pack-consumer-contract.test.ts
```

Expected: failure until capture/emission and packed types understand the descriptor.

- [ ] **Step 3: Preserve generic data admission and add only focused tag/path handling**

Update the smallest boundary that fails. The component tag must be emitted as ordinary deterministic data, class references must continue through `NativeRecipeClassSymbol`, and descriptor validation must retain the existing rejection of cycles, accessors, sparse arrays, non-finite numbers, and unknown symbol markers. Add slot segments to debug identifiers before class authoring so native IR diagnostics include the component export/slot context without changing legacy recipe identifiers.

Do not add an alternate serializer or an automatic legacy fallback. If generic capture/emission already passes, leave those production files untouched and record that no special case was required in the test evidence.

- [ ] **Step 4: Run packed and isolation qualification**

```bash
bun test packages/css/test/component-recipe-compiler.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts
bun run build
bun run typecheck
```

Expected: ESM/CommonJS packed consumers resolve the component descriptor, and runtime graph checks show no compiler-only or Effect import in `theme`/`theme-core` ordinary paths.

- [ ] **Step 5: Commit the compiler/consumer slice**

```bash
git add packages/css/src/compiler/export-ownership.ts packages/css/src/compiler/code-emission.ts packages/css/src/export-values.ts packages/css/src/native-authoring.ts packages/css/src/components/index.ts packages/css/test/component-recipe-compiler.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts
git commit -m "test: qualify component recipe artifacts"
```

Stage only files actually changed by the focused implementation; the command is illustrative and protected files remain excluded.

### Task 5: Add independent property laws and linearity evidence

**Files:**
- Create: `packages/css/test/component-recipe-runtime.property.test.ts`
- Create: `packages/css/test/component-recipe-resolution-plan.test.ts`
- Modify: `packages/css/test/recipe-runtime.property.test.ts` only if a shared generator helper can be extracted without changing legacy assertions

**Interfaces:**
- Consumes: the frozen component descriptor and shared plan/resolver from Tasks 1–2.
- Produces: seeded fast-check evidence that the component resolver agrees with an independent evaluator, preserves deterministic selection identity, and does not expand variant products.

- [ ] **Step 1: Define the independent generator and reference evaluator**

Generate 1–4 slots from the three primitive kinds, 0–4 variants, 1–3 values per variant, default selections, optional branch styles, and 0–5 compound requirements. Keep the evaluator independent from `createComponentRecipeResolutionPlan`: merge defaults, walk variant entries, and append matching slot styles directly from the authored input. Use fixed seeds and bounded `numRuns` matching existing recipe property tests.

- [ ] **Step 2: Add resolver equivalence and determinism laws**

For every generated case assert:

```ts
expect(createComponentRecipeResolver(recipe, {cacheSize: 8})(selection))
  .toEqual(referenceResolve(recipe, selection))
expect(resolver(selection)).toBe(resolver({...selection}))
expect(resolveComponentRecipeStyles(recipe, selection)).toEqual(resolver(selection))
```

Also assert frozen slot arrays, type-sensitive invalid variant handling, and identical output for equivalent object insertion order.

- [ ] **Step 3: Add non-Cartesian plan-size law**

For each generated recipe count authored slot branches and variant values. Assert that the plan stores exactly the authored variant/slot branches and that its branch count is no greater than the authored branch count plus compounds; it must not equal or grow with the product of value counts. Add a fixed regression with three variants of four values each and three slots.

- [ ] **Step 4: Run the property gate and commit**

```bash
bun test packages/css/test/component-recipe-runtime.property.test.ts packages/css/test/component-recipe-resolution-plan.test.ts
git diff --check
git add packages/css/test/component-recipe-runtime.property.test.ts packages/css/test/component-recipe-resolution-plan.test.ts
git commit -m "test: qualify component recipe laws"
```

Expected: seeded property tests pass without increasing the legacy recipe property test's generator or runtime contract.

### Task 6: Document M7.1 and run full qualification

**Files:**
- Create: `docs/assessments/2026-09-22-m7-1-component-slots.md`
- Modify: `docs/roadmap.md` M7.1 ledger and dated implementation evidence
- Modify: `docs/src/content/docs/reference/package-entrypoints-and-apis.mdx` with the public component recipe example and resolver guidance
- Create: `docs/src/content/docs/how-to/use-component-recipes.mdx` only if the reference page would otherwise become a long tutorial
- Modify: `packages/css/test/public-api.test.ts` or docs navigation only if the final public names require an additive assertion

**Interfaces:**
- Consumes: all qualified APIs and test evidence from Tasks 1–5.
- Produces: an evidence-led M7.1 assessment that distinguishes focused/full checks from device, visual, Android, and performance-registry gates; roadmap status and consumer docs that match the shipped API.

- [ ] **Step 1: Write the assessment from observed evidence**

Record the descriptor tag/version, slot/type contract, resolver/cache semantics, adapter boundary, compiler/pack qualification, property-test seed/run counts, and exact commands. State explicitly that device frame/allocation/memory, visual Storybook, performance registry, and Android remain incomplete. Do not claim Effect is a userland dependency.

- [ ] **Step 2: Update the roadmap and public API docs**

Mark only M7.1 complete. Add the next recommendation as **M7.2** (exhaustive discriminated states and prohibited combinations), while keeping Android/device work backlogged. Show a concise component example with one shared selection and typed `root`, `label`, and `icon` outputs. Document `componentRecipeFromRecipe` as a view-only migration path.

- [ ] **Step 3: Run all required checks**

Run sequentially because build outputs are shared:

```bash
bun run check
bun run docs:build
bun run budgets:validate
git diff --check
git status --short
```

Expected: package build, typecheck, and tests pass; docs build passes; budgets remain structurally valid with device/performance thresholds reported as not run where the harness is unavailable; only the three protected files may remain dirty after the final commit.

- [ ] **Step 4: Commit documentation and qualification evidence**

```bash
git add docs/assessments/2026-09-22-m7-1-component-slots.md docs/roadmap.md docs/src/content/docs/reference/package-entrypoints-and-apis.mdx docs/src/content/docs/how-to/use-component-recipes.mdx packages/css/test/public-api.test.ts
git commit -m "docs: qualify M7.1 component slots"
```

Omit any file that did not change; never stage protected release-version files.

## Final handoff

After Task 6, perform a fresh `git status --short`, confirm every task commit, and report the exact focused/full qualification results. Recommend **M7.2** as the next roadmap slice. Android and device-dependent work remains the final backlog item as previously agreed.
