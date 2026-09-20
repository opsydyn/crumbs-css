# M2.6 direct native module emission

M2.6 removes the generated vanilla-module serialisation and reconstruction pass from the native transformer. The required vanilla-extract authoring evaluation still captures styles and named exports once; the transformer now carries that admitted export data and virtual CSS paths directly into native lowering and code emission.

## Direct emission boundary

- `processVanillaFileForNative` returns a structured captured-module result instead of JavaScript source. It contains descriptor-safe named exports and virtual CSS paths.
- The transformer builds the export map from that captured data, then uses the existing ownership index, CSS conversion, native IR lowering, composition and deterministic emitter.
- The obsolete VM helper that reconstructed exports from serialised vanilla-module text is removed. A focused contract test prevents either serialisation or reconstruction helper from returning to the transformer path.

## Generated metadata

Every emitted native module now contains the frozen internal binding:

```ts
{
  $$type: "crumbs.css.native-module",
  version: 1,
  tokens: readonly string[],
  conditions: readonly [],
}
```

The token list is sorted and deduplicated from theme-token references in the final lowered style records. It therefore excludes a token declaration that composition later overrides. Conditions are explicitly an immutable empty list until M6 specifies condition programs and their metadata. A source export named `__crumbsModule` is rejected with the established unsupported-export diagnostic, and the final emitter repeats the reservation for direct internal callers.

## Preserved meaning and limits

The direct path preserves structured style values, ordinary tag-shaped exports, empty style exports and `createTheme` descriptors. The generated metadata is internal compiler output; it is not a public authoring API, external artifact ABI or versioned reader contract. M2.6 does not add condition evaluation, dependency invalidation, persistent caching, native-device acceptance or Android qualification.

## Qualification boundary

The focused M2.6 suite evaluates emitted modules and asserts the descriptor, immutability, surviving-token derivation, structured styles, ordinary data, empty exports, theme descriptors and the reserved binding. The full package check confirms the transformer integration suite and the existing compiler/runtime contract suites. Consumer, documentation and host-gate results are retained in the matching qualification record.
