# M10.5 Theme Runtime Entrypoints and Footprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional, independently consumable theme feature entrypoints and reduce only profile-supported theme runtime cost while preserving every existing API.

**Architecture:** Keep `theme` and `theme/core` as compatibility surfaces. Reuse the existing condition and expression modules, move the runtime recipe and Sprinkles resolver wrappers into canonical modules, and build all theme entries together so overlapping exports can retain function identity. Add ESM, CJS, declaration, packed-consumer, and Metro evidence for the additive paths.

**Tech Stack:** TypeScript, Bun, tsdown, React Native, Expo/Metro, Node ESM and CJS.

**Spec:** [M10.5 Runtime Footprint Remediation Design](../specs/2026-10-01-m10-5-runtime-footprint-design.md)

## Global Constraints

- Preserve every current value export, type export, runtime behavior, and import path from `@opsydyn/crumbs-css/theme` and `@opsydyn/crumbs-css/theme/core`.
- Preserve every current value export, type export, runtime behavior, and import path from `@opsydyn/crumbs-css/tokens` and all existing token subpaths.
- Keep synchronous APIs synchronous and keep React Native, Node ESM, and Node CJS behavior aligned.
- Preserve all approved budget thresholds, recorded baselines, registry membership, and workload identities.
- Do not make platform-conditional export maps or introduce Node-only lazy loading into React Native runtime paths.
- Do not change the Effect dependency, token model, styling semantics, or supported Node/React Native versions.
- Do not claim tree-shaking or consumer bundle savings from source splitting or package build output alone.
- Do not publish the package or claim device, rendering, accessibility, screenshot, or release-device acceptance from host and Metro checks.

## Review Focus

- Importing an overlapping export from a compatibility entry and a focused entry must return the same function/object identity; test through packed ESM and CJS imports in `packages/css/test/manifest-export.test.ts`.
- Provider/global-store behavior must remain stable across existing paths, while each overlapping feature export must be the same binding through compatibility `theme` and its focused path; test feature binding identity in packed ESM/CJS cases in `packages/css/test/manifest-export.test.ts`. Global registry, cache and diagnostic behavior remain covered by `packages/css/test/runtime-isolation.test.ts`, `packages/css/test/theme-store.test.ts`, and `packages/css/test/theme-resolution-cache.test.ts`.
- Runtime exports must remain exact and every current type export must still compile from the legacy entrypoints; lock runtime names in `packages/css/test/public-api.test.ts`, type names in `packages/css/test/theme-public-api-types.ts`, and new declaration paths in packed consumer typechecks.
- Focused runtime paths must not acquire Effect, Node built-ins, compiler, Metro, or vanilla-extract runtime imports; test emitted graphs and denied-import probes in `packages/css/test/runtime-isolation.test.ts`.
- A packed production Expo bundle must identify the exact feature modules it includes and excludes; test source maps with `bun run playground:packed --check` and `scripts/runtime-bundle-contract.ts`.

---

### Task 1: Record the pre-change theme initialization profile

**Files:**
- Create: `docs/evidence/2026-10-01-m10-5-runtime-footprint/profile-summary.md`
- Read: `docs/evidence/2026-10-01-m10-5-final/host-budgets/runtime-initialization.json`
- Read: `docs/evidence/2026-10-01-m10-5-final/host-budgets/runtime-graph.json`

**Interfaces:**
- Consumes: the retained M10.5 current-Node and Node v22.0.0 host measurements.
- Produces: a diagnostic-only before profile summary with Node version, platform, exact command, top Crumbs module-evaluation frames, and the artifact sizes they correspond to. It does not alter or replace an admitted budget measurement.

- [ ] **Step 1: Build the current package and record the checkout identity.**

Run from the repository root: `bun run build`, then record `git rev-parse HEAD`, `node --version`, and `bun --version` in the profile summary.

- [ ] **Step 2: Capture diagnostic CPU profiles for the existing compatibility entry.**

Run:
```bash
mkdir -p /tmp/crumbs-m10-5-theme-before-esm /tmp/crumbs-m10-5-theme-before-cjs
node --cpu-prof --cpu-prof-dir=/tmp/crumbs-m10-5-theme-before-esm --input-type=module -e 'await import("./packages/css/dist/theme.mjs")'
node --cpu-prof --cpu-prof-dir=/tmp/crumbs-m10-5-theme-before-cjs -e 'require("./packages/css/dist/theme.cjs")'
```
Inspect the generated profiles and record the top Crumbs module-evaluation frames. Keep raw profiles in `/tmp`; label this evidence diagnostic, not a budget result.

