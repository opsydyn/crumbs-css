# M2.2e size DimensionValue IR

## Outcome

Crumbs-authored `width`, `height`, `minWidth`, `minHeight`, `maxWidth` and `maxHeight` now enter production scalar IR before CSS serialization. Each property retains finite native point numbers, exact `auto`, finite percentage strings or symbolic legacy token references.

All six properties belong to React Native `FlexStyle`, so view, text and image helpers share the same primitive domain. Static IR excludes Animated nodes and null. Bare numeric strings, CSS `px` strings, other keywords, malformed or nonfinite percentages, nonfinite numbers, arrays, objects and accessors fail rather than falling back to permissive CSS conversion.

## Schema and normalization

One internal DimensionValue property set drives schema-domain checks and capture admission. This prevents drift between decoded nodes and compiler-created nodes. Numeric-only properties such as opacity and flex remain unable to acquire `auto` or percentage strings.

Each size property normalizes independently. Later width replaces earlier width without affecting min/max or height fields. Numeric values retain native point meaning; strings retain exact static semantics; token records become runtime token references only during lowering.

## Independent evidence

The dedicated suite began red while all six properties remained on the legacy converter. Direct capture tests then prove they are stripped before CSS, carried in ordered IR declarations and lowered correctly. Primitive-domain cases cover all 18 property/helper combinations. Exact schema mutations and rejected-domain tables cover malformed values.

A seeded 100-case generator compares mixed size-property sequences with an independent last-winner record evaluator. Both emitters cover generic, view, text and image helpers, composition, variants, recipes and token values. Unmarked vanilla-extract sizes retain their qualified compatibility route. Earlier flex-basis and unitless suites were updated to assert width's new IR ownership.

The focused IR and flex suites passed 47 tests with 1,597 assertions. The complete package check passed 355 tests across 54 files with 14,025 assertions. Storybook typechecking, workspace and clean packed Expo exports, all six runtime source-map checks, the 20-page documentation build and declared host smoke ceilings also passed. The performance registry remains unready because device frame and allocation baselines are missing and retained memory remains diagnostic.

## Boundaries

This slice does not admit Animated nodes or null into static IR and does not migrate position edges, inset aliases, spacing, colour, structured properties or the vanilla-extract adapter. Token references remain legacy names pending M3 identity. No public API, external artifact ABI, native-device acceptance, publication or push is included.
