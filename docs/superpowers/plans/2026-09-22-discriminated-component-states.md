# M7.2 Discriminated Component States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add typed exhaustive state constraints to component recipes, validate them in native runtime artifacts, and reject prohibited combinations without generating variant products.

**Architecture:** Extend componentRecipe with one discriminant and finite per-case constraints over its existing variant axes. Derive a TypeScript union and encode the constraints in descriptor v2; keep descriptor v1 readable. Normalize defaults once, check only the selected case, and apply variants/compounds only when that normalized selection satisfies the case.

**Tech Stack:** TypeScript 7 native preview, Bun test, fast-check, React Native style types, vanilla-extract compiler capture, tsdown ESM/CommonJS builds.

**Spec:** docs/superpowers/specs/2026-09-22-discriminated-component-states-design.md

## Global Constraints

- The extension stays inside componentRecipe; existing independent variants, slot styles, compound variants, and componentRecipeFromRecipe remain available.
- The feature stores finite constraints and checks one normalized selection; it must not enumerate every possible variant product.
- Apply defaults before runtime state checks; a prohibited runtime selection returns base-only slot styles and reports a development diagnostic.
- Newly authored component recipes emit descriptor version 2; the runtime continues to read v1 descriptors and rejects unknown versions.
- Effect remains internal; do not add Effect imports to ordinary consumers or the React Native runtime.
- Preserve the existing authored base/variant/compound order, bounded resolver cache, cache controls, and non-stateful component-recipe behavior.
- Do not modify .release-please-manifest.json, bun.lock, or packages/css/package.json.
- Do not claim device frame/allocation/memory qualification, visual Storybook acceptance, performance-registry activation, or Android acceptance.
- Each task ends with its focused checks and one commit. After each commit, report the evidence and recommend the next task; wait for the user's approval before continuing.

## File Structure

- packages/css/src/native-tags.ts: current component descriptor version and the supported legacy version.
- packages/css/src/components/index.ts: state constraint authoring/config types, state-derived selection union, descriptor field, constructor validation, and frozen metadata.
- packages/css/src/runtime/component-recipe-resolution-plan.ts: v1/v2 validation, one normalized state check, and base-only resolution for prohibited selections.
- packages/css/src/theme-runtime.ts: preserve v1/v2 metadata during token resolution and emit the deduplicated invalid-state diagnostic.
- packages/css/src/native-style.ts: export the new authoring type through the style entrypoint without widening the root/runtime surface.
- packages/css/test/component-recipe-types.ts and component-recipe-authoring.test.ts: compile-time and constructor-boundary contract tests.
- packages/css/test/component-recipe-runtime.test.ts and component-recipe-resolution-plan.test.ts: version, normalization, prohibited-state, output-order, and plan-shape tests.
- packages/css/test/component-recipe-runtime.property.test.ts: independent state-aware reference evaluation and deterministic size laws.
- packages/css/test/component-recipe-theme.test.ts, component-recipe-compiler.test.ts, pack-consumer-contract.test.ts, runtime-isolation.test.ts, and public-api.test.ts: theme, compilation, distribution, isolation, and export evidence.
- docs/src/content/docs/reference/package-entrypoints-and-apis.mdx: public state-recipe example and runtime behavior.
- docs/assessments/2026-09-22-m7-2-discriminated-component-states.md and docs/roadmap.md: evidence record and M7.2 status/next item after qualification.

## Review Focus

- Missing or extra discriminator cases, an unknown constrained axis, or empty/duplicate/unknown allowed values must fail at the authoring boundary; pin these in Task 1's constructor tests.
- A default state whose normalized defaults violate its own constraints must fail during construction; pin this in Task 1's default tests and type fixture.
- A boolean discriminator must map the authored "true"/"false" cases to true/false selection types; pin both valid and invalid assignments in Task 1's type fixture.
- A v1 descriptor must preserve old resolution behavior while malformed v2 records and unknown versions fail closed; pin both versions in Task 1's plan tests and Task 3's packed consumers.
- An invalid state must preserve only base slot styles and skip every variant and compound style, with one deduplicated development diagnostic; pin this in Task 1's runtime tests.

---

