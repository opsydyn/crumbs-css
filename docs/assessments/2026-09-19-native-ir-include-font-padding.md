# M2.2ah boolean scalar IR

Android `includeFontPadding` now enters scalar IR only for text through a property-specific boolean/token domain. The internal value carrier and Effect Schema can represent booleans, while semantic admission confines them to this property. Capture and decoding reject numeric/string lookalikes, invalid primitive domains, forged provenance and boolean widening into existing scalar families.

Focused qualification passed 29 tests with 487 assertions; full qualification passed 505 tests across 83 files with 17,960 assertions. Consumer, docs and performance gates passed. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
