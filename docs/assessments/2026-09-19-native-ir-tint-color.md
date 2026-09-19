# M2.2v image tint-colour scalar IR

`tintColor` now enters scalar IR only for images, matching the installed React Native ImageStyle contract. The declaration retains exact provenance and literal/token identity under deterministic last-winner ordering. Static admission accepts non-empty native colour strings and legacy tokens; view, text and non-colour inputs fail without compatibility fallback.

Focused qualification passed 56 tests with 909 assertions; full qualification passed 445 tests across 71 files with 16,413 assertions. Consumer, docs and performance gates passed. This slice does not validate React Native colour syntax beyond its static string boundary, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
