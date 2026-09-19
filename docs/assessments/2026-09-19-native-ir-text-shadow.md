# M2.2z text-shadow scalar IR

`textShadowColor` and `textShadowRadius` now enter scalar IR only for text. Colour accepts non-empty native colour strings or legacy tokens; radius accepts finite numbers or legacy tokens. Both retain exact provenance and independent last-winner ordering. View, image and property-incompatible values fail without compatibility fallback.

Focused qualification passed 28 tests with 805 assertions; full qualification passed 465 tests across 75 files with 16,892 assertions. Consumer, docs and performance gates passed. Structured `textShadowOffset` remains on the structured-value path. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
