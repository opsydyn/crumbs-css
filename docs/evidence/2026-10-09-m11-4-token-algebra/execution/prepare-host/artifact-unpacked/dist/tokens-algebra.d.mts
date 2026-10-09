import { h as UnbrandedThemeLiteral } from "./theme-token-5fLFCMug.mjs";

//#region src/token-algebra/model.d.ts
declare const colorBrand: unique symbol;
declare const typographyBrand: unique symbol;
type AlgebraColor = Readonly<{
  $$type: 'crumbs.css.algebra-color';
  version: 1;
  space: 'srgb';
  components: readonly [number, number, number];
  alpha: number;
  [colorBrand]: true;
}>;
type AlgebraColorInput = UnbrandedThemeLiteral | Readonly<{
  space: 'srgb';
  components: readonly [number, number, number];
  alpha?: number;
}>;
type ColorInterpolationSpace = 'srgb' | 'srgb-linear';
type ColorMixOptions = Readonly<{
  ratio: number;
  space: ColorInterpolationSpace;
}>;
type Typography = Readonly<{
  $$type: 'crumbs.css.typography';
  version: 1;
  unit: 'native';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  [typographyBrand]: true;
}>;
type TypographyInput = Readonly<{
  fontSize: number;
  lineHeight: Readonly<{
    ratio: number;
    value?: never;
  }> | Readonly<{
    value: number;
    ratio?: never;
  }>;
  letterSpacing?: number;
}>;
type TypographyScaleOptions<TSteps extends Readonly<Record<string, number>> = Readonly<Record<string, number>>> = Readonly<{
  ratio: number;
  steps: TSteps;
}>;
type TypographyScale<TSteps> = Readonly<{ [K in keyof TSteps]: Typography }>;
type NativeTypographyStyle = Readonly<{
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}>;
type TokenAlgebraErrorCode = 'algebra.invalid-color' | 'algebra.invalid-typography' | 'algebra.invalid-option' | 'algebra.invalid-descriptor' | 'algebra.out-of-range';
type Closed<T, Keys extends PropertyKey> = Exclude<keyof T, Keys> extends never ? unknown : never;
type CheckedColorInput<T> = T extends string ? (T extends UnbrandedThemeLiteral ? unknown : never) : Closed<T, 'space' | 'components' | 'alpha'>;
type CheckedMixOptions<T> = Closed<T, 'ratio' | 'space'>;
type CheckedTypographyInput<T> = Closed<T, 'fontSize' | 'lineHeight' | 'letterSpacing'> & (T extends {
  lineHeight: infer L;
} ? Closed<L, 'ratio' | 'value'> : never);
type FiniteNames<T> = string extends keyof T ? never : number extends keyof T ? never : symbol extends keyof T ? never : Exclude<keyof T, string> extends never ? unknown : never;
type CheckedScaleOptions<T> = Closed<T, 'ratio' | 'steps'> & (T extends {
  steps: infer S;
} ? FiniteNames<S> : never);
//#endregion
//#region src/token-algebra/color.d.ts
declare function createColor<const T extends AlgebraColorInput>(input: T & CheckedColorInput<NoInfer<T>>): AlgebraColor;
declare function mixColor<const T extends ColorMixOptions>(left: AlgebraColor, right: AlgebraColor, options: T & CheckedMixOptions<NoInfer<T>>): AlgebraColor;
declare function setColorAlpha(value: AlgebraColor, alpha: number): AlgebraColor;
declare function multiplyColorAlpha(value: AlgebraColor, factor: number): AlgebraColor;
declare function toNativeColor(value: AlgebraColor): string;
//#endregion
//#region src/token-algebra/typography.d.ts
declare function createTypography<const T extends TypographyInput>(input: T & CheckedTypographyInput<NoInfer<T>>): Typography;
declare function scaleTypography(value: Typography, factor: number): Typography;
declare function createTypographyScale<const T extends TypographyScaleOptions>(base: Typography, options: T & CheckedScaleOptions<NoInfer<T>>): TypographyScale<T['steps']>;
declare function toNativeTypography(value: Typography): NativeTypographyStyle;
//#endregion
//#region src/token-algebra/error.d.ts
/** Stable codes cross package boundaries; messages never include submitted values. */
declare class TokenAlgebraError extends TypeError {
  readonly code: TokenAlgebraErrorCode;
  constructor(code: TokenAlgebraErrorCode);
}
//#endregion
export { type AlgebraColor, type AlgebraColorInput, type ColorInterpolationSpace, type ColorMixOptions, type NativeTypographyStyle, TokenAlgebraError, type TokenAlgebraErrorCode, type Typography, type TypographyInput, type TypographyScale, type TypographyScaleOptions, createColor, createTypography, createTypographyScale, mixColor, multiplyColorAlpha, scaleTypography, setColorAlpha, toNativeColor, toNativeTypography };