import { describe, expect, it } from "bun:test"
import * as rootApi from "@opsydyn/crumbs-css"
import * as styleApi from "@opsydyn/crumbs-css/style"
import * as themeApi from "@opsydyn/crumbs-css/theme"
import * as themeCoreApi from "@opsydyn/crumbs-css/theme/core"
import * as themeTokenApi from "@opsydyn/crumbs-css/theme/token"
import * as themeConditionsApi from "@opsydyn/crumbs-css/theme/conditions"
import * as themeExpressionsApi from "@opsydyn/crumbs-css/theme/expressions"
import * as themeRecipesApi from "@opsydyn/crumbs-css/theme/recipes"
import * as themeSprinklesApi from "@opsydyn/crumbs-css/theme/sprinkles"
import * as tokenApi from "@opsydyn/crumbs-css/tokens"
import * as tokenOpticApi from "@opsydyn/crumbs-css/tokens/optic"
import * as tokenSchemaApi from "@opsydyn/crumbs-css/tokens/schema"
import * as tokenValueSchemaApi from "@opsydyn/crumbs-css/tokens/schema/value"
import type {
  NativeComponentPublicProps,
  NativeComponentStateVariants,
} from "@opsydyn/crumbs-css/style"

type PublicStateVariants = NativeComponentStateVariants<{
  status: {ready: object; loading: object}
  tone: {primary: object; quiet: object}
}>
const publicStateVariants: PublicStateVariants = {
  status: {ready: {tone: ["primary"]}, loading: {tone: ["quiet"]}},
}
void publicStateVariants
type PublicPropsExport = NativeComponentPublicProps<never>
void (null as unknown as PublicPropsExport)

function namedApiKeys(api: object): ReadonlyArray<string> {
  return Object.keys(api)
    .filter((key) => key !== "default")
    .sort()
}

function expectSharedThemeValuesToHaveIdentity(featureApi: object): void {
  const focused = featureApi as Readonly<Record<string, unknown>>
  const compatibility = themeApi as Readonly<Record<string, unknown>>
  for (const [name, value] of Object.entries(focused)) {
    if (Object.hasOwn(compatibility, name)) expect(value).toBe(compatibility[name])
  }
}

describe("@opsydyn/crumbs-css public API contract", () => {
  it("keeps the style subpath focused on css.ts authoring APIs", () => {
    expect(namedApiKeys(styleApi)).toEqual([
      "NATIVE_RESPONSIVE_CONDITION_MATCHERS",
      "NATIVE_RESPONSIVE_CONDITION_NAMES",
      "NativeComponentRecipeContractVersion",
      "NativeComponentRecipeExtensionType",
      "NativeComponentRecipeExtensionVersion",
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
      "extendComponentRecipe",
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

  it("exposes a deliberately narrow token-only theme runtime", () => {
    expect(namedApiKeys(themeTokenApi)).toEqual([
      "ThemeProvider",
      "createTokenStyles",
      "resolveTokenStyles",
      "themeToken",
      "useTokenStyles",
    ])
  })

  it("exposes the complete focused native condition runtime with shared theme identities", () => {
    expect(namedApiKeys(themeConditionsApi)).toEqual([
      "NATIVE_CONDITION_BREAKPOINTS",
      "NATIVE_RESPONSIVE_CONDITION_MATCHERS",
      "NATIVE_RESPONSIVE_CONDITION_NAMES",
      "createNativeConditionResolver",
      "createNativeConditionStore",
      "createNativeMapValueFn",
      "createNativeNormalizeValueFn",
      "defaultNativeConditionSnapshot",
      "mapNativeConditionValueToBranches",
      "nativeConditionSnapshotKey",
      "normalizeNativeConditionInput",
      "traceNativeConditionBranches",
      "useNativeConditionSnapshot",
    ].sort())
    expectSharedThemeValuesToHaveIdentity(themeConditionsApi)
  })

  it("exposes the complete focused native expression runtime with shared theme identities", () => {
    expect(namedApiKeys(themeExpressionsApi)).toEqual([
      "NativeExpressionEvaluationError",
      "NativeExpressionProgramType",
      "NativeExpressionProgramVersion",
      "NativeExpressionType",
      "NativeExpressionVersion",
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
      "evaluateNativeExpression",
      "evaluateNativeExpressionWithTrace",
      "foldNativeExpression",
      "isNativeExpression",
      "isNativeExpressionProgram",
      "nativeExpressionDependencyKey",
      "nativeExpressionDomainKey",
    ].sort())
    expectSharedThemeValuesToHaveIdentity(themeExpressionsApi)
  })

  it("exposes canonical recipe resolvers and plan constructors", () => {
    expect(namedApiKeys(themeRecipesApi)).toEqual([
      "createComponentRecipeResolutionPlan",
      "createComponentRecipeResolver",
      "createRecipeResolver",
      "resolveComponentRecipeResolutionPlan",
      "resolveComponentRecipeStyles",
      "resolveRecipeStyle",
    ])
    expectSharedThemeValuesToHaveIdentity(themeRecipesApi)
  })

  it("exposes the canonical Sprinkles resolver", () => {
    expect(namedApiKeys(themeSprinklesApi)).toEqual(["createSprinklesResolver"])
    expectSharedThemeValuesToHaveIdentity(themeSprinklesApi)
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
    expect(namedApiKeys(tokenValueSchemaApi)).toEqual(["decodeTokenValue"])
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
