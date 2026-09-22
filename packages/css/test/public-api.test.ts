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
      "NativeRecipeClassType",
      "NativeRecipeType",
      "NativeSprinklesLookupPlanType",
      "NativeSprinklesLookupPlanVersion",
      "NativeThemeTokenReferenceType",
      "createSprinkles",
      "createSprinklesLookupPlan",
      "createTheme",
      "createThemeContract",
      "createThemeTokenReference",
      "defineProperties",
      "getThemeTokenPath",
      "getThemeVarName",
      "imageStyle",
      "isThemeTokenReference",
      "isThemeVar",
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
      "NativeThemeTokenReferenceType",
      "ThemeProvider",
      "TokenThemeProvider",
      "TokenThemeScopeProvider",
      "createNativeConditionResolver",
      "createNativeConditionStore",
      "createRecipeResolver",
      "createSprinklesResolver",
      "createThemeDependencyPlan",
      "createThemeDependencyResolver",
      "createThemeTokenReference",
      "defaultNativeConditionSnapshot",
      "isThemeTokenReference",
      "isTokenThemeCompatible",
      "nativeConditionSnapshotKey",
      "normalizeNativeConditionInput",
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
      "NativeThemeTokenReferenceType",
      "ThemeProvider",
      "createNativeConditionResolver",
      "createNativeConditionStore",
      "createThemeTokenReference",
      "defaultNativeConditionSnapshot",
      "isThemeTokenReference",
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
    expect(rootApi).not.toHaveProperty("ThemeProvider")
    expect(rootApi).not.toHaveProperty("createRecipeResolver")
  })
})
