# M2.2aj primitive-aware overflow scalar IR

`overflow` now enters scalar IR through both a property-wide literal/token domain and a primitive-specific literal table. View and text admit `visible`, `hidden` and `scroll`; image admits `visible` and `hidden`. Mixed domains containing image reject `scroll`, and Effect Schema decoding applies the same rule to forged artifacts. Token references remain valid for every supported primitive because their resolved value is selected at runtime.

Focused qualification passed 29 tests with 704 assertions; full qualification passed 515 tests across 85 files with 18,440 assertions. Consumer, docs and performance gates passed. This slice does not change the public API or artifact ABI, publish, push, or establish native-device acceptance.
