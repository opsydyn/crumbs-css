# M2.2q physical border-radius scalar IR

`borderRadius` and four physical corners now enter scalar IR across every primitive. Broad radius expands in canonical corner order with validated provenance. Finite numbers and legacy tokens are admitted; unsupported CSS radius expressions remain rejected by the compatibility contract.

Focused qualification passed 17 tests with 573 assertions; full qualification passed 420 tests across 66 files with 15,773 assertions. Consumer, docs and performance gates passed. Logical corners remain separate; no publication or push is included.
