import {
  createTokenContract,
  createTokenTheme,
  defineAlias,
  defineToken,
  type PrivateDomainThemeVar,
  type PublicDomainThemeVar,
  type TokenContractIdentity,
} from "../src/tokens"
import { TokenThemeProvider, useTokenTheme } from "../src/theme-runtime"

const identity: TokenContractIdentity = {
  owner: "@acme/tokens",
  name: "foundation",
  version: 1,
}
const contract = createTokenContract({
  color: { accent: defineToken("color") },
  space: { md: defineToken({kind: "length"}) },
}, identity)
const theme = createTokenTheme(contract, {color: {accent: "#fff"}, space: {md: 8}})

const visibilityContract = createTokenContract({
  color: {accent: defineToken("color"), internal: defineToken("color")},
  semantic: {accent: defineAlias("color.accent")},
}, {
  identity: {owner: "@acme/tokens", name: "visibility-types", version: 1},
  visibility: {public: [["color", "accent"]]},
})
const publicReference: PublicDomainThemeVar = visibilityContract.color.accent
const aliasPublicReference: PublicDomainThemeVar = visibilityContract.semantic.accent
const privateReference: PrivateDomainThemeVar = visibilityContract.color.internal
// @ts-expect-error private token references are not assignable to public style tokens
const privatePublicReference: PublicDomainThemeVar = visibilityContract.color.internal

const typedTheme = useTokenTheme(contract)
const providerProps: Parameters<typeof TokenThemeProvider<typeof contract>>[0] = {
  contract,
  theme,
}

void [typedTheme, providerProps, publicReference, aliasPublicReference, privateReference, privatePublicReference]
