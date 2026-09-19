# M2.2ao view-interaction scalar IR

View/text-only `borderCurve` and `pointerEvents` now enter scalar IR through exact property-specific literal/token domains derived from the installed React Native ViewStyle contract inherited by TextStyle. Image use fails at both capture and Effect Schema decoding. Unsupported values, forged provenance and cross-property literals are rejected while independent last-winner ordering is preserved.

Focused qualification passed 29 tests with 493 assertions; full qualification passed 541 tests across 90 files with 19,206 assertions. Consumer, docs and performance gates passed. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
