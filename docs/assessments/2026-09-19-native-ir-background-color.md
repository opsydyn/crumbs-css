# M2.2t background-colour scalar IR

`backgroundColor` now enters scalar IR across view, text and image, matching the installed React Native style types. The declaration retains exact provenance and literal/token identity under deterministic last-winner ordering. Static admission accepts non-empty native colour strings and legacy tokens; non-colour shapes fail before compatibility lowering.

Focused qualification passed 38 tests with 416 assertions; full qualification passed 435 tests across 69 files with 16,183 assertions. Consumer, docs and performance gates passed. This slice does not validate React Native colour syntax beyond its static string boundary, widen other scalar value domains, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
