# M2.2ai layout-mode scalar IR

Shared `display`, `position` and `direction` fields now enter scalar IR for view, text and image through exact property-specific literal/token domains derived from the installed React Native types. Capture and Effect Schema decoding reject unsupported values, forged provenance and cross-property literals while preserving independent last-winner ordering.

Focused qualification passed 29 tests with 500 assertions; full qualification passed 510 tests across 84 files with 18,118 assertions. Consumer, docs and performance gates passed. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
