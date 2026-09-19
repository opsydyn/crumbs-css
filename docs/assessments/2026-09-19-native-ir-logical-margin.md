# M2.2l logical margin scalar IR

`marginStart`, `marginEnd` and six inline/block aliases now enter scalar IR across every primitive. Inline start/end map to native logical fields; physical and logical fields remain independent for React Native direction resolution. Schema checks reject forged paths and a seeded evaluator agrees with the established logical oracle.

Focused qualification passed 20 tests with 598 assertions; full qualification passed 395 tests across 61 files with 15,046 assertions. Consumer, docs and performance gates passed. No publication, push or native-device acceptance is included.
