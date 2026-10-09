import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readEmittedGraph } from '../bench/effect-boundary-audit';
const root = resolve(import.meta.dir, '..');
test('optional independent container entry publishes six values with React-only graphs', async () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    expect(pkg.exports['./theme/containers']).toEqual({ types: './dist/theme-containers.d.mts', import: './dist/theme-containers.mjs', require: './dist/theme-containers.cjs' });
    for (const suffix of ['mjs', 'cjs']) {
        const api = await import(resolve(root, 'dist/theme-containers.' + suffix));
        expect(Object.keys(api).filter(k => k !== 'default').sort()).toEqual(['ContainerProvider', 'defineContainer', 'getContainerBucket', 'resolveContainerValue', 'useContainerLayout', 'useContainerValue']);
        const graph = readEmittedGraph(resolve(root, 'dist/theme-containers.' + suffix));
        expect(graph.externals).toEqual(['react']);
        for (const [entry, target] of Object.entries(pkg.exports)) {
            if (entry === './theme/containers' || typeof target !== 'object' || entry === './package.json')
                continue;
            const old = readEmittedGraph(resolve(root, (target as Record<string, string>)[suffix === 'mjs' ? 'import' : 'require']!));
            for (const file of old.files)
                expect(readFileSync(file, 'utf8')).not.toMatch(/crumbs[.]css[.]container-(?:context|owner|definition)/);
        }
    }
    const declarations = readFileSync(resolve(root, 'dist/theme-containers.d.mts'), 'utf8');
    for (const name of ['NativeContainerAxis', 'NativeContainerDefinitionInput', 'NativeContainerDefinition', 'NativeContainerBucket', 'NativeContainerValues', 'NativeContainerLayout', 'ContainerProviderProps'])
        expect(declarations).toContain(name);
    expect(readFileSync(resolve(root, 'dist/theme-containers.d.cts'), 'utf8')).toContain('theme-containers.mjs');
});