### Task 1: Add the v2 state contract and fail-closed runtime resolution

**Files:**
- Modify: packages/css/src/native-tags.ts
- Modify: packages/css/src/components/index.ts
- Modify: packages/css/src/native-style.ts
- Modify: packages/css/src/runtime/component-recipe-resolution-plan.ts
- Modify: packages/css/src/theme-runtime.ts
- Modify: packages/css/test/component-recipe-types.ts
- Modify: packages/css/test/component-recipe-authoring.test.ts
- Modify: packages/css/test/component-recipe-runtime.test.ts
- Modify: packages/css/test/component-recipe-resolution-plan.test.ts
- Modify: packages/css/test/component-recipe-theme.test.ts
- Modify: packages/css/test/component-recipe-compiler.test.ts
- Modify: packages/css/test/public-api.test.ts

**Interfaces:**
- Consumes: M7.1 NativeComponentRecipeConfig, NativeComponentRecipeProps, NativeComponentRecipeDescriptor, createComponentRecipeResolutionPlan, and the existing bounded resolver.
- Produces: NativeComponentRecipeVersion = 2, an internal v1 legacy-version constant, stateVariants in v2 descriptors, a NativeComponentStateVariants<TVariants> type on the style surface, state-derived NativeComponentRecipeProps, and one-time runtime validation before variant/compound resolution.
- Internal plan data stores the discriminator and authored state cases as finite records:

```ts
type ComponentRecipeStateConstraint = {
  readonly discriminator: string
  readonly cases: ReadonlyArray<{
    readonly value: string
    readonly constraints: ReadonlyArray<readonly [string, ReadonlyArray<string | boolean>]>
  }>
}
```

Add an optional readonly stateConstraint: ComponentRecipeStateConstraint field to the existing ComponentRecipeResolutionPlan<TRecipe>. Keep every current plan field unchanged.

The cases are authored records, not generated selection combinations.

- [ ] **Step 1: Add compile-time examples for state constraints**

Extend packages/css/test/component-recipe-types.ts with the ready/loading/disabled example from the spec. Prove that {tone: "quiet"} uses the default ready state and that {status: "loading", busy: true} is accepted. Add @ts-expect-error examples for loading with the quiet tone, loading without its required busy: true, a missing/extra state case, two discriminator entries in stateVariants, an unknown constrained axis, an unknown allowed value, and a boolean discriminator assigned with a dependent value prohibited by that boolean case.

```ts
const constrainedButton = componentRecipe({
  slots: {root: "view"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}},
    busy: {false: {root: {opacity: 1}}, true: {root: {opacity: 0.7}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
  },
  defaultVariants: {status: "ready", busy: false, tone: "primary"},
  stateVariants: {
    status: {
      ready: {busy: [false], tone: ["primary", "quiet"]},
      loading: {busy: [true], tone: ["primary"]},
    },
  },
})

type ConstrainedButtonProps = NativeComponentRecipeProps<typeof constrainedButton>
const defaultReady: ConstrainedButtonProps = {tone: "quiet"}
const explicitLoading: ConstrainedButtonProps = {status: "loading", busy: true}
// @ts-expect-error loading only permits the primary tone
const prohibitedTone: ConstrainedButtonProps = {status: "loading", busy: true, tone: "quiet"}
```

- [ ] **Step 2: Run typecheck and observe the expected missing-contract failures**

Run: bun run typecheck

Expected: the state fixture fails because stateVariants is not yet accepted and because the current flat selection type does not reject prohibited combinations. Keep the @ts-expect-error assertions; do not weaken them to make the current API pass.

- [ ] **Step 3: Add authoring-boundary failures before changing the constructor**

Extend component-recipe-authoring.test.ts with cases for missing and extra state cases, multiple discriminator entries, unknown discriminator/constrained axes, empty and duplicate allowed-value tuples, values absent from a variant, missing default discriminator/default-constrained values, and defaults prohibited by their declared default state. Assert descriptive TypeError messages. Also assert that a valid state descriptor and all nested case/allowed-value records are frozen.

Use a valid base config and change one condition per assertion, for example:

