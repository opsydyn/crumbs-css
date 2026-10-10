const extensionBrand = Symbol('captured runtime extension');
const styleBrand = Symbol('captured extension style');
export type CapturedRuntimeExtension = Readonly<{
    readonly [extensionBrand]: true;
    id: number;
    importPath: string;
    importName: string;
    args: readonly unknown[];
    exportPath: string;
}>;
export type CapturedExtensionStyleRef = Readonly<{
    readonly [styleBrand]: true;
    className: string;
}>;
export function isCapturedRuntimeExtension(value: unknown): value is CapturedRuntimeExtension { return typeof value === 'object' && value !== null && Object.getOwnPropertyDescriptor(value, extensionBrand)?.value === true; }
export function isCapturedExtensionStyleRef(value: unknown): value is CapturedExtensionStyleRef { return typeof value === 'object' && value !== null && Object.getOwnPropertyDescriptor(value, styleBrand)?.value === true; }
export function capturedExtension(value: Omit<CapturedRuntimeExtension, typeof extensionBrand>): CapturedRuntimeExtension { return Object.freeze(Object.defineProperty(value, extensionBrand, { value: true })) as CapturedRuntimeExtension; }
export function capturedStyle(className: string): CapturedExtensionStyleRef { return Object.freeze(Object.defineProperty({ className }, styleBrand, { value: true })) as CapturedExtensionStyleRef; }
