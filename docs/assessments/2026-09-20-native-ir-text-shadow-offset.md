# M2.2at text-shadow offset structured IR

M2.2at extends the structured native IR from `shadowOffset` to the installed React Native `textShadowOffset` field. The migration keeps the fixed offset value family small and explicit while enforcing the narrower text-only primitive contract.

## Installed boundary

The installed React Native declarations model `textShadowOffset` as a two-field `{ width: number; height: number }` record on text styles. It is distinct from `shadowOffset`, which is inherited by view, text and image styles. Both fields therefore share value admission but not primitive admission. Animated values and runtime-only dynamic objects remain outside static Crumbs capture.

## Decision and implementation

`packages/css/src/compiler/structured-ir.ts` now owns both fixed offset properties. Descriptor-safe capture selects enumerable own fields, rejects accessors and decorated or incomplete records, and admits only finite numeric `width` and `height` values. The structured declaration and provenance schemas accept the two-property union, then check each declaration against its property-specific primitive matrix. `textShadowOffset` can enter only a text block; `shadowOffset` retains the view/text/image matrix.

Capture removes selected structured fields before scalar capture so text shadow offsets cannot leak into CSS conversion or the legacy structured splitter. A marked text rule may contain both offset properties because their shared primitive domain is text. Composition intersects block domains and keeps the last declaration independently for each property, so whole-value replacement and property ordering remain deterministic. Lowering emits frozen native objects keyed by their original property names. Unmarked records continue through the compatibility route.

## Qualification

The focused suite covers text capture and lowering, malformed values, property-specific primitive rejection, both offset properties in one text rule, forged schema nodes and property-based whole-value ordering. Existing shadow-offset and structured-compiler coverage remains green. Full package, consumer, documentation and performance gates are recorded in [qualification evidence](../evidence/2026-09-20-native-ir-text-shadow-offset/qualification.json).

This slice changes no public API or artifact ABI, does not publish or push, and does not establish native-device acceptance. The native benchmark remains a declared-host smoke measurement; exact host-floor measurement remains incomplete until the required Node binary is available.
