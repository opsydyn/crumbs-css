# M2.2g inset-alias IR expansion

## Outcome

All seven Crumbs inset aliases now enter production scalar IR before CSS serialization. `inset` expands to `top`, `right`, `bottom` and `left`; inline and block pairs expand to their existing canonical fields; inline start/end remain native `start`/`end`; block start/end become `top`/`bottom`.

This moves the established inset contract onto the same production IR path as exact position edges. It does not infer writing direction or collapse logical fields into physical sides.

## Provenance and normalization

Every expanded declaration retains its authored alias, canonical property, source path and explicit two-step expansion path. The Effect Schema semantic check admits an alias/property pair only when it appears in the compiler's declared expansion table. A forged `insetInline` to `top` declaration therefore fails with `CRUMBS_IR_INVALID_NODE`.

Aliases use the established static DimensionValue domain: finite native point numbers, exact `auto`, finite percentages and legacy tokens. Expansion happens in authored order before canonical normalization, so a later exact longhand replaces only the matching expanded field and a later alias replaces only the canonical fields it names. Physical and logical declarations remain distinct.

## Independent evidence

The dedicated suite proves every ordered expansion and its provenance, mixed alias/longhand last-winner behavior, schema rejection of forged expansion paths and compatibility routing for unmarked vanilla-extract records. The established inset suite provides generated declaration and compiled-composition comparisons against its independent canonical evaluator, plus both StyleSheet and plain-object emitter fixtures.

The focused inset, edge and size suites passed 29 tests with 914 assertions. The complete package check passed 367 tests across 56 files with 14,288 assertions. Storybook typechecking, workspace and clean packed Expo exports, all six runtime source-map checks, the 20-page documentation build and declared host smoke ceilings also passed. The performance registry remains unready because device frame and allocation baselines are missing and retained memory remains diagnostic.

## Boundaries

There is no compiler layout-direction inference or physical/logical collapse. Animated nodes and null remain outside static IR. Token references remain legacy names pending M3 identity. Padding and margin aliases, the vanilla-extract adapter, public API and external artifact ABI remain separate work. No native-device acceptance, publication or push is included.
