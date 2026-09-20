# M2.3 vanilla-extract compatibility adapter IR

M2.3 routes the lossless subset of unmarked vanilla-extract style rules through the production native IR. This lets existing vanilla-extract consumers benefit from the same scalar and structured preservation guarantees without treating browser CSS as the canonical representation.

## Boundary

The adapter runs only for rules without the Crumbs native-capture marker. It admits values that can be reconstructed without guessing:

- recognised scalar properties with finite numbers, booleans, Crumbs token references, or a single converter-confirmed native value;
- static structured arrays and the plain `shadowOffset`/`textShadowOffset` records already owned by the structured IR;
- provenance marked `vanilla-extract-adapter`, retained through Effect Schema validation, normalization and lowering.

Browser-oriented strings and shorthand forms stay on the existing CSS converter path. For example, a multi-value `padding` declaration remains CSS-converted so its canonical side expansion is preserved. Static structured values are captured as whole values; malformed arrays or records fail with `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE` and file/class/property context rather than being partially reconstructed.

## Export and failure policy

Compiled named exports are reconstructed by executing the generated data module in the existing VM boundary. If that reconstruction fails, the transformer throws `CRUMBS_CSS_UNSUPPORTED_EXPORT` with the source file and underlying error. The previous regex fallback was removed because it could turn a malformed or partially understood module into an apparently valid export map.

## Qualification

The focused adapter, structured compiler and transformer suites pass, including an end-to-end unmarked vanilla-extract rule carrying canonical scalars, a static transform array, a shadow offset and a CSS shorthand. The export-admission regression proves that unsupported reconstruction fails with context. Full package, Storybook, workspace Expo, documentation and host-budget gates are recorded in [qualification evidence](../evidence/2026-09-20-native-ir-compatibility-adapter/qualification.json); the isolated packed Expo install remains incomplete because the registry timed out.

This slice adds no public authoring API, Effect consumer requirement, external artifact ABI or native-device acceptance. Android remains parked. The next compiler concern is separation of validation, shorthand normalization, dependency analysis and emission in M2.4.
