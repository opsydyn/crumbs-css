# M2.2j logical padding scalar IR

`paddingStart`, `paddingEnd`, `paddingInline`, `paddingBlock`, and their start/end aliases now enter scalar IR across every primitive. Inline start/end map to native logical fields; inline pairs retain the established physical left/right contract. React Native remains responsible for direction-dependent resolution.

Schema checks reject forged alias paths. A seeded 100-case evaluator and the established logical precedence oracle cover ordering. Focused qualification passed 20 tests with 598 assertions; full qualification passed 385 tests across 59 files with 14,748 assertions. Consumer, docs and performance gates passed. No margin migration, publication, push or native-device acceptance is included.
