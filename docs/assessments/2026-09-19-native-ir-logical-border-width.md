# M2.2n logical border-width scalar IR

`borderStartWidth` and `borderEndWidth` now enter scalar IR across every primitive. They accept finite numbers or legacy tokens and remain independent from physical sides. The compiler performs no layout-direction inference.

Focused qualification passed 20 tests with 590 assertions; full qualification passed 405 tests across 63 files with 15,336 assertions. Consumer, docs and performance gates passed. No aliases, publication, push or native-device acceptance are included.