```ts
expect(() => componentRecipe({
  slots: {root: "view"},
  variants: {status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}}},
  defaultVariants: {status: "ready"},
  stateVariants: {status: {ready: {}, loading: {unknown: ["x"]}}},
} as never)).toThrow(/unknown constrained variant "unknown"/)
```

- [ ] **Step 4: Add runtime plan and resolver regressions for v1, valid v2, and prohibited v2 selections**

In component-recipe-resolution-plan.test.ts, hand-author v1 and v2 plain descriptors. Assert that v1 still creates a plan, v2 indexes exactly the authored state cases/constraints, malformed/missing/extra v2 cases throw before resolution, and version 3 throws as unsupported. In component-recipe-runtime.test.ts, use a descriptor with base, discriminator, dependent variant, and a matching compound. Assert the valid selection retains base/variant/compound order; a prohibited combination and an unknown discriminator return base-only arrays for every slot and do not append any compound style.

Capture console.warn only around the concrete invalid-selection calls, restore it in finally, and assert the dedicated invalid-state message is emitted once for repeated equivalent invalid selections. Add a valid v2 recipe with no constraints and prove it resolves like M7.1.

In component-recipe-theme.test.ts, verify a token-changing v1 descriptor stays v1, a token-changing v2 descriptor stays v2 and preserves its state map, unchanged descriptors preserve identity, and version 3 is rejected. Update the existing unsupported-version assertion from 2 to 3.

Update the existing component-recipe-compiler.test.ts fixture result type and assertion to expect version 2 for newly authored componentRecipe descriptors. Keep hand-authored v1 descriptors in legacy runtime fixtures.

- [ ] **Step 5: Run the new authoring and runtime tests to verify their red state**

Run:

```bash
bun test packages/css/test/component-recipe-authoring.test.ts packages/css/test/component-recipe-runtime.test.ts packages/css/test/component-recipe-resolution-plan.test.ts
```

Expected: constructor tests fail because invalid state declarations are accepted, and v2 runtime tests fail because the current plan rejects v2 or ignores state constraints. Existing v1 assertions may pass; keep each new failure tied to the intended state behavior.

- [ ] **Step 6: Implement descriptor v2, state typing, authoring validation, and state-aware resolution**

In native-tags.ts, retain a named internal v1 compatibility value and make NativeComponentRecipeVersion equal 2 without adding the legacy value to the public runtime exports. Update component types so v1 and v2 descriptors are readable, while the authoring constructor emits v2. Define NativeComponentStateVariants<TVariants> as a one-discriminator union whose case keys exactly cover that variant's values; case records map sibling variant names to non-empty readonly tuples of allowed values. Add stateVariants to the config/descriptor, derive one selection-union member per authored case, make the default case discriminator optional, require non-default discriminators, and require a constrained value when the case does not admit its default. Map authored boolean case keys "true" and "false" to boolean literals in the selection union. Do not distribute over every product of the unconstrained variant axes.

In the constructor, validate exact case coverage against the discriminator's variant values; validate every axis/value tuple and the default selection; then clone/freeze the plain-data state map before returning. Perform these checks before authoring any vanilla-extract styles so invalid declarations cannot leave partially registered styles.

In the resolution plan, accept versions 1 and 2, treat a v1 or unconstrained v2 descriptor as the existing contract, and index v2 state cases without enumerating products. Merge defaults once. Before looping through variants or compounds, validate the normalized selection against its selected case. For a prohibited state, return the already-collected base-only frozen slot arrays. Route one invalid-state callback through theme-runtime.ts using the existing recipe-variant diagnostic code and deduplicate by component plus normalized selection. Keep the existing single-axis invalid-value behavior unchanged when the state contract itself is valid.

Update theme-token resolution to accept v1/v2 and preserve the incoming descriptor version. When a token changes, copy and freeze stateVariants unchanged; when none changes, preserve descriptor identity. Reuse the existing runtime diagnostics rather than adding a dependency or an Effect import.

Use this resolver order so invalid states cannot leak partial variant or compound styling:

