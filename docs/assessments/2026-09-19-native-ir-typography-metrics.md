# M2.2ab typography-metric scalar IR

`fontSize`, `letterSpacing` and `lineHeight` now enter scalar IR only for text, matching the installed React Native TextStyle contract. Each declaration retains exact provenance, numeric/token identity and independent last-winner ordering. Static admission accepts finite numbers and legacy tokens; view, image, CSS unit strings and non-finite values fail without compatibility fallback.

Focused qualification passed 43 tests with 521 assertions; full qualification passed 475 tests across 77 files with 17,145 assertions. Consumer, docs and performance gates passed. This slice does not parse CSS units, clamp native values, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
