# M7.1 typed component slots assessment

## Decision

Close M7.1 with a versioned, serializable component descriptor that gives
teams named primitive-specific slots and one shared variant selection. Keep
the existing single-style `recipe` ABI unchanged; `componentRecipeFromRecipe`
provides an explicit view-only migration path.

## Contract delivered

- `componentRecipe` authors the `crumbs.css.component-recipe` descriptor at
  version `1`, with `view`, `text`, and `image` slots plus inferred slot and
  variant types (`NativeComponentRecipeProps` and
  `NativeComponentResolvedStyles`). Runtime resolution returns an ordered
  frozen style array for every declared slot, including empty arrays for
  omitted branches.
- One component plan stores authored slots, variant values, and compounds. A
  single bounded LRU resolver cache is shared across the component's slots;
  its default capacity is `32`, accepted range is `0..1024`, and `0` disables
  retention. Resolution follows base, authored variant, then authored compound
  order without materialising variant products.
- Theme token resolution traverses base, variant, and compound styles. Generic
  export capture and code emission preserve the component tag and nested class
  references. Primitive errors include the component and slot path, such as
  `button.label`.
- Runtime component selections accept strings and booleans. A numeric value
  cannot select a string variant with the same printed form; invalid values
  follow the existing warn-and-skip behavior.
- Effect 4 (`4.0.0-rc.115`) remains an internal Crumbs package dependency for
  compiler and schema boundaries. Expo consumers use Crumbs entrypoints without
  importing or declaring Effect themselves; the tested `theme` and `theme/core`
  runtime graphs retain a React-only external dependency boundary.

## Evidence

Implementation commits: `ba9b9ed` (authoring), `0310bfc` (shared resolver),
`5d6e7ff` (theme token resolution), `68ef0db` (compiler and packed consumer
qualification), and `5a3512c` (property laws and selection type guard).

The tested workspace used `@opsydyn/crumbs-css 0.1.2-alpha.2`, React Native
`0.85.3`, `@vanilla-extract/css 1.20.1`, TypeScript `6.0.3`, Effect
`4.0.0-rc.115`, and Bun `1.4.2`.

The Task 4 compiler, packed ESM/CommonJS consumer, and runtime-isolation gate
passed 11 tests across three files:

```sh
bun test packages/css/test/component-recipe-compiler.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts
```

The Task 5 component property suites use fixed seeds `20260922` and `20260923`,
with 100 runs each. They passed four tests and 1,253 assertions, including an
independent evaluator, cache/result identity, insertion-order invariance,
frozen slot arrays, invalid selection types, exact authored branch counts,
and a three-variant/four-value regression (12 authored branches versus 64
possible combinations):

```sh
bun test packages/css/test/component-recipe-runtime.property.test.ts packages/css/test/component-recipe-resolution-plan.test.ts
```

Final qualification passed:

- `bun run check` — package build and typecheck passed; 798 tests passed with
  29,108 assertions across 135 files.
- `bun run docs:build` — 20 documentation pages built.
- `bun run budgets:validate` — `valid: true`, with no baseline issues.
  `registryReady` remains false and `performanceQualification` remains
  `not-run`; JS/UI frame-time, allocation, retained-memory and runtime-emitted
  byte thresholds remain pending review.

## Remaining limits

This closes the M7.1 software contract only. Release-device frame time,
allocation and retained-memory measurement, visual Storybook acceptance,
performance-registry activation, and Android qualification remain incomplete.
The Android and device-dependent work stays backlogged as the final
device-enabled move.

## Next recommendation

Proceed to **M7.2**: exhaustive discriminated state recipes and
prohibited-combination checking, while avoiding eager state-product
generation.
