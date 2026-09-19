# M2.2ac font-family scalar IR

`fontFamily` now enters scalar IR only for text through a dedicated non-empty string/token domain. Each declaration retains exact provenance, literal/token identity and last-winner ordering. Static admission rejects empty strings, non-string literals and view/image use; Effect Schema decoding applies the same primitive and property-specific value rules to forged artifacts.

Focused qualification passed 29 tests with 478 assertions; full qualification passed 480 tests across 78 files with 17,261 assertions. Consumer, docs and performance gates passed. This slice does not admit arbitrary strings to numeric scalar properties, change the public API or artifact ABI, publish, push, or establish native-device acceptance.
