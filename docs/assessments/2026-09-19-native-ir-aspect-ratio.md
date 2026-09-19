# M2.2am aspect-ratio scalar IR and FlexStyle completion

Shared `aspectRatio` now enters scalar IR for view, text and image through an isolated finite-number/non-empty-string/token domain matching the installed React Native declaration. Capture and Effect Schema decoding reject empty strings, nonfinite numbers, nonscalar values and forged provenance while preserving last-winner ordering across both literal representations.

The mixed domain is confined to `aspectRatio`; generated and example-based checks confirm arbitrary strings remain invalid for existing numeric properties. This closes the sole remaining gap identified by the M2.2al audit and completes scalar-IR coverage of the installed FlexStyle surface.

Focused qualification passed 30 tests with 476 assertions; full qualification passed 531 tests across 88 files with 18,937 assertions. Consumer, docs and performance gates passed. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