- [ ] **Step 3: Record the pre-change evidence and constraints.**

Include the retained current-Node medians (3.260 ms ESM and 2.792 ms CJS), the exact approved ceilings (3.067 ms and 2.444 ms), and the six existing emitted-graph failures as context. Do not infer a feature-level cause from correlation alone.

- [ ] **Step 4: Review and commit the diagnostic evidence.**

Run: `git diff --check`
Expected: no whitespace errors. Commit only the summary as `docs: capture M10.5 theme runtime profile`.

### Task 2: Extract canonical recipe and Sprinkles runtime resolvers

**Files:**
- Create: `packages/css/src/runtime/theme-recipe-resolvers.ts`
- Create: `packages/css/src/runtime/theme-sprinkles-resolver.ts`
- Modify: `packages/css/src/theme-runtime.ts`
- Test: `packages/css/test/theme-runtime-resolver-identity.test.ts`
- Regression tests: `packages/css/test/component-recipe-runtime.property.test.ts`, `packages/css/test/recipe-runtime.property.test.ts`, `packages/css/test/sprinkles.test.ts`, `packages/css/test/sprinkles-types.ts`

**Interfaces:**
- Consumes: the existing declarations in `theme-runtime.ts`, `runtime/recipe-resolution-plan.ts`, `runtime/component-recipe-resolution-plan.ts`, and `runtime/sprinkles-resolution-plan.ts`.
- Produces: the same existing signatures for `resolveRecipeStyle`, `createRecipeResolver`, `resolveComponentRecipeStyles`, `createComponentRecipeResolver`, and `createSprinklesResolver`; `theme-runtime.ts` re-exports those bindings and keeps every current resolver type export (`NativeRecipeResolver`, `RecipeResolverOptions`, `RecipeResolverControls`, `BoundedNativeRecipeResolver`, `NativeComponentRecipeResolver`, `ComponentRecipeResolverOptions`, `ComponentRecipeResolverControls`, `BoundedNativeComponentRecipeResolver`, `NativeSprinklesResolver`, `SprinklesResolverOptions`, `SprinklesResolverControls`, and `BoundedNativeSprinklesResolver`).

- [ ] **Step 1: Add source-level binding identity tests.**

In `theme-runtime-resolver-identity.test.ts`, import each resolver from `theme-runtime.ts` and its new canonical runtime module. Assert strict equality for every shared function. The test also asserts that the Sprinkles entry exports no recipe-only warning state.

- [ ] **Step 2: Run the new test and confirm the missing canonical modules fail.**

Run from `packages/css`: `bun test test/theme-runtime-resolver-identity.test.ts`.
Expected: FAIL because the new canonical resolver modules do not yet exist.

- [ ] **Step 3: Move the existing resolver implementations and their recipe diagnostics without changing behavior.**

Move recipe resolver wrappers and the warning helpers they alone use into `runtime/theme-recipe-resolvers.ts`. Move `createSprinklesResolver` and its option/control types into `runtime/theme-sprinkles-resolver.ts`. Keep the current function names, generic parameters, defaults, cache sizes, warning keys/messages, disposal behavior, and plan properties. Re-export them from `theme-runtime.ts`; leave theme/token traversal and React contexts in that file.

- [ ] **Step 4: Run identity and behavior tests.**

Run from `packages/css`: `bun test test/theme-runtime-resolver-identity.test.ts test/component-recipe-runtime.property.test.ts test/recipe-runtime.property.test.ts test/sprinkles.test.ts`.
Expected: PASS with all existing diagnostics, cache controls, and resolution output unchanged. The `sprinkles-types.ts` fixture is checked by the following package typecheck.

- [ ] **Step 5: Typecheck and commit the extraction.**

Run from the repository root: `bun run typecheck`.
Expected: PASS. Commit only this slice as `refactor: isolate theme recipe and sprinkles resolvers`.

### Task 3: Add focused theme feature package paths

