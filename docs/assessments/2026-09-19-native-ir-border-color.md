# M2.2o physical border-color scalar IR

`borderColor` and four physical side colors now enter scalar IR across every primitive. Broad color expands with validated provenance. Literal native color strings and legacy tokens are admitted; empty strings and non-string shapes fail without fallback.

The widened Schema string union is constrained by property-specific semantic checks. A regression proves arbitrary color strings cannot enter DimensionValue properties. Focused qualification passed 19 tests with 583 assertions; full qualification passed 410 tests across 64 files with 15,487 assertions. Consumer, docs and performance gates passed. Logical colors remain separate; no publication or push is included.
