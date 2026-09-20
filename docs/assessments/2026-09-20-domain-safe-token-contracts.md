# M3.1 domain-safe token contracts

M3.1 adds an additive domain contract entrypoint under `@opsydyn/crumbs-css/tokens`.
`defineToken` and the concise `token.*` factories produce immutable, inspectable
definitions for colour, length, duration, opacity and closed property-enum
domains. `createTokenContract` keeps the existing native `var(--crumbs-…)`
representation while carrying the domain in the authoring type, and
`createTokenTheme` validates every value before publishing the native theme
snapshot.

The admitted domains are deliberately native-oriented:

- colour is a non-empty string, matching the current React Native colour boundary;
- length is a finite number, `auto`, or a finite percentage, with an explicit
  `allowNegative` option;
- duration is a finite non-negative number;
- opacity is finite and bounded to `[0, 1]`; and
- property enums are non-empty, unique literal sets.

`@opsydyn/crumbs-css/tokens/schema` is the dedicated Effect 4 ingress decoder.
The ordinary `tokens` entrypoint contains no Effect import, while the schema
entrypoint exposes only the plain `decodeTokenValue` result type. A property
test compares the service-free runtime predicate with the Effect decoder over
valid and adversarial values. Static fixtures prove native length and enum
properties reject a colour token, and runtime tests cover generated values,
cross-domain values, non-finite numbers, range failures and enum misses.

Legacy `createThemeContract` leaves remain available as the broad migration
brand. Contract/package identity, aliases, scopes, provider binding, atomic
patches and optic updates remain M3.2–M3.6 work. React Native colour values are
still intentionally represented as strings; stricter colour syntax belongs to a
later property-specific decision rather than an invented parser in this slice.
