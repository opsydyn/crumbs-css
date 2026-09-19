# M2.2x shadow-colour scalar IR

`shadowColor` now enters scalar IR across view, text and image, matching ShadowStyleIOS inheritance in the installed React Native types. The declaration retains exact provenance and literal/token identity under deterministic last-winner ordering. Static admission accepts non-empty native colour strings and legacy tokens; non-colour inputs fail without compatibility fallback.

Focused qualification passed 66 tests with 1,138 assertions; full qualification passed 455 tests across 73 files with 16,642 assertions. Consumer, docs and performance gates passed. This slice does not validate React Native colour syntax beyond its static string boundary, migrate other shadow fields, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
