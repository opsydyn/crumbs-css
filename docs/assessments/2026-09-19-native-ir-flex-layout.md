# M2.2ak flex-layout scalar IR

The shared `flexDirection`, `flexWrap`, `alignContent`, `alignItems`, `alignSelf` and `justifyContent` fields now enter scalar IR for view, text and image through exact property-specific literal/token domains derived from the installed React Native types. Capture and Effect Schema decoding reject unsupported values, forged provenance and cross-property literals while preserving independent last-winner ordering.

Focused qualification passed 29 tests with 791 assertions; full qualification passed 520 tests across 86 files with 18,685 assertions. Consumer, docs and performance gates passed. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
