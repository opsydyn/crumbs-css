import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { auditPackedRuntimeEntrypoints } from '../../../scripts/packed-runtime-graph';
const root = resolve(import.meta.dir, '..');
const manifest = () => JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const names = (file: string) => { const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true); return ast.statements.flatMap(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause) ? n.exportClause.elements.filter(e => !e.isTypeOnly).map(e => e.name.text) : []).sort(); };
test('algebra_entry_has_ten_values_and_zero_externals', async () => { const m = manifest(); expect(m.exports['./tokens/algebra']).toBeDefined(); const api = await import(resolve(root, m.exports['./tokens/algebra'].import)); expect(Object.keys(api).sort()).toEqual(['TokenAlgebraError', 'createColor', 'createTypography', 'createTypographyScale', 'mixColor', 'multiplyColorAlpha', 'scaleTypography', 'setColorAlpha', 'toNativeColor', 'toNativeTypography'].sort()); const graphs = (await auditPackedRuntimeEntrypoints(root)).filter(g => g.subpath === './tokens/algebra'); expect(graphs).toHaveLength(2); for (const g of graphs) {
    expect(g.externalSpecifiers).toEqual([]);
    expect(g.files.every(f => f.includes('tokens-algebra'))).toBe(true);
} });
test('existing_entry_values_and_aliases_match_control', () => { const control = JSON.parse(readFileSync(resolve(root, 'fixtures/packed-distribution/app/test/algebra-control-values.json'), 'utf8')); const m = manifest(); for (const [key, row] of Object.entries(control.entries) as [
    string,
    any
][]) {
    if (row.target)
        expect(m.exports[key]).toBe(row.target);
    else {
        expect(m.exports[key].import).toBe(row.import);
        expect(m.exports[key].require).toBe(row.require);
        expect(names(resolve(root, row.import))).toEqual(row.values);
    }
} });
