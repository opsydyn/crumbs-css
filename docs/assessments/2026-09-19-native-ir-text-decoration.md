# M2.2af text-decoration literal scalar IR

`textDecorationLine` and `textDecorationStyle` now enter scalar IR only for text through property-specific literal/token domains matching the installed React Native contract. Capture and Effect Schema decoding share exact value sets, reject wrong-property literals, and preserve both fields independently beside the existing `textDecorationColor` colour domain.

Focused qualification passed 29 tests with 471 assertions; full qualification passed 495 tests across 81 files with 17,697 assertions. Consumer, docs and performance gates passed. This slice does not widen arbitrary string admission, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