**Files:**
- Modify: `packages/css/package.json`
- Modify: `packages/css/tsdown.config.ts`
- Create: `packages/css/src/theme-recipes.ts`
- Create: `packages/css/src/theme-sprinkles.ts`
- Modify: `packages/css/test/public-api.test.ts`
- Create: `packages/css/test/theme-public-api-types.ts`
- Modify: `packages/css/test/manifest-export.test.ts`
- Modify: `packages/css/test/runtime-isolation.test.ts`

**Interfaces:**
- Consumes: canonical implementations in `conditions/index.ts`, `expressions/index.ts`, `runtime/theme-recipe-resolvers.ts`, and `runtime/theme-sprinkles-resolver.ts`.
- Produces: additive paths `@opsydyn/crumbs-css/theme/conditions`, `theme/expressions`, `theme/recipes`, and `theme/sprinkles`. Conditions and expressions re-export the complete canonical `conditions/index.ts` and `expressions/index.ts` modules. Recipes exposes `resolveRecipeStyle`, `createRecipeResolver`, `createComponentRecipeResolutionPlan`, `resolveComponentRecipeResolutionPlan`, `resolveComponentRecipeStyles`, and `createComponentRecipeResolver`, plus `RecipeCompoundMatcher`, `RecipeResolutionInput`, `RecipeResolutionPlan`, `RecipeResolutionVariant`, `RecipeResolverCacheStats`, `NativeRecipeResolver`, `RecipeResolverOptions`, `RecipeResolverControls`, `BoundedNativeRecipeResolver`, `ComponentRecipeCompoundMatcher`, `ComponentRecipeInvalidVariantReporter`, `ComponentRecipeResolutionPlan`, `ComponentRecipeResolutionVariant`, `ComponentRecipeResolverOptions`, `ComponentRecipeResolverControls`, `BoundedNativeComponentRecipeResolver`, and `NativeComponentRecipeResolver`.
- Sprinkles exposes `createSprinklesResolver`, `NativeSprinklesLookupPlan`, `NativeSprinklesSelection`, `NativeSprinklesResolutionPlan`, `NativeSprinklesResolutionSelection`, `NativeSprinklesResolver`, `SprinklesResolverOptions`, `SprinklesResolverControls`, and `BoundedNativeSprinklesResolver`. Existing `theme` and `theme/core` exports remain exact.

- [ ] **Step 1: Extend public API tests before adding package exports.**

Import all four paths in `public-api.test.ts`. Assert each runtime namespace has its expected focused named exports, and assert every feature name shared with `theme` has strict function/object identity. Add `theme-public-api-types.ts` with type-only imports for every type currently exported by `theme-runtime.ts` and `theme-core.ts`. In `manifest-export.test.ts`, add packed ESM/CJS and Node16/Bundler declaration cases for each new path, representative feature types, and strict identity checks for every overlapping feature function.

- [ ] **Step 2: Run the focused API tests and confirm they fail on unresolved paths.**

Run from `packages/css`: `bun test test/public-api.test.ts test/manifest-export.test.ts`.
Expected: FAIL because the package export map has no focused theme paths.

- [ ] **Step 3: Register the four entries in one theme runtime build configuration.**

Point conditions and expressions directly at their existing canonical index modules; point recipes and Sprinkles at their canonical barrels. Keep these entries in the same `tsdown` runtime build configuration as `theme` and `theme-core`, and in the existing single declaration graph, so shared source bindings can remain shared. Add matching ESM, CJS, and type conditions to `package.json`. Extend the generated `.d.cts` entry list without changing tool/compiler entry groups.

- [ ] **Step 4: Verify packed resolution, identity, type conditions, and dependency boundaries.**

Run from `packages/css`: `bun test test/public-api.test.ts test/manifest-export.test.ts test/runtime-isolation.test.ts`.
Expected: PASS for all four subpaths in ESM/CJS and both TypeScript resolution modes; shared values have strict identity; feature runtime graphs contain no Effect or authoring/compiler/Node-only runtime dependency; legacy export arrays remain unchanged.

- [ ] **Step 5: Commit the additive API slice.**

Run: `git diff --check`
Expected: no whitespace errors. Commit as `feat: add focused theme runtime entrypoints`.

### Task 4: Dogfood focused imports in packed Metro and document them