```ts
const selected = {...plan.defaultSelection, ...selection}
const collected = collectBaseSlotStyles(plan)
if (plan.stateConstraint !== undefined && !matchesSelectedState(plan.stateConstraint, selected)) {
  reportInvalidState?.(plan.stateConstraint.discriminator, selected, plan.stateConstraint.cases)
  return freezeCollectedSlotStyles(plan.slotOrder, collected)
}
appendSelectedVariantStyles(plan, selected, collected)
appendMatchingCompoundStyles(plan, selected, collected)
return freezeCollectedSlotStyles(plan.slotOrder, collected)
```

The internal reporter receives the discriminator, normalized selection, and authored case names. Keep the public resolver return type and cache-control surface unchanged.

- [ ] **Step 7: Run the focused type, authoring, runtime, plan, and theme tests**

Run:

```bash
bun run typecheck
bun test packages/css/test/component-recipe-authoring.test.ts packages/css/test/component-recipe-runtime.test.ts packages/css/test/component-recipe-resolution-plan.test.ts packages/css/test/component-recipe-theme.test.ts packages/css/test/component-recipe-compiler.test.ts packages/css/test/public-api.test.ts
```

Expected: all type fixtures pass, v1 descriptors keep their old behavior, v2 stateful descriptors enforce defaults and prohibited combinations, and non-stateful recipes retain their prior output/order/cache behavior.

- [ ] **Step 8: Commit the end-to-end state contract**

```bash
git add packages/css/src/native-tags.ts packages/css/src/components/index.ts packages/css/src/native-style.ts packages/css/src/runtime/component-recipe-resolution-plan.ts packages/css/src/theme-runtime.ts packages/css/test/component-recipe-types.ts packages/css/test/component-recipe-authoring.test.ts packages/css/test/component-recipe-runtime.test.ts packages/css/test/component-recipe-resolution-plan.test.ts packages/css/test/component-recipe-theme.test.ts packages/css/test/component-recipe-compiler.test.ts packages/css/test/public-api.test.ts
git commit -m "feat: add discriminated component states"
```

After this commit, report the focused results and recommend Task 2. Wait for the user's approval before continuing.

### Task 2: Qualify state semantics with an independent property oracle

**Files:**
- Modify: packages/css/test/component-recipe-runtime.property.test.ts
- Modify: packages/css/test/component-recipe-resolution-plan.test.ts

**Interfaces:**
- Consumes: Task 1's v2 descriptor stateVariants, resolver normalization, and base-only invalid-state behavior.
- Produces: seeded generated cases and an independent reference evaluator for normalized defaults, allowed state values, authored variants, compounds, and output slot arrays. The evaluator reads raw descriptor data; it must not call ComponentRecipeResolutionPlan helpers or reuse the implementation matcher.

- [ ] **Step 1: Add a generated state-recipe fixture before changing the property oracle**

Add a generated state-recipe factory alongside the existing unconstrained/v1 generator. Give it a status discriminator with two to four cases, two to four values in one dependent axis, one boolean dependent axis, defaults selecting the first case, and zero to four compounds. Generate constraints as non-empty subsets of the authored dependent-axis domains and generate both allowed and deliberately prohibited selections. Keep the existing v1 generator unchanged.

Reuse the current fixed PROPERTY_SEED = 20260922 and PROPERTY_RUNS = 100. Ensure invalid selections include: valid discriminator with a disallowed dependent value, unknown discriminator, and a missing constrained value with no valid default in a non-default case.

- [ ] **Step 2: Run the new property assertion against the current evaluator**

Run: bun test packages/css/test/component-recipe-runtime.property.test.ts

Expected: the test fails when the existing independent evaluator applies variant/compound branches for a prohibited state or when generated v2 selections are compared without the state contract. The failure must be a semantic mismatch, not an arbitrary-construction exception.

- [ ] **Step 3: Extend the independent evaluator with direct case membership**

After merging the raw descriptor's defaults with the generated selection, find the state case by the normalized discriminator value. If no case exists or any listed axis value is absent from that case's allowed array, return frozen base-only slot arrays. Otherwise run the current straightforward authored-order loop over raw variants and raw compounds.

Keep the oracle distinct from the implementation: use Object.entries on the descriptor and direct Array.includes checks; do not build a resolution plan, invoke the resolver's case-match function, or canonicalize through production helpers.

