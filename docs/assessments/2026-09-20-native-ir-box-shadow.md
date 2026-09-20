# M2.2aw closed box-shadow structured IR

M2.2aw moves the static React Native `boxShadow` array into the structured native IR. The value is a dense view-only list of closed items, so every item keeps its required offsets and optional shadow fields without being treated as an arbitrary recursive object.

## Installed boundary

The installed React Native `ViewStyle` surface exposes `boxShadow` as `ReadonlyArray<BoxShadowValue> | string`. Each object requires `offsetX` and `offsetY`, with optional `color`, `blurRadius`, `spreadDistance` and `inset`. Crumbs admits the static subset that can be validated without runtime evaluation:

- offsets are finite numbers or finite percentage strings;
- `color` is an optional non-empty native colour string;
- `blurRadius` is an optional non-negative finite number;
- `spreadDistance` is an optional finite number;
- `inset` is an optional boolean.

Empty lists remain valid whole-value replacements. Pixel/unit strings, nested theme tokens, animated values and native colour objects remain runtime concerns.

## Decision and implementation

`packages/css/src/compiler/structured-ir.ts` now defines `BoxShadowItem` and `BoxShadowValue` as a property-specific Effect Schema contract. The view-only primitive matrix is enforced during capture and schema decoding. Descriptor-safe admission validates a dense outer list, exact item keys, required offsets, optional field types and finite numeric values; it rejects accessors, symbols, decorated records, sparse arrays, extra keys and dynamic values. Admitted items are cloned and frozen before lowering.

Marked static arrays enter the structured IR; CSS string shadows remain on the existing compatibility route. Composition replaces the complete box-shadow list as one property, preserving authored item order. `filter` and experimental background arrays remain deferred as independent contracts.

## Qualification

The focused suite covers the installed item forms, view-only admission, string compatibility, nested immutability, malformed and decorated values, cross-realm values, forged schema nodes, whole-value composition and property-based capture/last-winner laws. The existing structured compiler suite covers both emission modes and malformed diagnostics. Full package, consumer, documentation and performance gates are recorded in [qualification evidence](../evidence/2026-09-20-native-ir-box-shadow/qualification.json).

This slice changes no public authoring API or external artifact ABI, does not publish or push, and does not establish native-device acceptance. The native benchmark remains a declared-host smoke measurement; the performance registry remains fail-closed and exact host-floor measurement remains incomplete until the required Node binary is available.
