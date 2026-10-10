import { expect, it } from 'bun:test';
import { defineExtension } from '../src/extensions';
import { captureNativeExports } from '../src/export-values';
import { indexStyleExportOwnership } from '../src/compiler/export-ownership';
import { createNativeModuleMetadata } from '../src/compiler/native-module-metadata';
import { createLocalVarsMetadata } from '../src/compiler/local-vars-metadata';
import { captureManifestSidecar } from '../src/compiler/manifest-sidecar';
import { createNativeStyleExplanationMetadata } from '../src/compiler/style-explanation-metadata';
import { createThemeTokenReference } from '../src/theme-token';
const make = defineExtension<{
    make: (x: unknown) => () => void;
}>().factory({ importPath: '@acme/runtime', importName: 'make' });
function fixture() { const exported = new Map(Object.entries(captureNativeExports({ Component: make('base'), ordinary: 'base' }, 'test.css.ts', new Set(['base']), null))); const styles = new Map([['base', { backgroundColor: createThemeTokenReference('--crumbs-panel') }]]); return { exported, styles }; }
it('opaque callables have no phantom dependency or ownership paths; genuine argument styles contribute global tokens', () => {
    const { exported, styles } = fixture();
    const index = indexStyleExportOwnership(exported);
    expect(index.classNames).toEqual(['base']);
    expect(index.exportNameForClass('base')).toBe('Component');
    const metadata = createNativeModuleMetadata(styles, exported);
    expect(metadata.version).toBe(2);
    expect(metadata.tokens).toEqual(['--crumbs-panel']);
    expect(metadata.dependencyPlan.entries.map(e => e.path)).toEqual([['ordinary']]);
    expect(createLocalVarsMetadata(styles, exported)).toBeUndefined();
    const explanations = createNativeStyleExplanationMetadata({ moduleId: '@acme/ui#panel.css.ts', exportMap: exported, classStyles: styles, classCandidates: new Map(), dependencyPlan: metadata.dependencyPlan });
    expect(explanations.exports.map(e => e.path)).toEqual([['ordinary']]);
});
it('opaque manifest identifies the export and endpoint without claiming component capabilities', () => {
    const { exported, styles } = fixture();
    const origins = new Map([['base', new Map([['backgroundColor', { packageOwner: '@acme/ui', sourceId: 'panel.css.ts', primitiveDomain: ['view'] }]])]]);
    const sidecar = captureManifestSidecar({ packageOwner: '@acme/ui', sourceId: 'panel.css.ts', exportMap: exported, resolvedClassStyles: styles, resolvedClassOrigins: origins });
    expect(sidecar.module.exports).toEqual(['Component', 'ordinary']);
    expect(sidecar.capabilities.map(c => c.exportPath)).toEqual(['ordinary']);
    expect(sidecar.dependencies.every(d => d.origin?.exportPath === 'ordinary')).toBe(true);
    expect(sidecar.unresolved).toContainEqual({ reference: '@acme/runtime#make', reason: 'Runtime factory result is opaque; component capabilities are not inferred.', origin: { moduleId: '@acme/ui#panel.css.ts', exportPath: 'Component' } });
});
