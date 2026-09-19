# M2.2w image overlay-colour scalar IR

`overlayColor` now enters scalar IR only for images, matching the installed React Native ImageStyle contract. The declaration retains exact provenance and literal/token identity under deterministic last-winner ordering. Static admission accepts non-empty native colour strings and legacy tokens; view, text and non-colour inputs fail without compatibility fallback.

Focused qualification passed 61 tests with 1,024 assertions; full qualification passed 450 tests across 72 files with 16,528 assertions. Consumer, docs and performance gates passed. This slice does not validate React Native colour syntax beyond its static string boundary, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
