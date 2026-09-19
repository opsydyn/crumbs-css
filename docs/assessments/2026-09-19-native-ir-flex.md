# M2.2c scalar native flex IR

## Outcome

Crumbs-authored scalar `flex` now enters production native IR before CSS serialization. It shares the ordered numeric declaration block with `flexGrow` and `flexShrink`, but retains its own property identity and React Native meaning. No browser shorthand fields are synthesized.

The installed React Native types expose numeric `flex` through `FlexStyle`, so the compiler admits it for view, text and image. Every finite number is retained, including negative values, fractions and signed zero. Exact legacy `var(--crumbs-*)` references remain symbolic until runtime lowering.

## Admission and ordering

Malformed Crumbs values fail at the IR boundary with `CRUMBS_IR_INVALID_VALUE`. Numeric strings, CSS keywords, multipart shorthand strings, nonfinite numbers, arrays, objects and accessors cannot fall through to permissive CSS conversion. Exact Effect Schema decoding verifies the property and its authored/canonical provenance.

Normalization applies last-winner order per property. Later `flex` replaces only earlier `flex`; it does not delete or synthesize `flexGrow`, `flexShrink` or `flexBasis`. The two numeric siblings use the same IR block. `flexBasis` remains on the qualified legacy route and is merged as an independent field after conversion.

## Independent evidence

The dedicated suite began red because direct capture left `flex` on the CSS rule and the numeric schema rejected flex declarations. Direct tests cover every primitive, signed zero, negative fractions, malformed values, schema provenance and token lowering. A seeded 100-case property test proves same-field last-winner behavior while retaining numeric siblings. End-to-end tests cover generic, view, text and image helpers, compositions, variants, recipes and both emitters.

The established flex precedence suite remains independent coverage of converter and compiled graph behavior. Its invalid Crumbs-authoring expectation now names the IR diagnostic that owns the declaration. The complete package check passed 340 tests across 52 files with 13,550 assertions. Storybook typechecking, workspace and clean packed Expo exports, all six runtime source-map checks, the 20-page documentation build and declared host smoke ceilings also passed. The performance registry remains unready because device frame and allocation baselines are missing and retained memory remains diagnostic.

## Boundaries

This slice does not migrate `flexBasis`, general lengths, colours, structured properties or the vanilla-extract adapter. Legacy token nodes still carry raw variable names pending M3 contract-qualified identity. No public API, external artifact ABI, native-device acceptance, publication or push is included.
