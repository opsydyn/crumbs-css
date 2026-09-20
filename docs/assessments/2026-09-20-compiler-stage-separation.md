# M2.4 compiler stage separation and deterministic emission

M2.4 separates the compatibility compiler into explicit validation, shorthand normalisation, dependency analysis, ownership indexing and code emission boundaries. The public authoring APIs and native IR contracts remain unchanged.

## Stage boundaries

- `record-admission.ts` reads only own enumerable data descriptors. Inherited fields are ignored, enumerable accessors fail before execution, and record keys such as `__proto__` remain ordinary data keys.
- `shorthand-normalization.ts` admits one lossless compatibility scalar at a time. Browser variables, multi-value shorthands and other non-canonical forms return to the CSS converter; native tokens and converter-confirmed canonical values enter the existing IR.
- `dependency-analysis.ts` converts esbuild's input map into project-local Metro imports once. Entry files, outside paths, `node_modules`, generated `dist` files and the compiler's own distribution are excluded; remaining imports are deduplicated and sorted.
- `export-ownership.ts` indexes class ownership once. Export names and discovered class names are ordered deterministically, and duplicate class handles choose the stable lexical export owner for diagnostics.
- `code-emission.ts` owns final module serialisation. Style entries, named exports, dependency imports and plain data records are ordered deterministically; encoded export records retain their authored semantic order, and own `__proto__` keys are emitted as computed properties.

## Qualification boundary

The stage contracts are covered by unit tests and the existing transformer integration suite. Equivalent map insertion orders produce byte-identical modules, dependency analysis is idempotent, export ownership is stable, and accessors cannot execute during emission or indexing. No public API, Effect consumer requirement, external artifact ABI, native-device acceptance or Android qualification changed. M2.7 still owns actual Metro dependency invalidation; M2.5 owns versioned artifact codecs.
