import { createColor, mixColor, createTypography, createTypographyScale, toNativeTypography, scaleTypography } from '@opsydyn/crumbs-css/tokens/algebra';
import type { TextStyle } from 'react-native';
import type { NativeThemeVar as LegacyNativeThemeVar, DomainThemeVar } from '@opsydyn/crumbs-css/tokens';
const color = createColor('#1234');
const base = createTypography({ fontSize: 16, lineHeight: { ratio: 1.5 }, letterSpacing: -.25 });
const scale = createTypographyScale(base, { ratio: 1.25, steps: { caption: -1, body: 0, title: 2 } });
const keys: 'caption' | 'body' | 'title' = null as unknown as keyof typeof scale;
const native: TextStyle = toNativeTypography(base);
// @ts-expect-error unknown scale name
scale.unknown;
const options = { ratio: .5, space: 'srgb' as const, extra: true };
// @ts-expect-error predeclared extra mix option
mixColor(color, color, options);
const extraColor = { space: 'srgb' as const, components: [0, 0, 1] as const, extra: true };
// @ts-expect-error predeclared extra colour input
createColor(extraColor);
// @ts-expect-error legacy token handles are not native literal inputs
createColor(null as unknown as LegacyNativeThemeVar);
// @ts-expect-error domain token handles are not native literal inputs
createColor(null as unknown as DomainThemeVar<{
    kind: 'color';
}>);
const extraTypography = { fontSize: 16, lineHeight: { value: 24, extra: 0 } };
// @ts-expect-error predeclared extra line-height key
createTypography(extraTypography);
const extraScale = { ratio: 1.25, steps: { body: 0 }, extra: 1 };
// @ts-expect-error predeclared extra scale option
createTypographyScale(base, extraScale);
const broad: Record<string, number> = { body: 0 };
// @ts-expect-error infinite string map
createTypographyScale(base, { ratio: 1.25, steps: broad });
const numbers: Record<number, number> = { 0: 0 };
// @ts-expect-error infinite numeric map
createTypographyScale(base, { ratio: 1.25, steps: numbers });
const symbols: Record<symbol, number> = {};
// @ts-expect-error infinite symbol map
createTypographyScale(base, { ratio: 1.25, steps: symbols });
// @ts-expect-error colour descriptor is not typography
scaleTypography(color, 1);
// @ts-expect-error wrong unit and no nominal descriptor marker
scaleTypography({ $$type: 'crumbs.css.typography', version: 1, unit: 'px', fontSize: 16, lineHeight: 24, letterSpacing: 0 }, 1);
const predeclared: {
    ratio: number;
    steps: {
        body: number;
        title: number;
    };
} = { ratio: 1.25, steps: { body: 0, title: 2 } };
const exact: 'body' | 'title' = null as unknown as keyof ReturnType<typeof createTypographyScale<typeof predeclared>>;
void [keys, native, exact];

// Every member of a predeclared union must satisfy closed/finite admission.
declare const unionMix: {ratio:number;space:'srgb'} | {ratio:number;space:'srgb';extra:true};
// @ts-expect-error an invalid member cannot hide behind common union keys
mixColor(color,color,unionMix);
declare const unionColor: {space:'srgb';components:readonly[number,number,number]} | {space:'srgb';components:readonly[number,number,number];extra:true};
// @ts-expect-error closed colour admission applies to every union member
createColor(unionColor);
declare const unionHexColor: '#fff' | {space:'srgb';components:readonly[number,number,number];extra:true};
// @ts-expect-error a valid string branch must not discard an invalid object branch
createColor(unionHexColor);
declare const unionHeight: {value:number} | {value:number;extra:true};
// @ts-expect-error nested union extra keys are rejected
createTypography({fontSize:16,lineHeight:unionHeight});
declare const unionTypography: {fontSize:number;lineHeight:{value:number}} | {fontSize:number;lineHeight:{value:number};extra:true};
// @ts-expect-error outer typography union extras are rejected
createTypography(unionTypography);
declare const unionScale: {ratio:number;steps:{body:number}} | {ratio:number;steps:{body:number};extra:true};
// @ts-expect-error outer scale union extras are rejected
createTypographyScale(base,unionScale);
declare const unionSteps: {body:number} | Record<string,number>;
// @ts-expect-error a finite member cannot conceal a broad string map
createTypographyScale(base,{ratio:1.25,steps:unionSteps});
declare const unionNumberSteps: {body:number} | Record<number,number>;
// @ts-expect-error a finite member cannot conceal a broad numeric map
createTypographyScale(base,{ratio:1.25,steps:unionNumberSteps});
declare const unionSymbolSteps: {body:number} | Record<symbol,number>;
// @ts-expect-error a finite member cannot conceal a broad symbol map
createTypographyScale(base,{ratio:1.25,steps:unionSymbolSteps});
declare const validMixUnion: {ratio:number;space:'srgb'} | {ratio:number;space:'srgb-linear'};
mixColor(color,color,validMixUnion);
declare const validColorUnion: '#fff' | {space:'srgb';components:readonly[number,number,number]};
createColor(validColorUnion);
declare const validHeightUnion: {ratio:number;value?:never} | {value:number;ratio?:never};
createTypography({fontSize:16,lineHeight:validHeightUnion});
declare const validStepsUnion: {body:0;title:2} | {body:1;title:3};
const validNamedUnion=createTypographyScale(base,{ratio:1.25,steps:validStepsUnion});
const unionKeys:'body'|'title'=null as unknown as keyof typeof validNamedUnion;
void unionKeys;
