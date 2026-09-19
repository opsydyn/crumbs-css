# M2.2m physical border-width scalar IR

`borderWidth` and four physical side widths now enter scalar IR across every primitive. Broad width expands to canonical sides with validated provenance and last-winner normalization. Static values are finite numbers or legacy tokens; CSS units, percentages, keywords and structured values fail without fallback.

Focused qualification passed 19 tests with 549 assertions; full qualification passed 400 tests across 62 files with 15,210 assertions. Consumer, docs and performance gates passed. Logical border widths remain separate; no publication, push or native-device acceptance is included.
