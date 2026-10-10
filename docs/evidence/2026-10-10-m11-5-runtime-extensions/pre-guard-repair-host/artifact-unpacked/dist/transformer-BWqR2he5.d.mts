import { n as AnyLocalVar, o as NativeLocalStylePlan } from "./model-DAuWjF1q.mjs";
import { v as StyleExplanationMetadata } from "./style-explanation-model-BZtfxy4g.mjs";
import { t as ResolutionIdentity } from "./resolution-identity-CYaTeu8s.mjs";
import { a as ManifestCapability, p as ManifestModule, u as ManifestDependency, x as ManifestUnresolvedReference } from "./model-C3BKvFKH.mjs";

//#region src/compiler/local-vars-metadata.d.ts
type NativeLocalVarsMetadata = {
  readonly $$type: "crumbs.css.local-vars-metadata";
  readonly version: 1;
  readonly definitions: readonly AnyLocalVar[];
  readonly uses: readonly {
    readonly exportPath: string;
    readonly property: string;
    readonly localVars: readonly string[];
    readonly tokens: readonly string[];
  }[];
};
//#endregion
//#region src/compiler/manifest-sidecar.d.ts
type ManifestSidecarPropertyOrigin = {
  readonly packageOwner: string;
  readonly sourceId: string;
  readonly primitiveDomain: ReadonlyArray<string>;
};
type CompilerManifestSidecar = {
  readonly localVariables?: Omit<NativeLocalVarsMetadata, "$$type"> & {
    readonly $$type: "crumbs.css.local-variable-dependencies";
    readonly moduleId: string;
    readonly sourceId: string;
  };
  readonly module: ManifestModule;
  readonly dependencies: ReadonlyArray<ManifestDependency>;
  readonly capabilities: ReadonlyArray<ManifestCapability>;
  readonly unresolved: ReadonlyArray<ManifestUnresolvedReference>;
};
//#endregion
//#region src/compiler/runtime-extension-linkage.d.ts
type RuntimeExtensionEndpoint = Readonly<{
  importPath: string;
  importName: string;
  targets: readonly Readonly<{
    conditionSet: readonly string[];
    logicalPath: string;
    canonicalPath: string;
    format: 'esm' | 'cjs';
  }>[];
}>;
type RuntimeExtensionLinkage = Readonly<{
  endpoints: readonly RuntimeExtensionEndpoint[];
  resolutionIdentity: ResolutionIdentity;
}>;
//#endregion
//#region src/compiler/code-emission.d.ts
type BuildStyleSheetCodeOptions = {
  readonly runtimeExtensionLinkage?: RuntimeExtensionLinkage;
  readonly localDefinitions?: readonly AnyLocalVar[];
  readonly localPlans?: ReadonlyMap<string, NativeLocalStylePlan<unknown>>;
  readonly useStyleSheet?: boolean;
  readonly cacheIdentity?: string;
  readonly includeStyleExplanations?: boolean;
  readonly styleExplanationMetadata?: StyleExplanationMetadata;
};
//#endregion
//#region src/transformer.d.ts
type StyleExportValue = unknown;
type TransformCssTsOptions = {
  readonly strictDiagnostics?: boolean;
  readonly useStyleSheet?: boolean;
  readonly platform?: string | null;
  readonly dev?: boolean;
  readonly includeStyleExplanations?: boolean;
};
type TransformCssTsManifestSidecarOptions = {
  readonly declaredTokenIds?: ReadonlySet<string>;
};
type TransformCssTsWithManifestSidecarResult = {
  readonly code: string;
  readonly sidecar: CompilerManifestSidecar;
};
/**
 * Generates the output JS module string from pre-built maps plus a list of
 * file-level compile-time dependencies (other .css.ts files imported by this
 * one via esbuild).
 *
 * The dep side-effect imports let Metro track those files in its module graph.
 * Metro 0.84 still caches an importing .css.ts transform by that file's own
 * content, so a dependency-only edit does not by itself rebuild baked values.
 * Direct .css.ts edits invalidate normally. Dependency-aware Metro cache stores
 * inspect the metadata attached to transformed results and miss when any
 * project-authored input hash changes.
 */
declare function buildStyleSheetCode(exportMap: ReadonlyMap<string, StyleExportValue>, classStyles: ReadonlyMap<string, Record<string, unknown>>, depRelativePaths?: ReadonlyArray<string>, options?: BuildStyleSheetCodeOptions): string;
/**
 * Runs the full vanilla-extract → StyleSheet pipeline for a .css.ts file.
 * Also captures esbuild's metafile to extract compile-time dependencies (other
 * .css.ts files imported by this one) and returns them as paths relative to
 * the entry file's directory.
 */
declare function transformCssTsToStyleSheet(filePath: string, cwd: string, options?: TransformCssTsOptions): Promise<string>;
/**
 * Tooling-only variant that returns the manifest projection from this same
 * compiler pass. The sidecar is never serialized into the generated module.
 */
declare function transformCssTsToStyleSheetWithManifestSidecar(filePath: string, cwd: string, options?: TransformCssTsOptions & TransformCssTsManifestSidecarOptions): Promise<TransformCssTsWithManifestSidecarResult>;
declare function getCacheKey(): string;
declare function transform(config: Record<string, unknown> & {
  upstreamTransformerPath?: string;
}, projectRoot: string, filename: string, data: Buffer, options: {
  platform?: string | null;
  dev: boolean;
}): Promise<unknown>;
//#endregion
export { getCacheKey as a, transformCssTsToStyleSheetWithManifestSidecar as c, buildStyleSheetCode as i, CompilerManifestSidecar as l, TransformCssTsOptions as n, transform as o, TransformCssTsWithManifestSidecarResult as r, transformCssTsToStyleSheet as s, TransformCssTsManifestSidecarOptions as t, ManifestSidecarPropertyOrigin as u };