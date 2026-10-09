## Task 1: Closed colour data, errors and independent colour algebra

**Files:** Create model/error/admission/color modules, colour/admission/property tests and the colour part of `test/oracles/token-algebra.ts` from the map.

**Interfaces:** Define all spec public model types, with type-only brands and exact descriptor fields. `AlgebraColorInput` uses the existing type-only `UnbrandedThemeLiteral` or the closed structured sRGB input so known legacy/domain token brands are not accepted as colour strings. Private checked-input types infer raw arguments first, then inspect their keys through NoInfer; no runtime import of theme-token. Produce:

```ts
createColor<const T extends AlgebraColorInput>(input: T & CheckedColorInput<NoInfer<T>>): AlgebraColor;
mixColor<const T extends ColorMixOptions>(left: AlgebraColor, right: AlgebraColor, options: T & CheckedMixOptions<NoInfer<T>>): AlgebraColor;
setColorAlpha(value: AlgebraColor, alpha: number): AlgebraColor;
multiplyColorAlpha(value: AlgebraColor, factor: number): AlgebraColor;
toNativeColor(value: AlgebraColor): string;
// Private shared helpers admit own data descriptors, finite fields,
// exact tuple/record keys and spec-versioned colour/typography operands.
```

- [ ] Write named tests `encoded_and_linear_midpoints_have_distinct_native_bytes`, `alpha_replacement_and_attenuation_preserve_rgb`, `unused_endpoint_accessors_never_execute` and `native_quantisation_is_a_single_boundary`. Assertions:

```ts
const black = createColor('#000'), white = createColor('#fff');
expect(toNativeColor(mixColor(black, white, {ratio: .5, space: 'srgb'}))).toBe('#808080ff');
expect(toNativeColor(mixColor(black, white, {ratio: .5, space: 'srgb-linear'}))).toBe('#bcbcbcff');
const blue = createColor('#0000ff40');
expect(toNativeColor(setColorAlpha(blue, .5))).toBe('#0000ff80');
expect(toNativeColor(multiplyColorAlpha(blue, .5))).toBe('#0000ff20');
// A forged right operand with an alpha getter must throw at ratio0,
// getter execution count remains0, and the left operand is unchanged.
```

- [ ] Run `bun test packages/css/test/token-algebra-color.test.ts packages/css/test/token-algebra-admission.test.ts`. Expected: RED because the new API/admission behaviour is absent. Record actual failing assertions, not an unrelated dependency failure; verify each additional boundary test RED before its implementation.
- [ ] Implement the Task1 signatures in the named modules using descriptor-first reads and the spec's premultiplied/transfer equations. Add bounded TokenAlgebraError codes and deeply frozen copied output; endpoint values are copied after both operands/options admit. Expected: ten promised error/API names remain scoped to the later facade, no registry or new old-entry import.
- [ ] Add hex-width/alpha-order/endpoints/unequal-alpha/zero-alpha/rounding/error vectors and getter/symbol/hidden/prototype/cycle/sparse/decorated/non-finite/refusal controls. Pin representative error codes: invalid hex→invalid-color, forged operand→invalid-descriptor, unsupported space→invalid-option, finite alpha1.1→out-of-range. Run the Task1 command again plus `bun run --cwd packages/css typecheck`. Expected: GREEN, zero accessor executions and source input immutability.
- [ ] Add `premultiplied_symmetry_includes_subnormal_alpha` and independent-oracle property laws, seed20261009 with200 runs: bounds, exact endpoint values, swapped1-t premultiplied channels/alpha within1e-12, separately well-conditioned RGB vectors, and emit/parse/emit byte stability with1/510+8EPS quantisation bound. Test alpha0, Number.MIN_VALUE, representable near-endpoints and -0 explicitly. Run `bun test packages/css/test/token-algebra.property.test.ts`. Expected: GREEN; oracle never imports product math, no false universal hidden-RGB or associativity law.

**Checkpoint:** Independently tested immutable colour derivation and common safe ingress; no public package entry has been enabled yet.

