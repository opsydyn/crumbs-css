# M2.2d flex-basis scalar IR

## Outcome

Crumbs-authored `flexBasis` now enters production native IR before CSS serialization. The declaration-block vocabulary is now scalar rather than numeric because it can retain native point numbers, `auto`, percentage strings and symbolic token references without conflating their meanings.

The installed React Native 0.85 `DimensionValue` type admits numbers, `auto`, percentage template literals, animated nodes and null. Static Crumbs compilation admits the serializable subset: every finite number, exact `auto`, a percentage whose numeric component is finite, or an exact legacy `var(--crumbs-*)` reference. The property belongs to `FlexStyle`, so view, text and image are valid domains.

## Admission and normalization

Effect Schema validates the shared node shape and then applies the property-specific value domain. Existing numeric properties cannot acquire `auto` or percentage strings. `flexBasis` rejects bare numeric strings, CSS `px` strings, other keywords, malformed or nonfinite percentages, nonfinite numbers, null, arrays, objects and accessors. Animated nodes remain outside static authoring and are not inspected or executed.

Finite numeric values retain React Native point semantics. Percentages retain their authored string, and tokens remain symbolic until lowering. The freezer now copies only token records and preserves scalar strings directly; lowering likewise converts only token records. Ordered normalization keeps the final declaration for each property without coupling `flexBasis` to `flex`, `flexGrow` or `flexShrink`.

## Independent evidence

The dedicated suite began red because scalar entry points did not exist. A subsequent green attempt exposed string values being spread into character-key objects, which the retained regression now prevents. Direct cases cover the full admitted and rejected domains, every primitive, exact schema mutations and token lowering. A seeded 100-case property test combines point, percentage and auto bases with the other flex fields. Both emitters cover generic and primitive helpers, composition, variants and recipes; unmarked vanilla-extract remains on the compatibility route.

The focused flex and IR suites passed 39 tests with 1,380 assertions. The complete package check passed 347 tests across 53 files with 13,808 assertions. Storybook typechecking, workspace and clean packed Expo exports, all six runtime source-map checks, the 20-page docs build and declared host smoke ceilings also passed. The performance registry remains unready because device frame and allocation baselines are missing and retained memory remains diagnostic.

## Boundaries

This slice does not admit Animated nodes or null into static IR and does not migrate the wider DimensionValue, spacing, inset, colour, structured-property or vanilla-extract families. Token references remain legacy names pending M3 identity. No public API, external artifact ABI, native-device acceptance, publication or push is included.
