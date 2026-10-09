## Task 2: Typography construction, design scaling and exact named scales

**Files:** Create typography implementation/tests; extend shared admission, model private checked types, admission/property tests and independent typography oracle.

**Interfaces:** Consume Task1's safe ingress/errors and model descriptors. Define `TypographyInput` with fontSize, exact ratio|value lineHeight and optional letterSpacing; `TypographyScaleOptions<TSteps>` exactly ratio/steps; `TypographyScale<TSteps>` is a readonly mapped type over precisely keyof TSteps. Produce:

```ts
createTypography<const T extends TypographyInput>(input: T & CheckedTypographyInput<NoInfer<T>>): Typography;
scaleTypography(value: Typography, factor: number): Typography;
createTypographyScale<const T extends TypographyScaleOptions>(base: Typography, options: T & CheckedScaleOptions<NoInfer<T>>): TypographyScale<T['steps']>;
toNativeTypography(value: Typography): NativeTypographyStyle;
```

- [ ] Write `named_steps_are_computed_directly_from_base`, `metric_emission_contains_only_native_fields`, `invalid_late_step_cannot_publish_partial_scale` and `foreign_typography_accessors_never_execute`.

```ts
const base = createTypography({fontSize:16,lineHeight:{ratio:1.5},letterSpacing:-.25});
const scale = createTypographyScale(base,{ratio:1.25,steps:{title:2,body:0,caption:-1}});
expect(Object.keys(scale)).toEqual(['body','caption','title']);
expect(toNativeTypography(scale.title)).toEqual({fontSize:25,lineHeight:37.5,letterSpacing:-.390625});
expect(toNativeTypography(scale.body)).toEqual({fontSize:16,lineHeight:24,letterSpacing:-.25});
// ratio1e30 with steps{body:0,title:16} throws out-of-range;
// no output/caller mutation is observable. Own constructor:0 is safe.
```

- [ ] Run `bun test packages/css/test/token-algebra-typography.test.ts`. Expected: RED on absent behaviour; admission/refusal regressions must fail on their actual assertion before repair.
- [ ] Implement the Task2 signatures, checking input/output numeric bounds before publishing frozen values. Build a scale with safe own properties after validating every name/exponent/result; use direct base*ratio**step, not chained steps. Expected: 1–32 names, exponents[-16,16], signed spacing, -0 canonicalisation, no font preference or integer rounding.
- [ ] Add ratio/value/default-spacing vectors, ratio/factor errors, exact lower/upper name/count/step boundaries, constructor name, inherited/extra fields, positive float32 underflow and overflow controls. Run the typography/admission suites and package typecheck. Expected: GREEN with all-or-nothing construction, unchanged input and exact native-only output keys.
- [ ] Extend oracle/property tests for key-order independence, repeated numeric steps, composition/direct-from-base within relative1e-12 (absolute1e-12 near zero), and deep immutability; generate only cases whose intermediate/final values admit, plus explicit rejected cases. Run `bun test packages/css/test/token-algebra.property.test.ts`. Expected: GREEN; native metric identity/scaling follows the spec rather than a composite domain.

**Checkpoint:** Colour and typography are separate tested pure units, sharing only admission/type/error infrastructure.

