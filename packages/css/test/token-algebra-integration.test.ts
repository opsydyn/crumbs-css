import { expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { transformCssTsToStyleSheet } from '../src/transformer';
test('algebra_values_use_existing_scalar_contracts', async () => { const dir = mkdtempSync(join(tmpdir(), 'crumbs-algebra-style-')); try {
    symlinkSync(resolve(import.meta.dir, '../node_modules'), join(dir, 'node_modules'), 'dir');
    writeFileSync(join(dir, 'package.json'), '{"name":"@fixture/algebra-compiler","version":"1.0.0"}');
    const file = join(dir, 'case.css.ts');
    writeFileSync(file, `import {createColor,toNativeColor,createTypography,toNativeTypography} from ${JSON.stringify(resolve(import.meta.dir, '../src/tokens/algebra.ts'))};import {textStyle} from ${JSON.stringify(resolve(import.meta.dir, '../src/native-style.ts'))};import {createTokenContract,createTokenTheme,defineToken} from ${JSON.stringify(resolve(import.meta.dir, '../src/tokens/index.ts'))};const metrics=toNativeTypography(createTypography({fontSize:16,lineHeight:{ratio:1.5},letterSpacing:-.25}));const vars=createTokenContract({accent:defineToken('color'),spacing:defineToken({kind:'length',allowNegative:true})},{owner:'@fixture/algebra',name:'a',version:1});const theme=createTokenTheme(vars,{accent:toNativeColor(createColor('#1234')),spacing:metrics.letterSpacing});export const text=textStyle({...metrics,color:theme.values.accent});`);
    const code = await transformCssTsToStyleSheet(file, dir, { useStyleSheet: false, includeStyleExplanations: false });
    const output: Record<string, unknown> = {};
    new Function('exports', code.replace(/export const (\w+) =/g, 'exports.$1 ='))(output);
    expect(output.text).toEqual({ fontSize: 16, lineHeight: 24, letterSpacing: -.25, color: '#11223344' });
}
finally {
    rmSync(dir, { recursive: true, force: true });
} });
