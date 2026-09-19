# M2.2a production opacity IR vertical

## Outcome

The first production native IR property vertical is complete. Crumbs-authored `opacity` is captured before vanilla-extract serializes browser CSS, admitted through an exact Effect Schema, normalized as immutable compiler data and lowered into both React Native StyleSheet and plain-object output. Unmarked vanilla-extract opacity and every other property continue through the existing qualified converter.

This proves the incremental migration shape without declaring M2.2 complete. It does not add a public API or external artifact format.

## Capture and admission

Crumbs authoring helpers attach non-enumerable internal metadata to descriptor-preserving rule clones. The metadata records a canonical primitive domain: singleton view/text/image domains for primitive helpers and recipes, and the canonical three-kind domain for generic style and variants. The transformer reads the marker in vanilla-extract's adapter callback, before CSS serialization, and removes only opacity from the CSS rule.

The production opacity block retains the package owner, package-relative POSIX source ID, class and property path, origin, authored/canonical property names, primitive domain, and value. Values are finite numbers or an explicitly tagged legacy token reference. The legacy tag is intentional: current theme contracts provide raw variable ownership, while qualified contract/path/domain identity remains M3 work.

Effect Schema rejects excess fields, malformed domains, non-finite values and malformed nodes. Descriptor inspection rejects opacity accessors without invoking them. Invalid marked opacity produces `CRUMBS_IR_INVALID_VALUE` in permissive and strict compatibility modes and is never sent to the CSS fallback.

## Normalization and emission

Opacity block composition intersects primitive domains and selects the last declaration with its property provenance. The compiler's existing authored class-list fold supplies the same last-winner rule across nested and repeated style references. Lowering recreates the existing runtime token-reference payload only after IR admission.

The shared class-map serializer now preserves signed zero for both output modes. Its compact output remains compatible with existing transformer snapshots and handles record keys without prototype-setter semantics. Effect remains bundled into the compiler/tool graph; style and ordinary runtime entrypoints remain Effect-free.

## Independent evidence

The dedicated suite started red on the absent production compiler modules. It now passes 10 tests with 264 assertions. A seeded 100-case generator compares production literal/token last-winner results with the independent M2.1 evaluator. Additional cases cover exact-field mutations, finite and signed-zero literals, legacy tokens, primitive-domain intersection, provenance, all Crumbs helper families, both emitters, unmarked vanilla-extract compatibility and malformed-input failure without fallback.

The complete package run passed 326 tests across 50 files with 12,957 assertions. Build and package typechecking passed, as did Storybook typechecking and the 20-page documentation build. Both workspace and fresh packed-tarball Expo consumers exported web, iOS and Android bundles; all six retained source maps passed runtime isolation. The native-style smoke benchmark stayed within every declared local ceiling. The packed run required normal npm network access after a restricted fresh cache reported `react@undefined`; the unrestricted exact install then passed without a peer override.

The performance registry remains valid but unready: JavaScript frame, UI frame and allocation baselines are missing, retained memory remains diagnostic, and whole-registry performance qualification was not run. Automated Android bundle production is not Android native/device acceptance; that remains parked until last.

## Boundaries

There is no qualified token identity, property-domain catalogue, external codec/artifact, cache, vanilla-extract adapter IR migration, public API, release, push or publication in this slice. Source coordinates and export ownership are retained only when available; ownership indexing remains M2.4. M2.2 stays open for additional exact property-family migrations.
