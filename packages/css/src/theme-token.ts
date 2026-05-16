export const NativeThemeTokenReferenceType = "crumbs.css.theme-token" as const

export type NativeThemeTokenReference = {
  readonly $$type: typeof NativeThemeTokenReferenceType
  readonly varName: string
}

export function createThemeTokenReference(varName: string): NativeThemeTokenReference {
  return {
    $$type: NativeThemeTokenReferenceType,
    varName,
  }
}

export function isThemeTokenReference(value: unknown): value is NativeThemeTokenReference {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === NativeThemeTokenReferenceType
  )
}
