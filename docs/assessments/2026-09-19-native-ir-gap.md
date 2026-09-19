# M2.2h gap-family scalar IR

## Outcome

Crumbs-authored `gap`, `rowGap` and `columnGap` now enter production scalar IR before CSS serialization. Broad `gap` expands to ordered canonical row and column declarations, so later broad or axis-specific authoring competes under the same last-winner law.

The migration applies to view, text and image helpers. Unmarked vanilla-extract records remain on the compatibility converter.

## Admission and provenance

Static gap values admit finite native point numbers, finite percentage strings and legacy token references. `auto`, CSS `px` strings, bare numeric strings, arbitrary keywords, malformed percentages, nonfinite numbers, null and structured values fail without fallback.

The compiler now uses one alias expansion table for inset and gap families. Expanded declarations retain the authored `gap`, canonical axis, source path and explicit expansion path. Exact `rowGap` and `columnGap` declarations retain their own property identity and an empty path. Effect Schema rejects undeclared alias/property pairs and forged expansion paths.

## Independent evidence

The dedicated suite began with five failures while all gap fields remained on the compatibility path. Direct cases prove IR ownership, all property/primitive combinations, invalid-value rejection and schema mutations. A seeded 100-case generator compares mixed broad and axis declarations with an independent canonical record evaluator.

Both emitters cover generic, view, text and image helpers, composition, variants, recipes and token references. The existing spacing property suite remains green. Focused qualification passed 22 tests with 347 assertions. The complete package check passed 375 tests across 57 files with 14,450 assertions. Storybook typechecking, workspace and clean packed Expo exports, all six runtime source-map checks, the 20-page documentation build and declared host smoke ceilings also passed. The performance registry remains unready because device frame and allocation baselines are missing and retained memory remains diagnostic.

## Boundaries

This slice does not migrate padding or margin declarations. Token references remain legacy names pending M3 identity. Animated values and null remain outside static IR. No public API, external artifact ABI, native-device acceptance, publication or push is included.
