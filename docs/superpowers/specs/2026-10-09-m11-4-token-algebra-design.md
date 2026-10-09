# M11.4 — Pure colour and typography token algebra

**Status:** Approved as written by Alan Currie on 2026-10-09 following commit `a29867e`. The approved [implementation plan](../plans/2026-10-09-m11-4-token-algebra.md) is complete in the implementation commit containing this record; see the [assessment](../../assessments/2026-10-09-m11-4-token-algebra.md) for reviewed host/native qualification and limits.

**Date:** 2026-10-09.

**Roadmap:** [M11.4](../../roadmap.md#m11--deliver-the-selected-native-extensions).

**Source reviewed:** `668a712b5d974cd0057fabb1211019033a615274`, managed `crumbs-main-merge` checkout, local `main`.

**Governing decisions:** native semantics, runtime isolation and explicit expression/protocol boundaries in the [native design-system compiler ADR](../../decisions/adopt-native-design-system-compiler.md). This spec does not accept the entire proposed ADR.

## Intent, evidence and scope

Give design-system authors a small, pure vocabulary for deriving consistent colour values and named typography metrics, then feeding ordinary native values into existing contracts and styles. Make mixing space, alpha meaning, precision and font-scaling ownership visible in the API. Preserve the library's existing token, expression, compiler, theme, recipe, variable, container and motion behaviour.

The selected reference case derives several swatches from one brand colour and generates caption/body/title metrics from one base typography value. Changing a foundation updates the deliberately derived values together. Native controls select a foundation, interpolation space and typography ratio, with generated output beside independently authored control samples. This demonstrates coherent authoring rather than a new mutable theme authority.

The [2026-09-30 assessment](../../assessments/2026-09-30-m11-token-algebra.md) remains historical: the existing reference palette and font-scale sample did not demonstrate repeated derivation needs. The user has now selected this as pre-release product scope. Do not claim new adopter-demand evidence or silently regenerate the existing semantic palette. Mixing alone does not establish readable foregrounds or accessibility conformance.

Deliver one complete additive M11.4 implementation slice, relevant property/type/cost checks, a shared internal native Expo reference, packed-consumer qualification, documentation and one implementation commit. Include iOS Simulator and Android emulator checks. Physical devices, spoken readers, live authored HMR and release-FPS work stay deferred. No product dependency, peer range, version, lockfile or Effect 4 pin upgrade is needed.

## Approaches and selected boundary

1. **Pure authoring algebra — recommended and specified here.** Compute immutable values at definition time or on an explicit application input change. Emit colour strings and numeric metrics that existing token contracts already accept. This adds composable functions without new runtime subscriptions, caches or expression node kinds.
2. **Live theme-expression operators.** Extend the expression AST, compiler folding, evaluator, dependency planning and payload admission. This could support lazy token-backed derivation, but changes a portable protocol and adds runtime surface without a demonstrated consumer requirement. Exclude it from this slice.
3. **A general colour/typography engine.** A third-party engine or broad native parser could support perceptual spaces, gamut mapping and palette generation. That requires a larger dependency, syntax and compatibility contract. Exclude it from this slice.

The helpers are eager and composable: `toNativeColor(setColorAlpha(mixColor(...), 0.4))` is ordinary function composition. Values are frozen inspectable data, not closures or portable execution programs. This is the functional differentiation: explicitly checked, bounded operations, immutable outputs, explicit conversion boundaries and independently tested laws. It introduces neither an Effect service nor an application Effect dependency.

## Public entry and API

Add exactly one optional public subpath, `@opsydyn/crumbs-css/tokens/algebra`, with independently built ESM/CommonJS JavaScript and declarations in the existing canonical declaration graph. Its value exports are exactly:

- `createColor`, `mixColor`, `setColorAlpha`, `multiplyColorAlpha`, `toNativeColor`;
- `createTypography`, `scaleTypography`, `createTypographyScale`, `toNativeTypography`;
- `TokenAlgebraError`.

Export matching types: `AlgebraColor`, `AlgebraColorInput`, `ColorInterpolationSpace`, `ColorMixOptions`, `Typography`, `TypographyInput`, `TypographyScaleOptions`, `TypographyScale`, `NativeTypographyStyle` and `TokenAlgebraErrorCode`. Type parameters retain exact statically known named scale keys. Reject broad string/number/symbol index signatures for typed step inputs; neither an options argument nor an unrelated generic widens those keys. Runtime admission still checks JSON/cast inputs independently. Type-only descriptor brands carry no runtime symbol or package-instance authority.

The new JavaScript entry has no external runtime imports: no React, React Native, Effect, vanilla-extract, compiler, Node or browser modules. Existing entries do not re-export its values or import its implementation. Pure host use requires no native runtime. No native Hook is added; applications use existing theme creation/scopes and normal React memoisation when inputs change.

```ts
import {
  createColor, mixColor, setColorAlpha, toNativeColor,
  createTypography, createTypographyScale, toNativeTypography,
} from '@opsydyn/crumbs-css/tokens/algebra';

const brand = createColor('#087f8c');
const white = createColor('#ffffff');
const tint = mixColor(brand, white, { ratio: 0.2, space: 'srgb-linear' });
const overlay = setColorAlpha(brand, 0.25);

const baseType = createTypography({
  fontSize: 16,
  lineHeight: { ratio: 1.5 },
  letterSpacing: 0,
});
const type = createTypographyScale(baseType, {
  ratio: 1.25,
  steps: { caption: -1, body: 0, title: 2 },
});

const derivedValues = {
  accent: toNativeColor(brand),
  tint: toNativeColor(tint),
  overlay: toNativeColor(overlay),
};
const bodyStyle = toNativeTypography(type.body);
// type.unknown is a type error. bodyStyle contains only native metrics.
// Feed strings/numbers into an existing createTokenTheme contract, or
// spread bodyStyle into an existing textStyle declaration.
```

## Colour values and admission

`createColor(input)` accepts either a string in the exact hex grammar `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA` (ASCII hex, either case, no surrounding whitespace), or a plain record `{ space: 'srgb', components: [r, g, b], alpha?: number }`. Components are encoded sRGB fractions in `[0, 1]`; omitted alpha is `1`. Hex alpha is the last component, never Android ARGB order.

Named colours, RGB/HSL strings, numbers, wide-gamut colours, `PlatformColor`, `DynamicColorIOS`, token handles, local variables and arbitrary colour objects are not algebra inputs. Existing native colour-string admission stays unchanged; this helper is an explicit bounded authoring format rather than a replacement native parser. An existing string can still pass through the existing style/token APIs without entering this algebra.

The returned `AlgebraColor` is a deeply frozen plain-data descriptor with exactly `$$type: 'crumbs.css.algebra-color'`, `version: 1`, `space: 'srgb'`, `components: readonly [number, number, number]` and `alpha: number`. Keep encoded RGB and alpha as binary64 numbers between operations, retaining invisible RGB when alpha is zero. Canonicalise negative zero to positive zero only within the new algebra; do not change older numeric APIs.

All public functions admit every operand and option before calculating, including an unselected endpoint at ratio zero or one. Inspect own property descriptors before reading their values. Reject getters/setters without invocation, symbol/hidden/extra/inherited fields, unsupported prototypes, decorated or sparse tuples, explicit `undefined`, cycles, unsupported tags/versions and non-finite/out-of-range numbers. A structured colour contains exactly three own indexed components and the array's standard length descriptor. Object/null prototypes are allowed for plain records; custom/cross-realm prototypes and arbitrary Proxy behaviour remain outside the same-realm contract.

Admit correctly shaped descriptors from a second installed package copy without a registry or object-identity test; validate them at each public ingress. Operations produce new frozen output and leave operands unchanged. No output-reference reuse, global interning, history retention or cross-call cache is promised. Maximum input string length is nine characters; structural colour admission is fixed size. Descriptor shape is inspectable, but this slice adds no general codec or user-function serialization protocol.

## Mixing, alpha and native colour output

`mixColor(left, right, { ratio, space })` requires a finite ratio in `[0, 1]` and an explicit space, either `'srgb'` or `'srgb-linear'`. Ratio zero selects the left value; one selects the right. No default space or extrapolation is implicit.

For an interior ratio `t`, let `w0 = 1 - t`, `w1 = t`, and `a = w0*a0 + w1*a1`. Interpolate premultiplied channels in the requested space: `c = (w0*a0*c0 + w1*a1*c1) / a`. If the computed `a` is zero, including binary64 underflow, return transparent black for that interior mixture. Endpoint selection preserves the selected colour's invisible RGB. Mixing is interpolation rather than source-over compositing or an automatic contrast adjustment.

For `'srgb'`, the channel calculation uses encoded components directly. For `'srgb-linear'`, decode first: `c/12.92` when `c <= 0.04045`, otherwise `((c+0.055)/1.055)^2.4`; after mixing, encode `12.92*c` when `c <= 0.0031308`, otherwise `1.055*c^(1/2.4)-0.055`. These equations and alpha premultiplication follow the relevant [CSS Color 4](https://www.w3.org/TR/css-color-4/#interpolation-alpha) definitions; the small supported subset is a Crumbs contract, not a claim to implement CSS colour syntax or `color-mix()`.

In-gamut inputs and convex weights require no gamut mapping. Permit only a roundoff correction within eight `Number.EPSILON` of `[0, 1]`; a larger excursion fails rather than silently clipping authored values. There are no OKLab/OKLCH, P3, hue, lighten/darken, palette or contrast-selection helpers. Authors can explicitly mix with white or black when that is their intended design operation.

`setColorAlpha(value, alpha)` replaces alpha with a finite fraction in `[0, 1]`, preserving RGB. `multiplyColorAlpha(value, factor)` multiplies existing alpha by a finite factor in `[0, 1]`, preserving RGB. The separate names distinguish replacement from attenuation. Invalid factors are errors rather than saturation; neither operator changes a view's overall opacity.

`toNativeColor(value)` emits a lowercase `#rrggbbaa` string, quantising each component exactly once using `Math.round(component * 255)`, with two hex digits per component. This is supported by the [React Native 0.85 colour reference](https://reactnative.dev/docs/0.85/colors). Emission is intentionally eight-bit; internal algebra does not repeatedly quantise. `createColor(toNativeColor(value))` preserves emitted bytes on a second emission, with a mathematical absolute quantisation-error bound of `1/510` per component (checks allow eight `Number.EPSILON` for binary64 representation). Invisible RGB remains present in the encoded output. Native compositing/display accuracy beyond this boundary is a platform matter.

Do not promise bit-identical transcendental results across all JavaScript engines or exact associativity of floating-point calculations. Qualification checks independent reference vectors and laws with explicit tolerances, and separately checks emitted native bytes for the selected vectors.

## Typography values, scaling and units

`createTypography({ fontSize, lineHeight, letterSpacing? })` requires a positive finite `fontSize`. `lineHeight` is exactly `{ ratio: positiveFiniteNumber }` or `{ value: positiveFiniteNumber }`; the ratio form computes `fontSize * ratio`, while the value form supplies an absolute native metric. Omitted `letterSpacing` is zero; it otherwise accepts a finite positive, zero or negative native metric.

The output `Typography` descriptor has exactly `$$type: 'crumbs.css.typography'`, `version: 1`, `unit: 'native'`, `fontSize`, `lineHeight` and `letterSpacing`. It is frozen, plain and admits a second package copy under the same field/descriptor rules as colour. Values are ordinary unscaled React Native style numbers; `unit: 'native'` does not mean physical pixels, CSS `px`/`rem`/`em`, percentages or device-pixel-ratio multiplication.

Every metric and calculated result must be finite and remain finite when converted with `Math.fround`; positive font size/line height must also remain positive under that conversion. Preserve authored binary64 precision in returned fields; the check does not round them to float32. No silent metric clipping or integer rounding is allowed. This is a narrower new helper boundary; existing literal style admission is not tightened. A positive line height smaller than font size is allowed and is the author's layout responsibility.

`scaleTypography(value, factor)` accepts a positive finite factor and multiplies all three metrics, including letter spacing. It preserves proportions and returns a new admitted descriptor. This is a deliberate design-scale transformation, not an accessibility font-scale adapter.

`createTypographyScale(base, { ratio, steps })` accepts a positive finite ratio and a closed nonempty plain record of 1–32 named steps. Names match `[A-Za-z][A-Za-z0-9_-]{0,63}`; each step is an integer in `[-16, 16]`. Negative zero means zero. Each output is `scaleTypography(base, ratio ** step)`, calculated directly from the base rather than recursively from a previously rounded step. Admit the entire input and every resulting metric before returning the frozen map; one invalid step fails the whole operation. Record insertion order does not alter values; emit names in ASCII lexical order. Use safe own-property construction even for names such as `constructor`.

`TypographyScale<TSteps>` retains precisely `keyof TSteps`. Repeated numeric steps under different names are allowed. No hidden default steps, fixed display/body conventions, percentage metrics, font asset loading, family/weight inference or vertical-rhythm rounding are introduced.

`toNativeTypography(value)` returns a frozen ordinary record containing exactly numeric `fontSize`, `lineHeight` and `letterSpacing`. It contains no descriptor tag or unit field. The output is structurally compatible with the corresponding [React Native text metrics](https://reactnative.dev/docs/0.85/text-style-props). Compose it with separately authored font family, weight, colour and existing token styles. Tagged descriptors are authoring data; convert them before spreading into native/compiler style declarations. Existing primitive/property validation remains authoritative.

Typography remains three scalar values in existing token contracts. Authors may assign them to length tokens; negative letter spacing requires the existing negative-length permission. No composite typography token domain, changed alias identity, dynamic font-scale operand or special recipe behaviour is added.

## Native font scaling and application ownership

Emit unscaled base metrics and leave native user font scaling to `Text`. The reference explicitly uses `allowFontScaling={true}`; the helper does not inspect `PixelRatio`, `useWindowDimensions`, conditions or native settings. The [React Native Text contract](https://reactnative.dev/docs/0.85/text#allowfontscaling) owns that preference and its component props. Applications choose `maxFontSizeMultiplier` and other fitting controls separately. Do not bake the same native font scale into helper output and then let `Text` scale it again.

Changing a brand or design-scale control explicitly rebuilds its derived application data. It does not subscribe the helper, mutate an older theme or overwrite token ownership. Create module-level derived values for fixed foundations; memoise application-derived values against their actual inputs. The helper has no per-frame work, listeners or background lifecycle.

## Errors, bounds and costs

`TokenAlgebraError` extends `TypeError` with one readonly code from `algebra.invalid-color`, `algebra.invalid-typography`, `algebra.invalid-option`, `algebra.invalid-descriptor` or `algebra.out-of-range`. Malformed constructor values use the corresponding colour/typography code; malformed operand descriptors use invalid-descriptor; malformed options use invalid-option; admitted numeric values/results outside the specified bounds use out-of-range. Codes are stable across package copies; an `instanceof` check alone is not the portable identification contract.

Use bounded diagnostic messages and field paths; do not stringify arbitrary inputs, run input accessors or echo unbounded names/strings. Fail synchronously before output publication, without returning a partially built scale or mutating operands. Do not introduce generic Effect errors or alter existing diagnostic meanings.

Colour operation/metric costs are fixed size; named scale construction is proportional to the admitted step count, capped at 32. Describe reflection/admission cost honestly: obtaining keys still depends on the submitted record, even when excess keys are rejected. No unbounded strings, recursive expression traversal, service state or persistent caches belong to the new implementation.

Record raw/gzip ESM/CommonJS entry sizes, forbidden import graphs, cold pure imports and reproducible source/packed identities. Measure separate processes for colour construction/mix/alpha/emission and 3/32-step typography construction with named counts and consumed results. Use semantic bounds and output checks alongside timings. Do not introduce speculative numerical thresholds or claim native FPS improvement from host microbenchmarks.

Run the unchanged matched M10.5 collector for the final source/artifact binding. Preserve the existing warm-transform failure and historical incremental failure/disposition, current matching-runner prerequisites and numerical policy. New blocking failures require explicit disposition; existing deferrals are not blanket approval. Recollect only for invalid prerequisite evidence or changed review-repair bytes, not to chase timing passes. Feature acceptance is not release-policy qualification or publication authority.

## Implementation qualification contract

The implementation plan must include the following, as one coherent slice:

- Installed-declaration positive and negative cases for exact named scale keys, operands, closed options, malformed predeclared records, domain misuse and native metric outputs. Invalid numeric ranges remain runtime checks where TypeScript cannot establish them. Include true ESM-first and CJS-first imports; verify observed load order rather than a label selecting a later function.
- Independent colour reference vectors for all hex widths, alpha placement, endpoint selection, encoded versus linear black/white midpoint (emitted `#808080ff` versus `#bcbcbcff`), unequal-alpha premultiplication, fully transparent interiors, replacement versus multiplication, rounding boundaries and invalid inputs. Include alpha-bearing source colours whose RGB would be lost by an accidental view-opacity implementation.
- Property tests for immutability, bounds, endpoint value preservation, swapping operands with `1-t`, alpha semantics and quantised emit/parse/emit stability. For arbitrary fractions, compare alpha and alpha-premultiplied encoded channels within absolute tolerance `1e-12`; invisible/near-zero-alpha RGB alone is numerically ill-conditioned and is not a universal symmetry law. Independently selected well-conditioned reference vectors also compare unpremultiplied channels within `1e-12`. A computed zero-alpha interior has canonical black RGB and is explicitly outside hidden-RGB idempotence claims. An independent oracle must not call product helpers to calculate expected values.
- Typography reference and property cases for ratio/absolute line height, omitted/negative spacing, direct-from-base named exponents, key-order independence, all-or-nothing failure, float32 overflow/positive underflow, exact keys and scale composition within relative tolerance `1e-12` (absolute `1e-12` near zero). Equality laws apply only when all intermediate and final values remain admitted.
- Adversarial getter counters, symbols, hidden/extra/inherited fields, prototypes, cycles, sparse/decorated tuples, explicit undefined, unsupported descriptor versions, non-finite numbers, oversized names/step maps and second-copy descriptor admission. Do not equate casts with admission or promise arbitrary Proxy safety.
- Existing contract/style integration controls: generated strings/numbers remain ordinary values; negative spacing uses the declared permission; text metrics reach text declarations; existing colour, scalar, token/recipe, compiler and expression meanings/export surfaces remain unchanged. Check dependency isolation on every old entry and add the new entry to the package graph controls without weakening existing denials.
- A shared public-API-only Storybook/playground/packed Expo panel that selects two authored foundations, encoded/linear mixing and two named type ratios. Render generated colour/alpha/text results beside separately authored expected controls for finite scenarios. Preserve the existing reference palette and accessibility sample. Keep fixture telemetry finite and current-state only.
- Fresh packed iOS Simulator and Android emulator interaction receipts bound to the final source/tarball/installation/peer identities: initial rendering; foundation and space changes; alpha replacement/attenuation over known opaque backgrounds; caption/body/title selection; ratio changes; and independence from an unrelated control. Inspect actual images and hierarchy/layout observations, not telemetry alone. Include genuine native font-size preference change and restoration, observed native scale/event, unchanged helper base metrics and changed native text layout with scaling enabled. Do not claim proportional glyph geometry, no clipping for all fonts, spoken-reader conformance or physical-device acceptance from that sample.
- Fresh package build and strict package/Storybook/playground types, relevant full suites, an owned reproducible docs build, packed install/hash/export/type checks, genuine Node floor/current pure-import processes consuming two copies, and real Expo exports for iOS/Android/web. Web export establishes packaging; interactive browser acceptance remains separately unperformed. Preserve dependency roots and owned native-setting/device restoration evidence.
- Entry/cold-import/helper cost records and unchanged matched M10.5 comparison, one fresh whole-slice review and one Important/Critical RED/GREEN repair pass using the approved inline execution workflow. Refresh changed-byte qualification after repairs; do not run a second review or repeatedly remeasure unchanged valid cohorts.

Keep the evidence proportional to this eager helper feature. Native motion interruption/read-cohort phases are not requirements for M11.4. Required failed attempts and exact accepted receipts remain distinguishable; retained telemetry or an export command cannot substitute for the stated rendered/native-setting checks.

## Acceptance and handoff

Accept M11.4 when the specified authoring/type/admission/math/integration/isolation/packed/native checks pass, relevant costs and limitations are retained, dependencies/settings are restored, documentation/roadmap match the evidence and the single implementation slice is committed. No source-only demo or unbound synthetic native receipt establishes distributable compatibility.

This document is the concrete design for review; approval of feature scope alone does not mark it approved. After written-spec approval, prepare the M11.4 implementation plan for review and execution-method selection. Preserve the user's preference for inline execution, Android inclusion, one complete implementation slice and a commit after the slice. After its implementation commit recommend **M11.5 — constrained serialization and extension protocol**. Publication and M10.5 release closure remain separate.
