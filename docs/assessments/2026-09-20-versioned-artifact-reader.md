# M2.5 versioned artifact reader

M2.5 adds an explicit reader boundary for the internal native artifact wire contract. The artifact already carries a literal `version`; the reader now selects a registered lossless codec from that value and reports unsupported positive versions as a stable contract issue before payload admission. The default registry supports version `1`.

## Reader and codec boundaries

- `contracts/payloads.ts` remains the schema authority and owns the version-1 `nativeArtifactCodec`. It validates and serialises admitted plain data without invoking compiler lowering or generated-module emission.
- `contracts/versioned-reader.ts` owns version dispatch, JSON syntax handling at the reader boundary and the `CRUMBS_CONTRACT_UNSUPPORTED_VERSION` result. `makeNativeArtifactReader([])` models an incompatible reader without changing the version-1 codec.
- Malformed envelopes still use the canonical payload codec so descriptor-safe admission, structured paths and excess-field checks remain unchanged. Version probing reads data descriptors only and never executes accessors.
- Reader laws are tested only over the admitted version-1 domain: encode/decode JSON round trips preserve declaration order and values. Unsupported versions are compatibility failures, not inputs to a codec law.

## Qualification boundary

The focused M2.5 suite covers compatible and incompatible readers, unsupported versions from objects and JSON, malformed JSON, accessor safety and property-based codec round trips. The public authoring API, external artifact publication, native lowering, generated-module emission, Effect consumer requirement and native-device/Android qualification are unchanged.
