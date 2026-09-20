# M2.2az experimental background repeat structured IR

React Native 0.83 exposes `experimental_backgroundRepeat` as a ViewStyle field inherited by TextStyle and absent from ImageStyle. Its object form is a readonly array of records with exactly `x` and `y` repeat keywords (`repeat`, `space`, `round` or `no-repeat`); string forms such as `repeat-x` remain a separate compatibility contract.

Crumbs now captures marked static repeat arrays into the Effect-backed structured IR. Descriptor-safe admission requires a dense array of plain records, exactly enumerable data fields `x` and `y`, and the installed closed keyword domain. Cross-realm plain arrays and records are accepted; accessors, symbols, non-enumerable decorations, sparse or subclassed arrays, extra keys, dynamic values and image primitive domains fail before CSS serialisation.

Effect Schema repeats the repeat-list item shape, property/provenance match and view/text primitive matrix. Admitted lists and records are cloned and deeply frozen. Composition treats the list as one complete property, so an authored empty list replaces an earlier repeat list. Repeat strings remain on the compatibility route, and the experimental field stays outside the CSS-to-React-Native allowlist.

Focused property-based tests cover every keyword pair, whole-value capture, cross-realm admission, malformed descriptor boundaries and last-winner composition. This slice changes no public package export or native ABI and does not establish native-device rendering acceptance. Size, position and gradient image contracts remain separate follow-up slices.
