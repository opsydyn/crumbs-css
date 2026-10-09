import type { UnbrandedThemeLiteral } from '../theme-token';
declare const colorBrand: unique symbol;
declare const typographyBrand: unique symbol;
export type AlgebraColor = Readonly<{
    $$type: 'crumbs.css.algebra-color';
    version: 1;
    space: 'srgb';
    components: readonly [
        number,
        number,
        number
    ];
    alpha: number;
    [colorBrand]: true;
}>;
export type AlgebraColorInput = UnbrandedThemeLiteral | Readonly<{
    space: 'srgb';
    components: readonly [
        number,
        number,
        number
    ];
    alpha?: number;
}>;
export type ColorInterpolationSpace = 'srgb' | 'srgb-linear';
export type ColorMixOptions = Readonly<{
    ratio: number;
    space: ColorInterpolationSpace;
}>;
export type Typography = Readonly<{
    $$type: 'crumbs.css.typography';
    version: 1;
    unit: 'native';
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    [typographyBrand]: true;
}>;
export type TypographyInput = Readonly<{
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
export type TypographyScaleOptions<TSteps extends Readonly<Record<string, number>> = Readonly<Record<string, number>>> = Readonly<{
    ratio: number;
    steps: TSteps;
}>;
export type TypographyScale<TSteps> = Readonly<{
    [K in keyof TSteps]: Typography;
}>;
export type NativeTypographyStyle = Readonly<{
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
}>;
export type TokenAlgebraErrorCode = 'algebra.invalid-color' | 'algebra.invalid-typography' | 'algebra.invalid-option' | 'algebra.invalid-descriptor' | 'algebra.out-of-range';
/** Aggregate every member's keys before reducing to a pass/fail guard. */
type UnionKeys<T> = T extends unknown ? keyof T : never;
type Closed<T, Keys extends PropertyKey> = Exclude<UnionKeys<T>, Keys> extends never ? unknown : never;
type InvalidColorStrings<T> = T extends string ? (T extends UnbrandedThemeLiteral ? never : true) : never;
export type CheckedColorInput<T> = [InvalidColorStrings<T>] extends [never] ? Closed<Exclude<T, string>, 'space' | 'components' | 'alpha'> : never;
export type CheckedMixOptions<T> = Closed<T, 'ratio' | 'space'>;
type LineHeights<T> = T extends { lineHeight: infer L } ? L : never;
export type CheckedTypographyInput<T> = Closed<T, 'fontSize' | 'lineHeight' | 'letterSpacing'> & Closed<LineHeights<T>, 'ratio' | 'value'>;
type FiniteNames<T> = string extends UnionKeys<T> ? never : number extends UnionKeys<T> ? never : symbol extends UnionKeys<T> ? never : Exclude<UnionKeys<T>, string> extends never ? unknown : never;
type StepMaps<T> = T extends { steps: infer S } ? S : never;
export type CheckedScaleOptions<T> = Closed<T, 'ratio' | 'steps'> & FiniteNames<StepMaps<T>>;
