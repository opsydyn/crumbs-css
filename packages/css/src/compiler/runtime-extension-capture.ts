import { admitExtensionConfig, copyExtensionArguments, extensionFailure, extensionLimit, extensionDataProperties } from '../extensions/admission';
import { ExtensionError } from '../extensions/error';
import { RuntimeExtensionSymbol } from '../extensions/model';
import { NativeStylesCompatibilityError } from '../native-compatibility';
import { NativeStylesDiagnosticCode } from '../diagnostics';
import { copyEvaluatorExtensionArguments, assertEvaluatorExtensionPrototype } from './runtime-extension-data';
import { capturedExtension, capturedStyle, isCapturedRuntimeExtension, isCapturedExtensionStyleRef } from './runtime-extension-model';
import type { CapturedRuntimeExtension } from './runtime-extension-model';
export { isCapturedRuntimeExtension, isCapturedExtensionStyleRef } from './runtime-extension-model';
const localTags = new Set(['crumbs.css.local-var', 'crumbs.css.local-fallback', 'crumbs.css.local-assignments', 'crumbs.css.local-style-plan']);
function mapData(value: unknown, path: string, leaf: (value: unknown, path: string) => unknown): unknown {
    const mapped = leaf(value, path);
    if (mapped !== value)
        return mapped;
    if (value === null || typeof value !== 'object')
        return value;
    if (localTags.has(Object.getOwnPropertyDescriptor(value, '$$type')?.value))
        extensionFailure(path, 'local operands are unsupported in extension arguments v1');
    const out: unknown[] | Record<string, unknown> = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
    for (const [k, d] of Object.entries(extensionDataProperties(value, path)))
        if (!(Array.isArray(value) && k === 'length'))
            Object.defineProperty(out, k, { value: mapData(d.value, `${path}[${JSON.stringify(k)}]`, leaf), enumerable: true, writable: true, configurable: true });
    return Object.freeze(out);
}
export function createRuntimeExtensionCapture(filePath: string, styleHandles: ReadonlySet<string>, unusedCompositionRegex: RegExp | null) {
    const identities = new Map<Function, CapturedRuntimeExtension>(), endpoints = new Set<string>(), captured: CapturedRuntimeExtension[] = [];
    return { get captured(): readonly CapturedRuntimeExtension[] { return Object.freeze([...captured]); }, capture(value: Function, exportPath: string): CapturedRuntimeExtension {
            const prior = identities.get(value);
            if (prior)
                return prior;
            try {
                const keys = Reflect.ownKeys(value), marker = Object.getOwnPropertyDescriptor(value, RuntimeExtensionSymbol);
                if (keys.some(k => k !== 'length' && k !== 'name' && k !== RuntimeExtensionSymbol) || !marker || !('value' in marker) || marker.enumerable || marker.writable || marker.configurable || !Object.isFrozen(value))
                    extensionFailure(exportPath, 'invalid placeholder shape');
                for (const k of ['length', 'name']) {
                    const d = Object.getOwnPropertyDescriptor(value, k);
                    if (!d || !('value' in d) || d.enumerable || (k === 'name' ? typeof d.value !== 'string' : typeof d.value !== 'number' || !Number.isSafeInteger(d.value) || d.value < 0))
                        extensionFailure(exportPath, 'invalid intrinsic property');
                }
                const descriptor: unknown = marker.value;
                if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor) || !Object.isFrozen(descriptor))
                    extensionFailure(exportPath, 'frozen protocol descriptor required');
                assertEvaluatorExtensionPrototype(descriptor, exportPath);
                const d = extensionDataProperties(descriptor, exportPath), names = Object.keys(d);
                if (names.length !== 5 || !['$$type', 'version', 'importPath', 'importName', 'args'].every(k => names.includes(k)) || d.$$type?.value !== 'crumbs.css.runtime-extension')
                    extensionFailure(exportPath, 'closed runtime extension descriptor required');
                if (d.version?.value !== 1)
                    throw new ExtensionError('extension.unsupported-version', exportPath, 'expected protocol version 1');
                const endpoint = admitExtensionConfig({ importPath: d.importPath!.value, importName: d.importName!.value });
                const args = copyEvaluatorExtensionArguments(d.args!.value, `${exportPath}.args`);
                // An ordinary class-shaped record is data, including its className string.
                function lowerHandles(v: unknown, p: string): unknown {
                    if (typeof v === 'string' && styleHandles.has(v))
                        return capturedStyle(unusedCompositionRegex === null ? v : v.replace(unusedCompositionRegex, ''));
                    if (v && typeof v === 'object' && Object.getOwnPropertyDescriptor(v, '$$type')?.value === 'crumbs.css.class')
                        return mapData(v, p, x => x);
                    return v;
                }
                const lowered = mapData(args, `${exportPath}.args`, lowerHandles) as readonly unknown[];
                const key = JSON.stringify([endpoint.importPath, endpoint.importName]);
                if (captured.length >= 128 || (!endpoints.has(key) && endpoints.size >= 32))
                    extensionLimit(exportPath);
                const result = capturedExtension({ id: captured.length, ...endpoint, args: lowered, exportPath });
                identities.set(value, result);
                endpoints.add(key);
                captured.push(result);
                return result;
            }
            catch (error) {
                if (error instanceof ExtensionError)
                    throw new NativeStylesCompatibilityError(NativeStylesDiagnosticCode.UnsupportedExport, `Unsupported export in ${filePath} at ${exportPath}: ${error.message}`);
                throw error;
            }
        } };
}
export function lowerRuntimeExtensionArguments(extension: CapturedRuntimeExtension, classStyles: ReadonlyMap<string, Record<string, unknown>>, localPlans: ReadonlyMap<string, unknown>): readonly unknown[] {
    const expanded = mapData(extension.args, `${extension.exportPath}.args`, (value, p) => {
        if (!isCapturedExtensionStyleRef(value))
            return value;
        if (localPlans.has(value.className))
            extensionFailure(p, 'local style plans are unsupported in extension arguments v1');
        const style = classStyles.get(value.className);
        if (!style)
            extensionFailure(p, 'unresolved native style handle');
        // Copy and validate the expansion before recursion: do not freeze shared styles.
        return mapData(copyExtensionArguments([style], p)[0], p, x => x);
    });
    return copyExtensionArguments(expanded as readonly unknown[], `${extension.exportPath}.args`);
}
export function collectRuntimeExtensions(exportMap: ReadonlyMap<string, unknown>): readonly CapturedRuntimeExtension[] {
    const result = new Map<number, CapturedRuntimeExtension>();
    const visit = (value: unknown): void => {
        if (isCapturedRuntimeExtension(value)) {
            result.set(value.id, value);
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(visit);
            return;
        }
        if (value && typeof value === 'object')
            for (const d of Object.values(Object.getOwnPropertyDescriptors(value)))
                if (d.enumerable && 'value' in d)
                    visit(d.value);
    };
    for (const value of exportMap.values())
        visit(value);
    return Object.freeze([...result.values()].sort((a, b) => a.id - b.id));
}
export function extensionStyleNames(extension: CapturedRuntimeExtension): readonly string[] {
    const names = new Set<string>();
    const visit = (value: unknown): void => { if (isCapturedExtensionStyleRef(value)) {
        names.add(value.className);
        return;
    } if (Array.isArray(value)) {
        value.forEach(visit);
        return;
    } if (value && typeof value === 'object')
        Object.values(value).forEach(visit); };
    visit(extension.args);
    return Object.freeze([...names]);
}
