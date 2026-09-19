# M2.2an visibility and cursor scalar IR

Shared `backfaceVisibility` and `cursor` now enter scalar IR for view, text and image through exact property-specific literal/token domains derived from the installed React Native types. Capture and Effect Schema decoding reject unsupported values, forged provenance and cross-property literals while preserving independent last-winner ordering.

Focused qualification passed 30 tests with 491 assertions; full qualification passed 536 tests across 89 files with 19,070 assertions. Consumer, docs and performance gates passed. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
