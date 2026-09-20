export const NativeStylesDiagnosticCode = {
  CssVariableDropped: "CRUMBS_CSS_VARIABLE_DROPPED",
  DroppedDeclaration: "CRUMBS_CSS_DROPPED_DECLARATION",
  InvalidRecipeVariant: "CRUMBS_CSS_INVALID_RECIPE_VARIANT",
  InvalidThemeTokenReference: "CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE",
  MissingThemeToken: "CRUMBS_CSS_MISSING_THEME_TOKEN",
  ThemeTokenCollision: "CRUMBS_CSS_THEME_TOKEN_COLLISION",
  TokenContractIdentityCollision: "CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION",
  TokenThemeProviderMismatch: "CRUMBS_CSS_TOKEN_THEME_PROVIDER_MISMATCH",
  InvalidThemeContract: "CRUMBS_CSS_INVALID_THEME_CONTRACT",
  PartialRecipePayload: "CRUMBS_CSS_PARTIAL_RECIPE_PAYLOAD",
  UnsupportedAtRule: "CRUMBS_CSS_UNSUPPORTED_AT_RULE",
  UnsupportedMedia: "CRUMBS_CSS_UNSUPPORTED_MEDIA",
  UnsupportedSelector: "CRUMBS_CSS_UNSUPPORTED_SELECTOR",
  UnsupportedStructuredValue: "CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE",
  UnsupportedExport: "CRUMBS_CSS_UNSUPPORTED_EXPORT",
} as const

export type NativeStylesDiagnosticCode =
  (typeof NativeStylesDiagnosticCode)[keyof typeof NativeStylesDiagnosticCode]

export function formatNativeStylesDiagnostic(
  code: NativeStylesDiagnosticCode,
  message: string,
): string {
  return `[crumbs-css:${code}] ${message}`
}