- [ ] **Step 4: Compare generated selections against the independent oracle**

For each generated case, compare resolveComponentRecipeStyles(recipe, selection) and a zero-capacity resolver with the independent result. Assert every declared slot exists and is frozen, valid authored branch order is stable, and prohibited selections never include variant or compound styles. Run the same selection twice and assert invalid-state diagnostics deduplicate.

Use:

```ts
fc.assert(
  fc.property(stateRecipeCaseArbitrary, ({recipe, selection}) => {
    expect(resolveComponentRecipeStyles(recipe, selection as never))
      .toEqual(referenceResolveWithStates(recipe, selection))
  }),
  {numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED},
)
```

- [ ] **Step 5: Extend the plan-size law to state constraints**

Generate descriptor cases with a fixed authored branch count and increasing state-case/constraint counts. Count the stored plan variant values, state cases, and allowed-value references, then assert they equal the authored counts. For three four-valued axes, assert the plan retains 12 variant values plus the authored state records while the theoretical product is 64; there must be no plan field containing a materialized product.

- [ ] **Step 6: Run property and plan-size tests, then commit**

Run:

```bash
bun test packages/css/test/component-recipe-runtime.property.test.ts packages/css/test/component-recipe-resolution-plan.test.ts
```

Then commit only the two property-test files:

```bash
git add packages/css/test/component-recipe-runtime.property.test.ts packages/css/test/component-recipe-resolution-plan.test.ts
git commit -m "test: qualify component state recipe laws"
```

Report the seed, run count, focused results, and recommend Task 3. Wait for the user's approval before continuing.

### Task 3: Qualify compiler, packed consumers, and runtime isolation

**Files:**
- Modify: packages/css/test/component-recipe-compiler.test.ts
- Modify: packages/css/test/pack-consumer-contract.test.ts
- Modify: packages/css/test/runtime-isolation.test.ts

**Interfaces:**
- Consumes: Task 1's v2 descriptor and stateVariants authoring/type API, Task 2's valid and prohibited selection semantics.
- Produces: compiler emission and packed ESM/CommonJS evidence that v2 state constraints survive serialization and resolve in a separately packed consumer, with no new compiler/Effect runtime imports.

- [ ] **Step 1: Add a compiler artifact test for a stateful component recipe**

Extend the compiler fixture to author status, tone, and busy variants with a stateVariants.status map. Assert the transformed export carries the component tag, version 2, the exact plain-data state map, and every authored class reference. Resolve its theme tokens and assert the constraints remain unchanged while tokenized style branches resolve. The authoring test, not the JSON-round-tripped compiler fixture, owns deep-freeze assertions.

Use a compile fixture containing:

```ts
stateVariants: {
  status: {
    ready: {busy: [false], tone: ["primary", "quiet"]},
    loading: {busy: [true], tone: ["primary"]},
  },
}
```

- [ ] **Step 2: Run the compiler artifact test and confirm it exposes missing v2 preservation**

Run: bun test packages/css/test/component-recipe-compiler.test.ts

Expected: failure on a concrete missing/incorrect version or state map. Do not weaken the assertion to only check a generated-code substring.

- [ ] **Step 3: Exercise the v2 state API in packed ESM and CommonJS consumers**

Extend pack-consumer-contract.test.ts's existing packed fixture with one stateful CSS module and a resolver selection. In each packed module format, prove that the consumer reads descriptor version 2, resolves the default state, resolves a valid non-default state, and receives only base styles for a prohibited runtime input. Keep the existing v1 component fixture and assert it still resolves.

The packed consumer must call the shipped entrypoints, not imported source files:

```ts
import {button} from "./button.css"
import {createComponentRecipeResolver} from "@opsydyn/crumbs-css/theme"

const resolveButton = createComponentRecipeResolver(button)
const loadingStyles = resolveButton({status: "loading", busy: true})
```

- [ ] **Step 4: Assert runtime graph isolation for stateful consumers**

Extend runtime-isolation.test.ts with a v2 descriptor containing a finite stateVariants map, then load the packed theme and theme/core entrypoints through the existing guarded loader. Assert that the theme entrypoint resolves valid and prohibited selections correctly; assert that theme/core preserves and token-resolves state metadata without importing Effect, vanilla-extract authoring, transformer, Metro plugin, or Node compiler modules.

