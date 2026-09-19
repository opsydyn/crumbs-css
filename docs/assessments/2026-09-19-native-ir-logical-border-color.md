# M2.2p logical border-color scalar IR

`borderStartColor` and `borderEndColor` now enter scalar IR across every primitive. They admit non-empty native color strings or legacy tokens and remain independent from physical sides without direction inference.

Focused qualification passed 20 tests with 573 assertions; full qualification passed 415 tests across 65 files with 15,609 assertions. Consumer, docs and performance gates passed. No aliases, publication or push are included.
