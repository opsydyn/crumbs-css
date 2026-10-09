/** Pure authoring algebra. No framework or compiler runtime is required. */
export { createColor, mixColor, setColorAlpha, multiplyColorAlpha, toNativeColor } from '../token-algebra/color';
export { createTypography, scaleTypography, createTypographyScale, toNativeTypography } from '../token-algebra/typography';
export { TokenAlgebraError } from '../token-algebra/error';
export type { AlgebraColor, AlgebraColorInput, ColorInterpolationSpace, ColorMixOptions, Typography, TypographyInput, TypographyScaleOptions, TypographyScale, NativeTypographyStyle, TokenAlgebraErrorCode } from '../token-algebra/model';
