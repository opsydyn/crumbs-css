# M2.2aa text-decoration colour scalar IR

`textDecorationColor` now enters scalar IR only for text, matching the installed React Native TextStyle contract. The declaration retains exact provenance and literal/token identity under deterministic last-winner ordering. Static admission accepts non-empty native colour strings and legacy tokens; view, image and non-colour inputs fail without compatibility fallback.

Focused qualification passed 38 tests with 383 assertions; full qualification passed 470 tests across 76 files with 17,007 assertions. Consumer, docs and performance gates passed. This slice does not migrate other text-decoration fields, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
