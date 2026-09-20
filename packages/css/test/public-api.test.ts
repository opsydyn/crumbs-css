import { describe, expect, it } from "bun:test"
import * as rootApi from "@opsydyn/crumbs-css"
import * as styleApi from "@opsydyn/crumbs-css/style"
import * as themeApi from "@opsydyn/crumbs-css/theme"
import * as tokenApi from "@opsydyn/crumbs-css/tokens"
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
      "NativeThemeTokenReferenceType",
      "createTheme",
      "createThemeContract",
      "createThemeTokenReference",
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
      "NativeThemeTokenReferenceType",
      "ThemeProvider",
      "TokenThemeProvider",
      "createRecipeResolver",
      "createThemeTokenReference",
      "isThemeTokenReference",
      "isTokenThemeCompatible",
      "resolveRecipeStyle",
      "resolveThemeStyles",
      "resolveThemeTokens",
      "useTheme",
      "useThemedStyle",
      "useThemedStyles",
      "useTokenTheme",
    ])
  })

  it("exposes domain contracts separately from the Effect-backed schema entrypoint", () => {
    expect(namedApiKeys(tokenApi)).toEqual([
      "TokenAliasDefinitionType",
      "TokenDefinitionType",
      "alias",
      "createTokenContract",
      "createTokenTheme",
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
    expect(namedApiKeys(tokenSchemaApi)).toEqual(["decodeTokenValue"])
  })

  it("keeps diagnostics and Metro integration available from the package root", () => {
    expect(rootApi).toHaveProperty("NativeStylesDiagnosticCode")
    expect(rootApi).toHaveProperty("withNativeStyles")
    expect(rootApi).not.toHaveProperty("ThemeProvider")
    expect(rootApi).not.toHaveProperty("createRecipeResolver")
  })
})
