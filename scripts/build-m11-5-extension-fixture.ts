import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const repository = resolve(import.meta.dir, '..');
/** Disposable independent package build. Product manifests/lock are never changed. */
export async function buildM115ExtensionFixture(root: string) {
    const source = join(repository, 'packages/css/fixtures/packed-distribution/extensions');
    await mkdir(join(root, 'dist'), { recursive: true });
    await cp(join(source, 'package.json'), join(root, 'package.json'));
    for (const entry of ['authoring', 'runtime', 'pure-runtime'])
        for (const format of ['esm', 'cjs'] as const) {
            const result = await Bun.build({ entrypoints: [join(source, 'src', entry + (entry === 'runtime' ? '.tsx' : '.ts'))], target: 'browser', format, external: ['react', 'react-native', '@opsydyn/crumbs-css/extensions', '@opsydyn/crumbs-css/theme/core'], minify: false });
            if (!result.success || result.outputs.length !== 1)
                throw Error('Independent extension fixture build failed: ' + result.logs.join('\n'));
            const extension = format === 'esm' ? 'mjs' : 'cjs';
            const implementation = `${entry}${format === 'cjs' ? '-impl' : ''}.${extension}`;
            await writeFile(join(root, 'dist', implementation), await result.outputs[0]!.text());
            const names = entry === 'runtime' ? ['createStyledView', 'createThemedView', 'getExtensionCounts', 'subscribeExtensionCounts'] : entry === 'pure-runtime' ? ['calls', 'make'] : ['styledView', 'themedView', 'pureFunction'];
            if (format === 'cjs')
                await writeFile(join(root, 'dist', entry + '.cjs'), `'use strict';\n${names.map(name => `exports.${name} = require('./${implementation}').${name};`).join('\n')}\n`);
            const declarations = entry === 'runtime' ? `import type {ViewProps,ViewStyle} from 'react-native';\nexport type ExtensionCounts=Readonly<{factories:number;mounts:number;rendered?:Readonly<ViewStyle>}>;\nexport declare function createStyledView(baseStyle:ViewStyle):(props:ViewProps)=>import('react').ReactElement;\nexport declare function createThemedView(baseStyle:ViewStyle):(props:ViewProps)=>import('react').ReactElement;\nexport declare function getExtensionCounts():ExtensionCounts;\nexport declare function subscribeExtensionCounts(listener:()=>void):()=>void;\n` : entry === 'pure-runtime' ? `export declare const calls:{argc:number;thisValue:unknown;args:readonly unknown[]}[];\nexport declare function make(...args:unknown[]):()=>readonly unknown[];\n` : `import type * as Runtime from './runtime.${extension}';\nimport type * as PureRuntime from './pure-runtime.${extension}';\nexport declare const styledView:(...args:Parameters<typeof Runtime.createStyledView>)=>ReturnType<typeof Runtime.createStyledView>;\nexport declare const themedView:(...args:Parameters<typeof Runtime.createThemedView>)=>ReturnType<typeof Runtime.createThemedView>;\nexport declare const pureFunction:(...args:Parameters<typeof PureRuntime.make>)=>ReturnType<typeof PureRuntime.make>;\n`;
            await writeFile(join(root, 'dist', entry + '.d.' + (format === 'esm' ? 'mts' : 'cts')), declarations);
        }
    return JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
        name: string;
        version: string;
        peerDependencies: Record<string, string>;
    };
}
