import { compile } from '@vanilla-extract/integration';
import { readFileSync, realpathSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ExtensionError } from '../extensions/error';
import type { CapturedRuntimeExtension } from './runtime-extension-model';
import { captureResolutionIdentity, hasChangedResolutionIdentity, type ResolutionIdentity } from './resolution-identity';
export type RuntimeExtensionEndpoint = Readonly<{
    importPath: string;
    importName: string;
    targets: readonly Readonly<{
        conditionSet: readonly string[];
        logicalPath: string;
        canonicalPath: string;
        format: 'esm' | 'cjs';
    }>[];
}>;
export type RuntimeExtensionLinkage = Readonly<{
    endpoints: readonly RuntimeExtensionEndpoint[];
    resolutionIdentity: ResolutionIdentity;
}>;
type Options = {
    readonly cwd: string;
    readonly absoluteEntryPath: string;
    readonly platform: string | null;
    readonly dev: boolean;
};
type ResolveResult = {
    path: string;
    external: boolean;
    errors: readonly unknown[];
};
type Build = {
    initialOptions: {
        conditions?: string[];
        preserveSymlinks?: boolean;
        platform?: 'node' | 'neutral';
        mainFields?: string[];
        resolveExtensions?: string[];
    };
    resolve: (p: string, o: {
        resolveDir: string;
        kind: 'import-statement' | 'require-call';
        pluginData: unknown;
    }) => Promise<ResolveResult>;
    onLoad: (o: {
        filter: RegExp;
    }, cb: (a: {
        path: string;
    }) => unknown) => void;
    onResolve: (o: {
        filter: RegExp;
    }, cb: (a: {
        path: string;
        pluginData: unknown;
        kind: string;
        importer: string;
    }) => unknown) => void;
    onEnd: (cb: (r: {
        metafile?: {
            inputs: Record<string, unknown>;
        };
    }) => void) => void;
};
const key = (v: {
    importPath: string;
    importName: string;
}) => JSON.stringify([v.importPath, v.importName]);
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function fail(endpoint: string, reason: string): never { throw new ExtensionError('extension.unresolved-import', endpoint, reason); }
/** CJS has no statically checked named imports in esbuild. Admit only a closed static facade. */
function staticCommonJsNames(source: string, endpoint: string): ReadonlySet<string> {
    const tokens: string[] = [];
    let i = 0;
    while (i < source.length) {
        const tail = source.slice(i), space = /^\s+/.exec(tail);
        if (space) {
            i += space[0].length;
            continue;
        }
        if (tail.startsWith('//')) {
            const n = tail.indexOf('\n');
            i += n < 0 ? tail.length : n;
            continue;
        }
        if (tail.startsWith('/*')) {
            const n = tail.indexOf('*/', 2);
            if (n < 0)
                fail(endpoint, 'unverifiable CommonJS comment');
            i += n + 2;
            continue;
        }
        if (tail[0] === '"' || tail[0] === "'") {
            const q = tail[0];
            let n = 1;
            for (; n < tail.length; n++) {
                if (tail[n] === '\\') {
                    n++;
                    continue;
                }
                if (tail[n] === q)
                    break;
            }
            if (n >= tail.length)
                fail(endpoint, 'unverifiable CommonJS string');
            tokens.push('<string>');
            i += n + 1;
            continue;
        }
        const token = /^(?:[A-Za-z_$][A-Za-z0-9_$]*|\d+(?:\.\d+)?|===|!==|==|!=|=>|\+\+|--|&&|\|\||[{}()[\].,;:=+*?!<>-])/.exec(tail);
        if (!token)
            fail(endpoint, 'use a static CommonJS facade without template, regexp or computed export syntax');
        tokens.push(token[0]);
        i += token[0].length;
    }
    const names = new Set<string>();
    let braces = 0, parens = 0, brackets = 0;
    for (let n = 0; n < tokens.length; n++) {
        const t = tokens[n]!;
        if (t === 'exports' || t === 'module') {
            let start = n;
            if (t === 'module') {
                if (tokens[n + 1] !== '.' || tokens[n + 2] !== 'exports')
                    fail(endpoint, 'unverifiable CommonJS module reference');
                start += 2;
            }
            const name = tokens[start + 2];
            if (braces !== 0 || parens !== 0 || brackets !== 0 || tokens[start + 1] !== '.' || !name || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) || tokens[start + 3] !== '=' || (n > 0 && ![';', '}'].includes(tokens[n - 1]!)))
                fail(endpoint, 'only unconditional own named CommonJS assignments are supported');
            names.add(name);
            n = start + 3;
            continue;
        }
        if (t === 'eval' || t === 'Function' || t === 'globalThis')
            fail(endpoint, 'dynamic CommonJS namespaces are unverifiable');
        if (t === '{')
            braces++;
        if (t === '}')
            braces--;
        if (t === '(')
            parens++;
        if (t === ')')
            parens--;
        if (t === '[')
            brackets++;
        if (t === ']')
            brackets--;
    }
    return names;
}
export async function linkRuntimeExtensions(extensions: readonly CapturedRuntimeExtension[], options: Options): Promise<RuntimeExtensionLinkage> {
    const endpoints = [...new Map(extensions.map(e => [key(e), e])).values()].sort((a, b) => compare(a.importPath, b.importPath) || compare(a.importName, b.importName));
    if (!endpoints.length)
        return Object.freeze({ endpoints: Object.freeze([]), resolutionIdentity: captureResolutionIdentity({}, options) });
    const paths = [...new Set(endpoints.map(e => e.importPath))];
    const probePath = options.absoluteEntryPath + '.crumbs-runtime-probe.ts';
    let inputs: Record<string, unknown> = {}, targets: RuntimeExtensionEndpoint[] = [];
    let resolvedPaths: string[] = [];
    const sourceExtensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json', '.cjs'];
    const runtimeInputs = () => ({ runtimeEndpoints: paths.map(importPath => ({ importPath, importer: options.absoluteEntryPath, resolvedPaths })), verification: true });
    for (let attempt = 0; attempt < 3; attempt++) {
        const before = captureResolutionIdentity(inputs, { ...options, ...runtimeInputs() });
        const missingCandidates = new Set<string>();
        const discovered: Record<string, unknown> = {}, next: {
            importPath: string;
            importName: string;
            targets: RuntimeExtensionEndpoint['targets'][number][];
        }[] = endpoints.map(e => ({ importPath: e.importPath, importName: e.importName, targets: [] }));
        for (const format of ['esm', 'cjs'] as const) {
            // Stock Expo asserts react-native/browser, not platform or dev/prod condition names.
            const probeConditions = options.platform === null ? [] : options.platform === 'web' ? ['browser'] : ['react-native'];
            const conditions = [...probeConditions, ...(options.platform === null ? ['node'] : []), format === 'esm' ? 'import' : 'require', 'default'];
            const resolutions = new Map<string, string>();
            let metafile: Record<string, unknown> = {};
            const source = endpoints.map((e, i) => `import {${e.importName} as factory${i}} from ${JSON.stringify(e.importPath)};`).join('\n') + `\nglobalThis.__crumbsInertLinkage = [${endpoints.map((_, i) => `factory${i}`).join(',')}];`;
            const plugin = { name: 'crumbs-inert-runtime-linkage', setup(raw: unknown) {
                    const build = raw as Build;
                    build.initialOptions.conditions = probeConditions;
                    build.initialOptions.platform = options.platform === null ? 'node' : 'neutral';
                    build.initialOptions.mainFields = options.platform === null ? ['main'] : ['react-native', 'browser', 'main'];
                    build.initialOptions.resolveExtensions = options.platform === null ? ['.js', '.json', '.node'] : ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json', '.cjs'];
                    build.initialOptions.preserveSymlinks = true;
                    build.onLoad({ filter: /\.crumbs-runtime-probe\.ts$/ }, () => ({ contents: source, loader: 'ts', resolveDir: path.dirname(options.absoluteEntryPath) }));
                    build.onResolve({ filter: /.*/ }, async (args) => {
                        if (args.path === probePath && args.kind === 'entry-point')
                            return { path: probePath };
                        if (args.pluginData === 'crumbs-linkage-resolved' || !paths.includes(args.path) || args.importer !== probePath)
                            return;
                        const r = await build.resolve(args.path, { resolveDir: path.dirname(options.absoluteEntryPath), kind: format === 'esm' ? 'import-statement' : 'require-call', pluginData: 'crumbs-linkage-resolved' });
                        if (r.errors.length || r.external || !r.path)
                            fail(args.path, 'package endpoint did not resolve to a static source');
                        resolutions.set(args.path, r.path);
                        return { path: r.path };
                    });
                    build.onEnd(result => { metafile = result.metafile?.inputs ?? {}; });
                } };
            try {
                await compile({ filePath: probePath, cwd: options.cwd, identOption: options.dev ? 'debug' : 'short', esbuildOptions: { conditions: probeConditions, external: ['react', 'react/*', 'react-native', 'react-native/*', 'react-native-reanimated', '@opsydyn/crumbs-css', '@opsydyn/crumbs-css/*', 'effect', 'effect/*'], plugins: [plugin] } });
            }
            catch (error) {
                if (error instanceof ExtensionError)
                    throw error;
                fail(paths.join(','), 'static named-link probe failed');
            }
            // esbuild cannot prove CJS bindings imported through ESM facades. The
            // synthetic probe itself is exempt: direct CJS endpoints are checked below.
            const probeRelative = path.relative(options.cwd, probePath).replaceAll(path.sep, '/');
            const inspectedPackages = new Set<string>();
            for (const [inputPath, rawInfo] of Object.entries(metafile)) {
                if (inputPath === probeRelative || inputPath === probePath || !rawInfo || typeof rawInfo !== 'object')
                    continue;
                if (options.platform === null) {
                    // Node's built-in module-sync/node-addons branches are not the
                    // same across the floor/current consumers or this integration.
                    // Do not publish a default-branch proof for a different native binding.
                    for (let directory = path.dirname(path.resolve(options.cwd, inputPath));; directory = path.dirname(directory)) {
                        const manifest = path.join(directory, 'package.json');
                        if (existsSync(manifest)) {
                            if (!inspectedPackages.has(manifest)) {
                                inspectedPackages.add(manifest);
                                const exports = JSON.parse(readFileSync(manifest, 'utf8')).exports;
                                const visit = (value: unknown): void => {
                                    if (!value || typeof value !== 'object')
                                        return;
                                    for (const [condition, child] of Object.entries(value)) {
                                        if (condition === 'module-sync' || condition === 'node-addons')
                                            fail(inputPath, 'Node module-sync/node-addons export conditions are outside the supported cross-version linkage proof');
                                        visit(child);
                                    }
                                };
                                visit(exports);
                            }
                            break;
                        }
                        if (path.dirname(directory) === directory)
                            break;
                    }
                }
                const info = rawInfo as {
                    format?: string;
                    imports?: {
                        path: string;
                        kind: string;
                        external?: boolean;
                    }[];
                };
                if (info.format === 'esm')
                    for (const edge of info.imports ?? []) {
                        const targetInfo = metafile[edge.path] as {
                            format?: string;
                        } | undefined;
                        if (!edge.external && edge.kind === 'import-statement' && targetInfo?.format === 'cjs')
                            fail(inputPath, 'mixed ESM-to-CommonJS imports/reexports are unverifiable; use pure ESM or a direct static CommonJS facade');
                    }
                if (options.platform !== null) {
                    const absolute = path.resolve(options.cwd, inputPath), extension = path.extname(absolute);
                    if (!sourceExtensions.includes(extension))
                        continue;
                    const stem = absolute.slice(0, -extension.length);
                    // Keep every absent sibling as a receipt. A later platform file
                    // must invalidate the proof even when selected source bytes stay equal.
                    for (const suffix of new Set([options.platform, 'native']))
                        for (const ext of sourceExtensions) {
                            const candidate = stem + '.' + suffix + ext;
                            missingCandidates.add(candidate);
                            if (existsSync(candidate))
                                fail(inputPath, 'ambiguous Metro platform sibling; expose an explicit variant endpoint through package exports');
                        }
                }
            }
            Object.assign(discovered, metafile);
            for (let i = 0; i < endpoints.length; i++) {
                const endpoint = endpoints[i]!, target = resolutions.get(endpoint.importPath);
                if (!target)
                    fail(endpoint.importPath, 'missing endpoint resolution');
                const relative = path.relative(options.cwd, target).replaceAll(path.sep, '/');
                const info = metafile[relative] ?? metafile[target];
                if (info && typeof info === 'object' && 'format' in info && info.format === 'cjs' && !staticCommonJsNames(readFileSync(target, 'utf8'), endpoint.importPath).has(endpoint.importName))
                    fail(endpoint.importPath, 'missing static CommonJS named factory');
                next[i]!.targets.push(Object.freeze({ conditionSet: Object.freeze(conditions), logicalPath: target, canonicalPath: realpathSync(target), format }));
            }
        }
        // Virtual probe bytes are fixed above, not a file receipt. Runtime bodies remain bytes, not values.
        delete discovered[path.relative(options.cwd, probePath).replaceAll(path.sep, '/')];
        delete discovered[probePath];
        inputs = discovered;
        targets = next;
        resolvedPaths = [...new Set([...next.flatMap(e => e.targets.map(t => t.logicalPath)), ...missingCandidates])];
        const after = captureResolutionIdentity(inputs, { ...options, ...runtimeInputs() });
        if (before.cacheable && after.cacheable && JSON.stringify(before) === JSON.stringify(after) && !hasChangedResolutionIdentity(after))
            return Object.freeze({ endpoints: Object.freeze(targets.map(e => Object.freeze({ ...e, targets: Object.freeze(e.targets) }))), resolutionIdentity: after });
    }
    return fail(paths.join(','), 'runtime sources or resolution changed during linkage; retry after edits settle');
}
