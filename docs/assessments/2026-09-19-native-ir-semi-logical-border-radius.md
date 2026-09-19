# M2.2s semi-logical corner-radius scalar IR

`borderTopStartRadius`, `borderTopEndRadius`, `borderBottomStartRadius` and `borderBottomEndRadius` now enter scalar IR across view, text and image. Each field keeps exact provenance and independent last-winner ordering beside physical and fully logical corners. Static admission accepts finite numbers and legacy tokens; malformed values fail before compatibility lowering.

Focused qualification passed 25 tests with 760 assertions; full qualification passed 430 tests across 68 files with 16,069 assertions. Consumer, docs and performance gates passed. This slice does not infer layout direction, map between corner naming systems, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
