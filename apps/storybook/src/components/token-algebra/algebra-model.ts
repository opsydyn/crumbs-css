import { createColor, mixColor, setColorAlpha, multiplyColorAlpha, toNativeColor, createTypography, createTypographyScale, toNativeTypography } from '@opsydyn/crumbs-css/tokens/algebra';
export type AlgebraInputs = Readonly<{
    foundation: 'blue' | 'red';
    space: 'srgb' | 'srgb-linear';
    ratio: 1.25 | 1.5;
    step: 'caption' | 'body' | 'title';
}>;
export function buildAlgebraScenario(input: AlgebraInputs) {
    const blue = input.foundation === 'blue';
    const foundation = createColor(blue ? '#0000ff' : '#ff0000'), alphaSource = createColor(blue ? '#0000ff40' : '#ff000040');
    const base = createTypography({ fontSize: 16, lineHeight: { ratio: 1.5 }, letterSpacing: -.25 });
    const scale = createTypographyScale(base, { ratio: input.ratio, steps: { caption: -1, body: 0, title: 2 } });
    const generated = { colors: { tint: toNativeColor(mixColor(foundation, createColor('#fff'), { ratio: .5, space: input.space })), replacement: toNativeColor(setColorAlpha(alphaSource, .5)), attenuation: toNativeColor(multiplyColorAlpha(alphaSource, .5)) }, metrics: toNativeTypography(scale[input.step]) };
    // Controls are independent literals/rational values, never calls to the algebra.
    const colors = { tint: blue ? (input.space === 'srgb' ? '#8080ffff' : '#bcbcffff') : (input.space === 'srgb' ? '#ff8080ff' : '#ffbcbcff'), replacement: blue ? '#0000ff80' : '#ff000080', attenuation: blue ? '#0000ff20' : '#ff000020' };
    const metrics = input.step === 'body' ? { fontSize: 16, lineHeight: 24, letterSpacing: -.25 } : input.step === 'title' ? (input.ratio === 1.25 ? { fontSize: 25, lineHeight: 37.5, letterSpacing: -.390625 } : { fontSize: 36, lineHeight: 54, letterSpacing: -.5625 }) : (input.ratio === 1.25 ? { fontSize: 12.8, lineHeight: 19.2, letterSpacing: -.2 } : { fontSize: 16 / 1.5, lineHeight: 24 / 1.5, letterSpacing: -.25 / 1.5 });
    return { generated, control: { colors, metrics }, base: toNativeTypography(base) };
}
