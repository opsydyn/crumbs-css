# M2.2ag text-control scalar IR

`textTransform`, `writingDirection` and `userSelect` now enter scalar IR only for text through property-specific literal/token domains matching the installed React Native contract. Capture and Effect Schema decoding share exact value sets, retain independent last-winner ordering and reject wrong-property literals, invalid primitive domains and forged provenance.

Focused qualification passed 29 tests with 515 assertions; full qualification passed 500 tests across 82 files with 17,842 assertions. Consumer, docs and performance gates passed. This slice does not widen arbitrary string admission, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
