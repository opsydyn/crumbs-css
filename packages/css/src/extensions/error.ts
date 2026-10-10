import type { ExtensionErrorCode } from './model';
const codes: ReadonlySet<string> = new Set(['extension.invalid-config', 'extension.invalid-argument', 'extension.resource-limit', 'extension.build-only-call', 'extension.unsupported-version', 'extension.unresolved-import', 'extension.invalid-factory', 'extension.invalid-result']);
export function safeExtensionPath(path: unknown): string {
    return typeof path === 'string' ? path.replace(/[\x00-\x1f\x7f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).slice(0, 256) : '<extension>';
}
export class ExtensionError extends Error {
    override readonly name = 'ExtensionError';
    readonly code: ExtensionErrorCode;
    readonly path: string;
    constructor(code: ExtensionErrorCode, path: string, reason: string) {
        const admitted = typeof code === 'string' && codes.has(code) ? code : 'extension.invalid-config';
        const safePath = safeExtensionPath(path);
        super(`${admitted} at ${safePath}: ${typeof reason === 'string' ? reason : 'invalid extension input'}`);
        this.code = admitted;
        this.path = safePath;
    }
}
