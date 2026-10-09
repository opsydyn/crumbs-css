import type { TokenAlgebraErrorCode } from './model';
/** Stable codes cross package boundaries; messages never include submitted values. */
export class TokenAlgebraError extends TypeError {
    readonly code: TokenAlgebraErrorCode;
    constructor(code: TokenAlgebraErrorCode) {
        const codes: readonly string[] = ['algebra.invalid-color', 'algebra.invalid-typography', 'algebra.invalid-option', 'algebra.invalid-descriptor', 'algebra.out-of-range'];
        const safe = typeof code === 'string' && codes.includes(code) ? code : 'algebra.invalid-option';
        super(`Token algebra rejected input (${safe}).`);
        this.name = 'TokenAlgebraError';
        this.code = safe;
    }
}
export function reject(code: TokenAlgebraErrorCode): never { throw new TokenAlgebraError(code); }
