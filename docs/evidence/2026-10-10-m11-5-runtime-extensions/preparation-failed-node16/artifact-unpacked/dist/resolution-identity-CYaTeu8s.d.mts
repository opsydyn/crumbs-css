//#region src/compiler/resolution-identity.d.ts
type ResolutionFileReceipt = Readonly<{
  sourcePath: string;
  sourceHash: string | null;
  canonicalPath: string | null;
}>;
type ResolutionIdentity = Readonly<{
  cacheable: boolean;
  files: readonly ResolutionFileReceipt[];
  links: readonly Readonly<{
    sourcePath: string;
    canonicalPath: string | null;
  }>[];
}>;
//#endregion
export { ResolutionIdentity as t };