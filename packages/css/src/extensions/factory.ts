import { admitExtensionConfig, copyExtensionArguments } from './admission';
import { ExtensionError } from './error';
import { RuntimeExtensionSymbol } from './model';
import type { ExtensionConfig, ExtensionModule, ModuleProof, RuntimeExtensionDescriptor } from './model';
export function defineExtension<TModule>(..._proof: ModuleProof<TModule>): ExtensionModule<TModule> {
    const builder = { factory(config: ExtensionConfig) {
            const endpoint = admitExtensionConfig(config);
            return (...args: readonly unknown[]) => {
                const descriptor: RuntimeExtensionDescriptor = Object.freeze({ $$type: 'crumbs.css.runtime-extension', version: 1, ...endpoint, args: copyExtensionArguments(args, 'args') });
                const placeholder = () => { throw new ExtensionError('extension.build-only-call', 'extension', 'compile this placeholder through a .css.ts module'); };
                Object.defineProperty(placeholder, RuntimeExtensionSymbol, { value: descriptor, enumerable: false, writable: false, configurable: false });
                return Object.freeze(placeholder);
            };
        } };
    // Runtime code never sees the erased module contract; ingress validates actual data.
    return Object.freeze(builder) as ExtensionModule<TModule>;
}
