# M2.2al box-sizing scalar IR and FlexStyle audit

Shared `boxSizing` now enters scalar IR for view, text and image through the exact installed `border-box | content-box` literal/token domain. Capture and Effect Schema decoding reject unsupported values and forged provenance while preserving last-winner ordering.

An audit of the installed React Native FlexStyle declaration against the migrated property and alias tables found one remaining field: `aspectRatio`. Its installed `number | string` contract requires an isolated finite-number/non-empty-string/token domain; reusing the unrestricted font-family string domain or widening numeric admission would weaken other property contracts.

Focused qualification passed 29 tests with 587 assertions; full qualification passed 525 tests across 87 files with 18,803 assertions. Consumer, docs and performance gates passed. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
