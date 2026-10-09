export const NativeStylesDiagnosticCode = {
  InvalidContainerDefinition: "CRUMBS_CSS_INVALID_CONTAINER_DEFINITION",
  ContainerUnsupportedVersion: "CRUMBS_CSS_CONTAINER_UNSUPPORTED_VERSION",
  InvalidContainerMeasurement: "CRUMBS_CSS_INVALID_CONTAINER_MEASUREMENT",
  InvalidContainerValues: "CRUMBS_CSS_INVALID_CONTAINER_VALUES",
  ContainerProviderRequired: "CRUMBS_CSS_CONTAINER_PROVIDER_REQUIRED",
  ContainerContractMismatch: "CRUMBS_CSS_CONTAINER_CONTRACT_MISMATCH",
  ContainerOwnerInUse: "CRUMBS_CSS_CONTAINER_OWNER_IN_USE",
  ContainerReentrantUpdate: "CRUMBS_CSS_CONTAINER_REENTRANT_UPDATE",

  InvalidLocalVar: "CRUMBS_CSS_INVALID_LOCAL_VAR",
  InvalidLocalAssignments: "CRUMBS_CSS_INVALID_LOCAL_ASSIGNMENTS",
  LocalVarConflict: "CRUMBS_CSS_LOCAL_VAR_CONFLICT",
  LocalVarDomainMismatch: "CRUMBS_CSS_LOCAL_VAR_DOMAIN_MISMATCH",
  LocalVarRequired: "CRUMBS_CSS_LOCAL_VAR_REQUIRED",
  LocalVarUnsupportedVersion: "CRUMBS_CSS_LOCAL_VAR_UNSUPPORTED_VERSION",
  LocalStylePlanRequired: "CRUMBS_CSS_LOCAL_STYLE_PLAN_REQUIRED",
  LocalVarInvalidPropertyValue: "CRUMBS_CSS_LOCAL_VAR_INVALID_PROPERTY_VALUE",

  CssVariableDropped: "CRUMBS_CSS_VARIABLE_DROPPED",
  DroppedDeclaration: "CRUMBS_CSS_DROPPED_DECLARATION",
  InvalidRecipeVariant: "CRUMBS_CSS_INVALID_RECIPE_VARIANT",
  InvalidThemeTokenReference: "CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE",
  MissingThemeToken: "CRUMBS_CSS_MISSING_THEME_TOKEN",
  ThemeTokenCollision: "CRUMBS_CSS_THEME_TOKEN_COLLISION",
  TokenContractIdentityCollision: "CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION",
  TokenAliasMissingTarget: "CRUMBS_CSS_TOKEN_ALIAS_MISSING_TARGET",
  TokenAliasDomainMismatch: "CRUMBS_CSS_TOKEN_ALIAS_DOMAIN_MISMATCH",
  TokenAliasCycle: "CRUMBS_CSS_TOKEN_ALIAS_CYCLE",
  TokenAliasFallbackDomainMismatch: "CRUMBS_CSS_TOKEN_ALIAS_FALLBACK_DOMAIN_MISMATCH",
  TokenAliasOverride: "CRUMBS_CSS_TOKEN_ALIAS_OVERRIDE",
  TokenThemeProviderMismatch: "CRUMBS_CSS_TOKEN_THEME_PROVIDER_MISMATCH",
  TokenThemeScopeProviderMismatch: "CRUMBS_CSS_TOKEN_THEME_SCOPE_PROVIDER_MISMATCH",
  TokenThemeScopeInvalid: "CRUMBS_CSS_TOKEN_THEME_SCOPE_INVALID",
  TokenThemePatchInvalid: "CRUMBS_CSS_TOKEN_THEME_PATCH_INVALID",
  TokenThemePatchContractMismatch: "CRUMBS_CSS_TOKEN_THEME_PATCH_CONTRACT_MISMATCH",
  TokenThemeFocusInvalid: "CRUMBS_CSS_TOKEN_THEME_FOCUS_INVALID",
  TokenThemeExternalContractMismatch: "CRUMBS_CSS_TOKEN_THEME_EXTERNAL_CONTRACT_MISMATCH",
  TokenThemeExternalTokenMismatch: "CRUMBS_CSS_TOKEN_THEME_EXTERNAL_TOKEN_MISMATCH",
  TokenThemeTokenContractMismatch: "CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH",
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
