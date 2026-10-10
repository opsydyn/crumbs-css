import { test, expect } from 'bun:test';
import { auditPackedRuntimeEntrypoints } from '../../../scripts/packed-runtime-graph';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
test('extensions_entry_has_no_runtime_externals', async () => { const graphs = await auditPackedRuntimeEntrypoints(resolve(import.meta.dir, '..')); const entries = graphs.filter(g => g.subpath === './extensions'); expect(entries).toHaveLength(2); for (const g of entries) {
    expect(g.externalSpecifiers).toEqual([]);
    expect(g.classification).toBe('ordinary-runtime');
} });
test('esm_cjs_public_values_and_cross_copy_protocol_match', async () => { const esm = await import('@opsydyn/crumbs-css/extensions'); const cjs = createRequire(import.meta.url)('@opsydyn/crumbs-css/extensions'); expect(Object.keys(esm).sort()).toEqual(['ExtensionError', 'defineExtension']); expect(Object.keys(cjs).sort()).toEqual(['ExtensionError', 'defineExtension']); const a = esm.defineExtension<{
    make: () => () => void;
}>().factory({ importPath: 'pkg/runtime', importName: 'make' })(); const b = cjs.defineExtension().factory({ importPath: 'pkg/runtime', importName: 'make' })(); expect(Object.getOwnPropertyDescriptor(a, Symbol.for('crumbs.css.runtime-extension'))!.value).toEqual(Object.getOwnPropertyDescriptor(b, Symbol.for('crumbs.css.runtime-extension'))!.value); });
import { readFileSync } from 'node:fs';
import { m115BuiltExportNames } from '../../../scripts/m11-5-qualification';
test('old export controls retain every target and built value name', () => {
    const control = JSON.parse(readFileSync(new URL('../fixtures/packed-distribution/app/test/extensions-control-values.json', import.meta.url), 'utf8'));
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    for (const [name, entry] of Object.entries(control.entries) as [
        string,
        {
            target?: string;
            import: string;
            require: string;
            values: string[];
        }
    ][]) {
        if (entry.target) {
            expect(manifest.exports[name]).toBe(entry.target);
            continue;
        }
        expect(manifest.exports[name].import).toBe(entry.import);
        expect(manifest.exports[name].require).toBe(entry.require);
        expect(m115BuiltExportNames(entry.import, readFileSync(new URL('../' + entry.import, import.meta.url), 'utf8'))).toEqual(entry.values);
    }
});
