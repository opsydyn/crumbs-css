# M2.2ae text-alignment scalar IR

`textAlign`, `textAlignVertical` and `verticalAlign` now enter scalar IR only for text through property-specific literal/token domains matching the installed React Native contract. Capture and Effect Schema decoding share the same exact value sets, retaining independent field identity and rejecting wrong-property literals even when another alignment property supports them.

Focused qualification passed 29 tests with 528 assertions; full qualification passed 490 tests across 80 files with 17,565 assertions. Consumer, docs and performance gates passed. This slice does not widen arbitrary string admission, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
