export type ExtensionConfig = {
    readonly importPath: string;
    readonly importName: string;
};
export type ExtensionErrorCode = 'extension.invalid-config' | 'extension.invalid-argument' | 'extension.resource-limit' | 'extension.build-only-call' | 'extension.unsupported-version' | 'extension.unresolved-import' | 'extension.invalid-factory' | 'extension.invalid-result';
type IsAny<T> = 0 extends (1 & T) ? true : false;
type InvalidModuleMember<T> = T extends unknown ? T extends object ? string extends keyof T ? T : number extends keyof T ? T : symbol extends keyof T ? T : never : T : never;
export type ModuleProof<T> = IsAny<T> extends true ? [
    invalid: never
] : unknown extends T ? [
    invalid: never
] : [
    InvalidModuleMember<T>
] extends [
    never
] ? [
] : [
    invalid: never
];
type IsUnion<T, Whole = T> = T extends Whole ? [
    Whole
] extends [
    T
] ? false : true : never;
type FactoryKeys<T> = {
    [K in keyof T]-?: K extends string ? K extends 'default' ? never : IsAny<T[K]> extends true ? never : T[K] extends (...args: never[]) => infer R ? IsAny<R> extends true ? never : [
        R
    ] extends [
        (...args: never[]) => unknown
    ] ? K : never : never : never;
}[keyof T];
type UnionKeys<C> = C extends unknown ? keyof C : never;
export type CheckedFactoryConfig<T, C extends ExtensionConfig> = IsAny<C> extends true ? never : Exclude<UnionKeys<C>, keyof ExtensionConfig> extends never ? string extends C['importName'] ? never : [
    IsUnion<C['importName']>
] extends [
    false
] ? C['importName'] extends FactoryKeys<T> ? unknown : never : never : never;
export type ExtensionFactory<F> = F extends (...args: infer A) => infer R ? (...args: A) => R : never;
export type ExtensionModule<T> = Readonly<{
    factory<const C extends ExtensionConfig>(config: C & NoInfer<CheckedFactoryConfig<T, C>>): ExtensionFactory<C['importName'] extends keyof T ? T[C['importName']] : never>;
}>;
export const RuntimeExtensionSymbol = Symbol.for('crumbs.css.runtime-extension');
export type RuntimeExtensionDescriptor = Readonly<{
    $$type: 'crumbs.css.runtime-extension';
    version: 1;
    importPath: string;
    importName: string;
    args: readonly unknown[];
}>;
