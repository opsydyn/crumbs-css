# M7.4 assessment: product-team component extension

Date: 2026-09-26
Status: M7.4 implementation and package-level qualification complete. No device or Android acceptance claimed.

The packed-consumer fixture now models an owner package (`@acme/ui`) and a
product-team package (`@acme/brand`) as separate source modules. The brand
imports the owner's contract-bearing recipe and theme variables, then adds its
brand variant, compound style, default, and permitted slot override through
`extendComponentRecipe`. The brand source does not define or copy a component
recipe.

## Verified behavior

The owner keeps private implementation details—an internal icon slot, a
private density axis, and private recipe values—outside its public contract.
An authoring test changes those implementation details under the same contract
identity and verifies the public contract remains equal. A second authoring
test verifies construction fails when the contract still declares a removed
public slot or variant value.

The packed-consumer test transforms owner and brand `.css.ts` modules separately
using the unpacked npm artifact's public transformer. It checks that the brand
transform retains the Metro-visible dependency on the owner source. Its Node
fixtures load the independently generated modules through CommonJS and ESM,
resolve the owner recipe with the brand extension, and assert the exact
base/variant/compound/override style order and themed values. Node maps the
emitted `.css.ts` dependency to the generated `.css` fixture output; this is a
test-loader adaptation and does not replace Metro acceptance.

The temporary packed-consumer root is canonicalized before transformation so
macOS `/var` and `/private/var` aliases do not cause the dependency analyzer to
mistake an in-project package for an external path.

## Evidence

- `bun test packages/css/test/component-recipe-authoring.test.ts` — 12 tests passed, 81 assertions.
- `bun test packages/css/test/pack-consumer-contract.test.ts` — 1 packed test passed, including CommonJS, ESM, Node16, and Bundler consumer checks.
- `bun run check` — package build, typecheck, and 841 tests across 136 files passed, with 39,930 assertions.
- `bun run docs:build` — passed; 20 documentation pages built.

## Limits

This is source, package, runtime, and type-resolution evidence. It does not
claim on-device behavior, visual acceptance, or Android support. Android remains
parked for the final native step.
