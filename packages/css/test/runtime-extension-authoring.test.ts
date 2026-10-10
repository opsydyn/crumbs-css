import { test, expect } from 'bun:test';
const api = await import('../src/extensions').catch(() => ({})) as typeof import('../src/extensions');
function builder() { expect(typeof api.defineExtension).toBe('function'); return api.defineExtension<{
    make: (label: string, count?: number) => (suffix: string) => string;
}>().factory({ importPath: '@acme/extensions/pure', importName: 'make' }); }
test('factory_never_loads_or_calls_runtime', () => { const f = builder(); const v = f('card', undefined); const d = Object.getOwnPropertyDescriptor(v, Symbol.for('crumbs.css.runtime-extension'))!; expect([d.enumerable, d.writable, d.configurable]).toEqual([false, false, false]); expect(d.value.args).toEqual(['card', undefined]); expect(Object.isFrozen(d.value)).toBe(true); expect(Object.isFrozen(d.value.args)).toBe(true); });
test('placeholder_call_is_build_only', () => { const v = builder()('card'); try {
    v('!');
    throw Error('unexpected call');
}
catch (e) {
    expect((e as {
        code: string;
    }).code).toBe('extension.build-only-call');
} });
test('invalid_config_is_closed_and_does_not_coerce', () => { expect(typeof api.defineExtension).toBe('function'); const b = api.defineExtension<{
    make: () => () => void;
}>(); for (const importPath of ['./runtime', '/runtime', 'node:fs', 'fs', 'assert/strict', '@bad', 'pkg//x', 'pkg/../x', 'pkg/%20', 'Pkg'])
    expect(() => b.factory({ importPath, importName: 'make' })).toThrow(); let calls = 0; expect(() => b.factory(Object.defineProperty({}, 'importPath', { enumerable: true, get() { calls++; return 'pkg'; } }) as never)).toThrow(); expect(calls).toBe(0); expect(() => b.factory({ importPath: 'pkg', importName: 'make', extra: true } as never)).toThrow(); });
test('invalid_js_error_code_has_safe_fallback', () => { expect(typeof api.ExtensionError).toBe('function'); let calls = 0; const e = new api.ExtensionError({ toString() { calls++; return 'bad'; } } as never, 'x\n'.repeat(200), 'invalid'); expect(e.code).toBe('extension.invalid-config'); expect(e.path.length).toBeLessThanOrEqual(256); expect(e.path.includes('\n')).toBe(false); expect(calls).toBe(0); });
