/** Plain JSON-data types for the versioned design-system manifest. */
export const DESIGN_SYSTEM_MANIFEST_FORMAT = "crumbs.design-system-manifest" as const
export const DESIGN_SYSTEM_MANIFEST_VERSION = 1 as const

export type ManifestPackage = {
  readonly name: string
  readonly version: string
}

export type ManifestCompiler = {
  readonly name: string
  /** Compiler package version; independent of the owner package version. */
  readonly version: string
}

export type ManifestArtifact = {
  readonly name: string
  /** Compatibility version of the compiler-produced artifact format. */
  readonly version: number
}

export type ManifestProducer = {
  readonly compiler: ManifestCompiler
  readonly artifact: ManifestArtifact
}

export type ManifestContractIdentity = {
  readonly owner: string
  readonly name: string
  readonly version: number
}

export type ManifestTokenDomain =
  | { readonly kind: "color" }
  | { readonly kind: "length"; readonly allowNegative: boolean }
  | { readonly kind: "duration" }
  | { readonly kind: "opacity" }
  | { readonly kind: "enum"; readonly values: ReadonlyArray<string> }

export type ManifestSourceOrigin = {
  /** Package-relative path using forward slashes. */
  readonly path: string
  /** Logical exported path within the source module, when applicable. */
  readonly exportPath?: string
}

export type ManifestLifecycle = {
  readonly deprecatedSince: string
  readonly reason?: string
  readonly replacement?: {
    readonly id: string
    readonly resolution: "declared" | "external"
  }
}

export type ManifestLifecycleAnnotation = ManifestLifecycle & {
  readonly entityId: string
}

export type ManifestTokenAlias = {
  readonly targetId?: string
  readonly targetPath: ReadonlyArray<string>
  readonly resolution: "internal" | "external" | "unresolved"
  readonly fallback?: string | number
}

export type ManifestToken = {
  readonly id: string
  readonly contract: ManifestContractIdentity
  readonly path: ReadonlyArray<string>
  readonly visibility: "public" | "private"
  readonly domain: ManifestTokenDomain
  readonly kind: "definition" | "alias"
  readonly alias?: ManifestTokenAlias
  readonly origin: ManifestSourceOrigin
  readonly lifecycle?: ManifestLifecycle
}

export type ManifestStateConstraint = {
  readonly discriminator: string
  readonly case: string
  readonly axes: Readonly<Record<string, ReadonlyArray<string | boolean>>>
}

export type ManifestComponent = {
  readonly id: string
  readonly contract: ManifestContractIdentity
  readonly origin: ManifestSourceOrigin
  readonly slots: ReadonlyArray<string>
  readonly variants: Readonly<Record<string, ReadonlyArray<string>>>
  /** Namespaced permissions such as `defaults:tone` and `slotStyles:root`. */
  readonly extensionPoints: ReadonlyArray<string>
  readonly stateConstraints: ReadonlyArray<ManifestStateConstraint>
  readonly defaults: Readonly<Record<string, string | number | boolean>>
  readonly lifecycle?: ManifestLifecycle
}

export type ManifestModule = {
  readonly id: string
  readonly origin: ManifestSourceOrigin
  readonly exports: ReadonlyArray<string>
}

export type ManifestDependency = {
  readonly from: string
  readonly to?: string
  readonly kind: "token-alias" | "style-token"
  readonly resolution: "internal" | "external" | "unresolved"
  readonly origin?: {
    readonly moduleId: string
    readonly exportPath: string
    readonly property?: string
  }
}

export type ManifestCapability = {
  readonly moduleId: string
  readonly exportPath: string
  readonly property: string
  readonly primitive: string
  readonly evidence: "compiler-observed"
}

export type ManifestCoverageRoot = {
  readonly kind: "token-contract" | "component-recipe" | "style-module"
  readonly id: string
}

export type ManifestUnresolvedReference = {
  readonly reference: string
  readonly reason?: string
  readonly origin?: {
    readonly moduleId: string
    readonly exportPath: string
    readonly property?: string
  }
}

export type DesignSystemManifest = {
  readonly format: typeof DESIGN_SYSTEM_MANIFEST_FORMAT
  readonly schemaVersion: typeof DESIGN_SYSTEM_MANIFEST_VERSION
  readonly package: ManifestPackage
  readonly producer: ManifestProducer
  readonly tokens: ReadonlyArray<ManifestToken>
  readonly components: ReadonlyArray<ManifestComponent>
  readonly modules: ReadonlyArray<ManifestModule>
  readonly dependencies: ReadonlyArray<ManifestDependency>
  readonly capabilities: ReadonlyArray<ManifestCapability>
  readonly coverage: {
    readonly roots: ReadonlyArray<ManifestCoverageRoot>
    readonly unresolved: ReadonlyArray<ManifestUnresolvedReference>
  }
}
