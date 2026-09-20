import { createTokenContract, createTokenTheme, defineToken, type TokenContractIdentity } from "../src/tokens"
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

const typedTheme = useTokenTheme(contract)
const providerProps: Parameters<typeof TokenThemeProvider<typeof contract>>[0] = {
  contract,
  theme,
}

void typedTheme
void providerProps
