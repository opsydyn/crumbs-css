# M2.2u text-colour scalar IR

`color` now enters scalar IR only for text, matching the installed React Native TextStyle contract. The declaration retains exact provenance and literal/token identity under deterministic last-winner ordering. Static admission accepts non-empty native colour strings and legacy tokens; view, image and non-colour inputs fail without compatibility fallback.

Effect Schema artifact decoding now validates all declarations against the shared per-property primitive table. This closes forged cross-primitive blocks for text colour while retaining the existing elevation constraint.

Focused qualification passed 51 tests with 794 assertions; full qualification passed 440 tests across 70 files with 16,298 assertions. Consumer, docs and performance gates passed. This slice does not validate React Native colour syntax beyond its static string boundary, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
