# M2.2ad font-variant scalar IR

`fontStyle` and `fontWeight` now enter scalar IR only for text through property-specific literal/token domains matching the installed React Native contract. The compiler preserves all supported string and numeric weight forms exactly. Capture and Effect Schema decoding share one literal table, so unsupported values, view/image use, forged provenance and cross-property literals fail deterministically.

Focused qualification passed 34 tests with 636 assertions; full qualification passed 485 tests across 79 files with 17,419 assertions. Consumer, docs and performance gates passed. This slice does not widen arbitrary string or number admission, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
