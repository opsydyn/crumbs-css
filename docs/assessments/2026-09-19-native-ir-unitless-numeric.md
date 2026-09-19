# M2.2b unitless numeric layout IR

## Outcome

The second production native IR property slice is complete. The numeric compiler block now carries a non-empty ordered declaration family, and Crumbs captures `zIndex`, `elevation`, `flexGrow` and `flexShrink` before browser CSS serialization. Opacity uses the same generalized production path and retains its M2.2a behavior.

The installed React Native 0.85 declarations corrected the initial “view-only” assumption. `zIndex`, `flexGrow` and `flexShrink` belong to `FlexStyle`, which underpins view, text and image styles. `elevation` belongs to `ViewStyle`; `TextStyle` inherits it, while `ImageStyle` does not. The compiler records those domains instead of imposing a narrower invented model.

## Admission and normalization

Each migrated declaration retains its property, finite literal or legacy symbolic token, package-relative source identity, logical property path, Crumbs origin and authored/canonical spelling. React Native exposes these fields as numbers without narrower compile-time ranges, so admission accepts every finite number, including negative values and signed zero. Non-finite values, numeric strings, malformed token strings, objects, arrays and accessors fail before CSS conversion.

The Effect Schema boundary admits only exact non-empty blocks. Declaration property and provenance names must agree, and every block primitive must support every declaration. These checks run again when decoding phase-crossing data, so forged blocks cannot bypass capture. Image elevation produces `CRUMBS_IR_INVALID_PROPERTY`; malformed values produce `CRUMBS_IR_INVALID_VALUE`. Neither error falls back to the legacy CSS route.

Normalization intersects block primitive domains, walks declarations in authored block/declaration order and retains the last declaration for each property. Replacing an existing Map entry also moves it to the final winner position, giving deterministic last-occurrence order. Lowering recreates the existing runtime token payload only after successful admission.

## Independent evidence

The dedicated suite began red because the generalized capture, decode, normalization and lowering exports did not exist. Its seeded 100-case generator compares mixed property/literal/token compositions with the independent M2.1 evaluator. Direct cases cover exact-field mutations, mismatched provenance, forged primitive domains, signed zero, negative finite values, accessors, every Crumbs helper family, both emitters, mixed legacy properties and unmarked vanilla-extract compatibility.

The complete package check passed 334 tests across 51 files with 13,219 assertions, including the unchanged opacity suite and established flex precedence laws. Package build and typechecking passed. Consumer, documentation and host performance results are retained in the matching evidence record.

## Boundaries

This slice does not migrate native `flex`, `flexBasis`, lengths, colours, structured values or unmarked vanilla-extract declarations. Legacy token nodes still carry raw variable names because contract-qualified token identity remains M3. No public API, external artifact ABI, cache, push, publication or native-device acceptance is included.