**Files:**
- Modify: `apps/playground/src/App.tsx`
- Modify: `apps/playground/src/RecipeScopePanel.tsx`
- Modify: `apps/playground/src/GradientAcceptancePanel.tsx`
- Modify: `scripts/runtime-bundle-contract.ts`
- Modify: `packages/css/test/runtime-bundle-contract.test.ts`
- Modify: `docs/src/content/docs/reference/package-entrypoints-and-apis.mdx`

**Interfaces:**
- Consumes: the packed package paths from Task 3 and the existing Expo source-map qualification flow.
- Produces: a packed playground that imports `resolveRecipeStyle` from `theme/recipes`; a narrow source-map allowlist for the emitted Crumbs runtime entry/chunk names; docs that show when to choose each additive path.

- [ ] **Step 1: Add bundle-contract tests for allowed focused entries and rejected tooling paths.**

In `runtime-bundle-contract.test.ts`, accept source-map paths for the four theme feature entry families and their verified shared runtime chunks. Continue rejecting Effect, compiler, tooling, and unknown Crumbs outputs.

- [ ] **Step 2: Run the contract test and confirm the new focused entry sources fail.**

Run from `packages/css`: `bun test test/runtime-bundle-contract.test.ts`.
Expected: FAIL because the current Crumbs source-map allowlist recognises only theme, theme-core, tokens, and token runtime chunks.

- [ ] **Step 3: Update the allowlist and migrate the playground recipe imports.**

Allow only the built feature entry and shared chunk filenames observed from the Task 3 package build. Change the three existing `resolveRecipeStyle` imports in the packed playground to `@opsydyn/crumbs-css/theme/recipes`; keep common theme imports on `theme/core`.

- [ ] **Step 4: Document focused paths and qualify the packed production bundle.**

Update the package entrypoint reference with the four import paths, their exposed API families, and the requirement to check a consumer bundle before claiming a size improvement. Run: `bun run playground:packed --check` and `bun run docs:build`.
Expected: the staged consumer installs the packed tarball, typechecks, exports iOS/Android/web production bundles with source maps, and records the exact emitted Crumbs feature sources. Claim unused-feature omission only if those source maps demonstrate it; if an unused focused module remains, keep M10.5 open and do not claim a bundle saving.

- [ ] **Step 5: Commit the packed-consumer and documentation slice.**

Run: `git diff --check`
Expected: no whitespace errors. Commit as `docs: qualify focused theme imports in packed playground`.

### Task 5: Re-measure the unchanged theme budgets

**Files:**
- Create: `docs/evidence/2026-10-01-m10-5-runtime-footprint/theme-after/`
- Read: `packages/css/bench/budgets.json`
- Read: `packages/css/bench/PERFORMANCE_BUDGETS.md`

**Interfaces:**
- Consumes: the final implementation revision and the existing approved graph/runtime initialization protocols.
- Produces: post-change graphs and current/floor initialization reports with original workload identities and thresholds.

- [ ] **Step 1: Run the unchanged focused checks.**

Run: `bun run check`, `bun run budgets:validate`.
Expected: PASS without baseline, threshold, registry-membership, or workload-identity changes.

- [ ] **Step 2: Measure the existing graph and initialization budgets.**

Run `bun run measure:runtime-graph-budgets docs/evidence/2026-10-01-m10-5-runtime-footprint/theme-after/graph` after the package build. Then run `CRUMBS_AUDIT_NODE_FLOOR=/absolute/path/to/node-v22.0.0 bun packages/css/bench/runtime-initialization.ts docs/evidence/2026-10-01-m10-5-runtime-footprint/theme-after/runtime-initialization.json 15` with the exact Node v22.0.0 executable.

- [ ] **Step 3: Report each result against its existing threshold.**

Record all six graph results and four initialization scenarios. Do not replace a failed comparison with a focused-subpath size, do not change a threshold, and do not call an incomplete comparison a pass. Keep M10.5 open while any approved required metric is failed, incomplete, or unrun, or while a required native/device gate remains open.

- [ ] **Step 4: Commit the measurement evidence.**

Run: `git diff --check`
Expected: no whitespace errors. Commit as `test: record M10.5 theme footprint results`.

The full M10.5 host-budget gate remains the last acceptance run after the remediation slices. It does not qualify device, screenshot, screen-reader, or release-device requirements.
