# M2.2y numeric shadow scalar IR

`shadowOpacity` and `shadowRadius` now enter scalar IR across view, text and image, matching ShadowStyleIOS inheritance in the installed React Native types. Each declaration retains exact provenance, numeric/token identity and independent last-winner ordering. Static admission accepts finite numbers and legacy tokens; unsupported strings and non-finite or structured values fail without compatibility fallback.

Focused qualification passed 31 tests with 944 assertions; full qualification passed 460 tests across 74 files with 16,768 assertions. Consumer, docs and performance gates passed. This slice does not clamp native values, alter structured `shadowOffset`, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