- [ ] **Step 5: Run packed/compiler/isolation gates and commit**

Run:

```bash
bun test packages/css/test/component-recipe-compiler.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts
```

Commit only the compiler, pack, and isolation test changes in this task:

```bash
git add packages/css/test/component-recipe-compiler.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts
git commit -m "test: qualify v2 component state artifacts"
```

Report ESM, CommonJS, v1 compatibility, and isolation results separately; recommend Task 4 and wait for the user's approval.

### Task 4: Document M7.2, record evidence, and run full qualification

**Files:**
- Modify: docs/src/content/docs/reference/package-entrypoints-and-apis.mdx
- Create: docs/assessments/2026-09-22-m7-2-discriminated-component-states.md
- Modify: docs/roadmap.md

**Interfaces:**
- Consumes: the public v2 state contract, resolver fail-closed behavior, property-test seed/results, compiler/packed-consumer results, and actual full-check output from Tasks 1–3.
- Produces: user documentation, an evidence-based M7.2 assessment, and a roadmap completion/next-item record. Do not mark M7.2 complete until every required code and documentation gate passes.

- [ ] **Step 1: Add the state API reference example and semantics**

Update the typed component recipe reference with one stateVariants example and NativeComponentRecipeProps consumer type. Explain exhaustive discriminator coverage, allowed values, default normalization, base-only fallback for a prohibited runtime combination, v1/v2 compatibility, and that plan/selection work never materializes all variant products. Do not imply that invalid independent values now have new behavior.

Document this concrete authoring shape:

```ts
stateVariants: {
  status: {
    ready: {busy: [false], tone: ["primary", "quiet"]},
    loading: {busy: [true], tone: ["primary"]},
  },
}
```

- [ ] **Step 2: Run the docs build before recording completion**

Run: bun run docs:build

Expected: the docs build succeeds and resolves the ADR/reference links.

- [ ] **Step 3: Run complete package qualification**

Run:

```bash
bun run check
bun run docs:build
```

Record exact test/file/assertion counts and docs page count from the output. If either command fails, fix the failure and rerun the affected gate; do not claim M7.2 complete from focused tests alone.

- [ ] **Step 4: Record only verified M7.2 evidence and status**

Create the M7.2 assessment with the exact API contract, commits, test seed/run count, package check result, docs build result, v1/v2 behavior, and remaining performance/device/visual/Android gates. Mark only M7.2 complete in the roadmap, add the assessment link, and recommend M7.3 (public/private contract metadata and declared extension points). Keep the performance registry, Expo/device frame/allocation/memory gates, visual Storybook acceptance, and Android parked.

- [ ] **Step 5: Check the docs diff and commit the M7.2 record**

Run:

```bash
git diff --check
git status --short
```

Confirm the three protected files remain unstaged, then commit only the reference, assessment, and roadmap:

```bash
git add docs/src/content/docs/reference/package-entrypoints-and-apis.mdx docs/assessments/2026-09-22-m7-2-discriminated-component-states.md docs/roadmap.md
git commit -m "docs: qualify M7.2 component states"
```

After this commit, report the exact focused/full qualification evidence and recommend M7.3 as the next roadmap slice. Wait for the user's approval before beginning it.

## Final Plan Self-Review

- Spec coverage maps every type, authoring, descriptor-version, runtime, default, diagnostics, property-law, compiler, package, runtime-isolation, documentation, and deferred-device requirement to a task.
- Review Focus's five adversarial inputs each name the task and test that pins the behavior.
- All new resolver behavior is implemented with the authoring API in Task 1, so no committed intermediate state exposes state declarations that the runtime ignores.
- Descriptor v1 and v2 remain supported by the new runtime; newly authored descriptors emit v2; unsupported versions fail closed.
- The independent oracle reads authored descriptor data directly and the plan-size law compares authored records with stored records rather than timing an unrepresentative host benchmark.
- No task stages or edits the three protected dirty files. Device, visual, performance-registry, and Android qualification stay outside M7.2.
