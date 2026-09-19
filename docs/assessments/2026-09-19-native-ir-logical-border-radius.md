# M2.2r logical corner-radius scalar IR

`borderStartStartRadius`, `borderStartEndRadius`, `borderEndStartRadius` and `borderEndEndRadius` now enter scalar IR across view, text and image. Each field keeps exact provenance and independent last-winner ordering beside physical corners. Static admission accepts finite numbers and legacy tokens; malformed values fail before compatibility lowering.

Focused qualification passed 20 tests with 612 assertions; full qualification passed 425 tests across 67 files with 15,921 assertions. Consumer, docs and performance gates passed. Semi-logical top/bottom start/end corners remain on the compatibility route. This slice does not change the public API or artifact ABI and includes no publication, push or native-device acceptance.
