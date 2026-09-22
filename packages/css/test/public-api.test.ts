import { describe, expect, it } from "bun:test"
import * as rootApi from "@opsydyn/crumbs-css"
import * as styleApi from "@opsydyn/crumbs-css/style"
import * as themeApi from "@opsydyn/crumbs-css/theme"
import * as themeCoreApi from "@opsydyn/crumbs-css/theme/core"
import * as tokenApi from "@opsydyn/crumbs-css/tokens"
import * as tokenOpticApi from "@opsydyn/crumbs-css/tokens/optic"
import * as tokenSchemaApi from "@opsydyn/crumbs-css/tokens/schema"

function namedApiKeys(api: object): ReadonlyArray<string> {
  return Object.keys(api)
    .filter((key) => key !== "default")
    .sort()
}

describe("@opsydyn/crumbs-css public API contract", () => {
  it("keeps the style subpath focused on css.ts authoring APIs", () => {
    expect(namedApiKeys(styleApi)).toEqual([
      "NATIVE_RESPONSIVE_CONDITION_MATCHERS",
      "NATIVE_RESPONSIVE_CONDITION_NAMES",
      "NativeComponentRecipeType",
      "NativeComponentRecipeVersion",
      "NativeExpressionEvaluationError",
      "NativeExpressionProgramType",
      "NativeExpressionProgramVersion",
      "NativeExpressionType",
      "NativeExpressionVersion",
      "NativeRecipeClassType",
      "NativeRecipeType",
      "NativeSprinklesLookupPlanType",
      "NativeSprinklesLookupPlanVersion",
      "NativeThemeTokenReferenceType",
      "componentRecipe",
      "componentRecipeFromRecipe",
      "createNativeExpressionAdd",
      "createNativeExpressionAlias",
      "createNativeExpressionClamp",
      "createNativeExpressionCompose",
      "createNativeExpressionConditionReference",
      "createNativeExpressionDomain",
      "createNativeExpressionFallback",
      "createNativeExpressionLiteral",
      "createNativeExpressionMatch",
      "createNativeExpressionProgram",
      "createNativeExpressionRuntime",
      "createNativeExpressionScale",
      "createNativeExpressionSubtract",
      "createNativeExpressionTokenReference",
      "createNativeMapValueFn",
      "createNativeNormalizeValueFn",
      "createSprinkles",
      "createSprinklesLookupPlan",
      "createTheme",
      "createThemeContract",
      "createThemeTokenReference",
      "defineProperties",
      "evaluateNativeExpression",
      "foldNativeExpression",
      "getThemeTokenPath",
      "getThemeVarName",
      "imageStyle",
      "isNativeExpression",
      "isNativeExpressionProgram",
      "isThemeTokenReference",
      "isThemeVar",
      "mapNativeConditionValueToBranches",
      "nativeExpressionDependencyKey",
      "nativeExpressionDomainKey",
      "recipe",
      "style",
      "styleVariants",
      "textStyle",
      "viewStyle",
    ])
  })

  it("keeps the theme subpath focused on runtime resolution APIs", () => {
    expect(namedApiKeys(themeApi)).toEqual([
      "NATIVE_CONDITION_BREAKPOINTS",
      "NATIVE_RESPONSIVE_CONDITION_MATCHERS",
      "NATIVE_RESPONSIVE_CONDITION_NAMES",
      "NativeExpressionEvaluationError",
      "NativeThemeTokenReferenceType",
      "ThemeProvider",
      "TokenThemeProvider",
      "TokenThemeScopeProvider",
      "createComponentRecipeResolutionPlan",
      "createComponentRecipeResolver",
      "createNativeConditionResolver",
      "createNativeConditionStore",
      "createNativeExpressionRuntime",
      "createNativeMapValueFn",
      "createNativeNormalizeValueFn",
      "createRecipeResolver",
      "createSprinklesResolver",
      "createThemeDependencyPlan",
      "createThemeDependencyResolver",
      "createThemeTokenReference",
      "defaultNativeConditionSnapshot",
      "evaluateNativeExpression",
      "foldNativeExpression",
      "isThemeTokenReference",
      "isTokenThemeCompatible",
      "mapNativeConditionValueToBranches",
      "nativeConditionSnapshotKey",
      "normalizeNativeConditionInput",
      "resolveComponentRecipeResolutionPlan",
      "resolveComponentRecipeStyles",
      "resolveRecipeStyle",
      "resolveThemeStyles",
      "resolveThemeTokens",
      "useNativeConditionSnapshot",
      "useTheme",
      "useThemeSelector",
      "useThemedStyle",
      "useThemedStyles",
      "useTokenTheme",
    ])
  })

  it("exposes a lean theme/core subpath for common runtime consumers", () => {
    expect(namedApiKeys(themeCoreApi)).toEqual([
      "NATIVE_CONDITION_BREAKPOINTS",
      "NATIVE_RESPONSIVE_CONDITION_MATCHERS",
      "NATIVE_RESPONSIVE_CONDITION_NAMES",
      "NativeThemeTokenReferenceType",
      "ThemeProvider",
      "createNativeConditionResolver",
      "createNativeConditionStore",
      "createNativeMapValueFn",
      "createNativeNormalizeValueFn",
      "createThemeTokenReference",
      "defaultNativeConditionSnapshot",
      "isThemeTokenReference",
      "mapNativeConditionValueToBranches",
      "nativeConditionSnapshotKey",
      "normalizeNativeConditionInput",
      "resolveThemeStyles",
      "resolveThemeTokens",
      "useNativeConditionSnapshot",
      "useTheme",
      "useThemeSelector",
      "useThemedStyle",
      "useThemedStyles",
    ])
  })

  it("exposes domain contracts separately from the Effect-backed schema entrypoint", () => {
    expect(namedApiKeys(tokenApi)).toEqual([
      "TOKEN_THEME_CONTEXT_PRECEDENCE",
      "TokenAliasDefinitionType",
      "TokenDefinitionType",
      "alias",
      "applyTokenThemePatch",
      "createTokenContract",
      "createTokenTheme",
      "createTokenThemeFromExternalPayload",
      "createTokenThemeScope",
      "createTokenThemeScopedSnapshot",
      "createTokenThemeSnapshot",
      "defineAlias",
      "defineToken",
      "getTokenContractIdentity",
      "getTokenContractKey",
      "getTokenId",
      "getTokenOrigin",
      "isTokenAliasDefinition",
      "isTokenDefinition",
      "isTokenDomainValue",
      "token",
    ])
    expect(namedApiKeys(tokenSchemaApi)).toEqual([
      "decodeExternalTokenTheme",
      "decodeTokenValue",
      "encodeExternalTokenTheme",
      "externalTokenThemeCodec",
    ])
    expect(namedApiKeys(tokenOpticApi)).toEqual([
      "createTokenThemeFocus",
    ])
  })

  it("keeps diagnostics and Metro integration available from the package root", () => {
    expect(rootApi).toHaveProperty("NativeStylesDiagnosticCode")
    expect(rootApi).toHaveProperty("withNativeStyles")
    expect(rootApi).toHaveProperty("createSprinkles")
    expect(rootApi).toHaveProperty("defineProperties")
    expect(rootApi).not.toHaveProperty("componentRecipe")
    expect(rootApi).not.toHaveProperty("componentRecipeFromRecipe")
    expect(rootApi).not.toHaveProperty("ThemeProvider")
    expect(rootApi).not.toHaveProperty("createRecipeResolver")
  })
})
