import { ExtensionError, safeExtensionPath } from '../extensions/error';
import { collectRuntimeExtensions, lowerRuntimeExtensionArguments } from './runtime-extension-capture';
import type { RuntimeExtensionLinkage } from './runtime-extension-linkage';
import { hasChangedResolutionIdentity } from './resolution-identity';
export type RuntimeExtensionEmissionPlan = Readonly<{
    imports: string;
    declarations: string;
    expressionFor: (id: number) => string;
}>;
const key = (v: {
    importPath: string;
    importName: string;
}) => JSON.stringify([v.importPath, v.importName]);
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
/** Already-admitted snapshots become fresh, deeply frozen literals at module construction. */
function snapshot(value: unknown): string {
    if (value === undefined)
        return 'undefined';
    if (typeof value === 'number')
        return Object.is(value, -0) ? '-0' : JSON.stringify(value);
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `Object.freeze([${value.map(snapshot).join(',')}])`;
    if (value && typeof value === 'object') {
        const entries = Object.keys(value).map(k => `${k === '__proto__' ? `[${JSON.stringify(k)}]` : JSON.stringify(k)}:${snapshot(Object.getOwnPropertyDescriptor(value, k)!.value)}`).join(',');
        const record = `{${entries}}`;
        return `Object.freeze(${Object.getPrototypeOf(value) === null ? `Object.assign(Object.create(null),${record})` : record})`;
    }
    throw new ExtensionError('extension.invalid-argument', 'emission', 'portable snapshot required');
}
export function createRuntimeExtensionEmissionPlan(exportMap: ReadonlyMap<string, unknown>, classStyles: ReadonlyMap<string, Record<string, unknown>>, localPlans: ReadonlyMap<string, unknown>, linkage: RuntimeExtensionLinkage): RuntimeExtensionEmissionPlan {
    const extensions = collectRuntimeExtensions(exportMap), proof = new Set(linkage.endpoints.filter(e => e.targets.length > 0).map(key));
    if (hasChangedResolutionIdentity(linkage.resolutionIdentity))
        throw new ExtensionError('extension.unresolved-import', 'emission', 'runtime linkage receipt is stale');
    for (const extension of extensions)
        if (!proof.has(key(extension)))
            throw new ExtensionError('extension.unresolved-import', extension.exportPath, 'verified endpoint required');
    const reserved = new Set([...exportMap.keys(), '_s', '_l', '_crumbsFreeze', 'StyleSheet', '__crumbsModule', '__crumbsDev', '__crumbsLocalVars']);
    let ordinal = 0;
    const allocate = (label: string) => { let name: string; do {
        name = `__crumbsExtension${label}${ordinal++}`;
    } while (reserved.has(name)); reserved.add(name); return name; };
    const boundary = allocate('Error'), imports: string[] = [], declarations: string[] = [], aliases = new Map<string, string>(), results = new Map<number, string>();
    const endpoints = [...new Map(extensions.map(e => [key(e), e])).values()].sort((a, b) => compare(a.importPath, b.importPath) || compare(a.importName, b.importName));
    for (const endpoint of endpoints) {
        const alias = allocate('Factory');
        aliases.set(key(endpoint), alias);
        imports.push(`import { ${endpoint.importName} as ${alias} } from ${JSON.stringify(endpoint.importPath)};`);
    }
    if (extensions.length)
        declarations.push(`function ${boundary}(code,path) { const error = new TypeError(code + " at " + path); Object.defineProperties(error,{code:{value:code,enumerable:true},path:{value:path,enumerable:true}}); throw error; }`);
    // Snapshot serialization is conditional; ordinary modules never acquire helpers or imports.
    for (const extension of extensions) {
        const alias = aliases.get(key(extension))!, result = allocate('Result');
        results.set(extension.id, result);
        const args = lowerRuntimeExtensionArguments(extension, classStyles, localPlans);
        const logicalPath = JSON.stringify(safeExtensionPath(extension.exportPath));
        declarations.push(`if (typeof ${alias} !== "function") ${boundary}("extension.invalid-factory",${logicalPath});`);
        declarations.push(`const ${result} = (0, ${alias})(${args.map(snapshot).join(',')});`);
        declarations.push(`if (typeof ${result} !== "function") ${boundary}("extension.invalid-result",${logicalPath});`);
    }
    return Object.freeze({ imports: imports.join('\n'), declarations: declarations.join('\n'), expressionFor(id: number) { const name = results.get(id); if (name === undefined)
            throw new ExtensionError('extension.invalid-argument', 'emission', 'unknown captured function id'); return name; } });
}
