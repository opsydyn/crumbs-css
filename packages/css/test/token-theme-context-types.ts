import {
  createTokenContract,
  createTokenThemeSnapshot,
  defineToken,
  type TokenThemeLayer,
} from "../src/tokens"

const vars = createTokenContract({
  color: {accent: defineToken("color")},
  space: {md: defineToken("length")},
  display: {mode: defineToken({kind: "enum", values: ["flex", "none"] as const})},
})

const base = {
  color: {accent: "#fff"},
  space: {md: 8},
  display: {mode: "flex" as const},
}

const brand: TokenThemeLayer<typeof vars> = {color: {accent: "#000"}}
const mode: TokenThemeLayer<typeof vars> = {display: {mode: "none"}}
const density: TokenThemeLayer<typeof vars> = {space: {md: 4}}

createTokenThemeSnapshot(vars, {base, contexts: {brand, mode, density}})

// @ts-expect-error colour values cannot be supplied to a length context field.
createTokenThemeSnapshot(vars, {base, contexts: {density: {space: {md: "compact"}}}})

// @ts-expect-error enum contexts retain the declared literal set.
createTokenThemeSnapshot(vars, {base, contexts: {mode: {display: {mode: "dark"}}}})
