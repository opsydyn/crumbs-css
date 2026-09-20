# M2.2av ordered transform structured IR

M2.2av moves the ordered React Native `transform` array into the structured native IR. The value is an ordered list of one-operation entries, so authored sequence is part of the value and cannot be normalised as an unordered map.

## Installed boundary

The installed React Native `TransformsStyle` contract exposes thirteen operation forms. Crumbs admits their static finite subset:

- numeric operations: `perspective`, `scale`, `scaleX` and `scaleY` with finite numbers;
- angle operations: `rotate`, `rotateX`, `rotateY`, `rotateZ`, `skewX` and `skewY` with finite `deg` or `rad` strings;
- translation operations: `translateX` and `translateY` with finite numbers or finite percentage strings;
- `matrix` with a dense array of exactly sixteen finite numbers.

Each list entry must be a plain data object with exactly one supported operation key. Empty transform arrays remain valid. Animated values, nested token references, arbitrary angle units, CSS expressions and other dynamic forms remain runtime concerns. React Native's string transform form remains on the compatibility route; this slice owns marked static arrays. The existing `transformMatrix` field remains a separate fixed-array property.

## Decision and implementation

`packages/css/src/compiler/structured-ir.ts` now defines an explicit `TransformOperation` union and `TransformValue` list. Descriptor-safe capture validates the outer list, every operation object and nested matrix before CSS serialisation. It rejects sparse or decorated arrays, accessors, extra keys, multi-operation entries, unsupported keys, non-finite values, non-finite numeric text and malformed units. Cross-realm plain arrays and records remain valid.

The structured declaration and provenance schemas accept `transform` as a property-specific value and retain the view/text/image primitive matrix. Lowering deep-clones and freezes operations and nested matrices. Composition retains the final complete transform list as one property, preserving operation order and whole-value last-winner semantics. String transforms and unmarked arrays continue through the established compatibility path.

## Qualification

The focused suite covers all thirteen operation forms, authored order, string compatibility, nested immutability, malformed and decorated values, cross-realm values, forged schema nodes, composition and property-based order/last-winner laws. Existing structured array, offset and compiler coverage remains green. Full package, consumer, documentation and performance gates are recorded in [qualification evidence](../evidence/2026-09-20-native-ir-ordered-transform/qualification.json).

This slice changes no public authoring API or external artifact ABI, does not publish or push, and does not establish native-device acceptance. The native benchmark remains a declared-host smoke measurement; the performance registry remains fail-closed and exact host-floor measurement remains incomplete until the required Node binary is available.
