# M2.2f position-edge DimensionValue IR

## Outcome

Crumbs-authored `top`, `right`, `bottom`, `left`, `start` and `end` now enter production scalar IR before CSS serialization. Each field accepts the established static DimensionValue subset and is available across view, text and image helpers.

Physical and logical fields remain independent React Native declarations. The compiler does not infer left-to-right or right-to-left layout, rewrite `start` or `end`, or delete physical siblings. This preserves source intent until React Native applies layout direction.

## Admission and normalization

The position edges join the shared DimensionValue property classification used by both Effect Schema and capture. Finite native point numbers, exact `auto`, finite percentages and exact legacy token references are admitted. Bare numeric strings, CSS `px`, other keywords, malformed/nonfinite values, null, arrays, objects and accessors fail without fallback.

Normalization retains the final declaration for each exact field. A later `start` replaces an earlier `start` while leaving `left` intact. Signed zero remains a numeric value through lowering, fixing a representational loss on the former CSS path.

## Independent evidence

The dedicated suite began red while all six edges remained on the compatibility converter. Direct cases prove capture ownership and lowering, cover all 18 property/primitive combinations, mutate schema value and provenance fields, and reject unsupported inputs. A seeded 100-case generator compares mixed edge sequences with an independent per-field record evaluator.

Both emitters cover generic, view, text and image helpers, composition, variants, recipes and token references. Unmarked vanilla-extract edges remain on the compatibility route. The established inset precedence suite stays green, confirming this migration did not alter its alias semantics.

The focused edge, DimensionValue and inset suites passed 40 tests with 1,388 assertions. The complete package check passed 363 tests across 55 files with 14,234 assertions. Storybook typechecking, workspace and clean packed Expo exports, all six runtime source-map checks, the 20-page documentation build and declared host smoke ceilings also passed. The performance registry remains unready because device frame and allocation baselines are missing and retained memory remains diagnostic.

## Boundaries

This slice does not migrate or expand inset aliases and does not define direction-aware physical/logical conflict resolution. Animated nodes and null remain outside static IR. Token references remain legacy names pending M3 identity. No public API, external artifact ABI, native-device acceptance, publication or push is included.
