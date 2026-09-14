import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import {createThemeTokenReference, isThemeTokenReference, NativeThemeTokenReferenceType} from "../src/theme-token"
import {resolveThemeTokens, resolveThemeStyles} from "../src/theme-runtime"
import {cssDeclarationsToRN} from "../src/css-to-rn"
const tag = NativeThemeTokenReferenceType
const theme = {contract: {}, values: {}, tokens: {"--crumbs-valid": 24}}
const malformed: unknown[] = [
  {$$type: tag}, {$$type: tag, varName: 24}, {$$type: tag, varName: ""},
  {$$type: tag, varName: "--browser-x"}, {$$type: tag, varName: "--crumbs-x)"},
  {$$type: tag, varName: "--crumbs-x y"}, {$$type: tag, varName: "--crumbs-"},
  Object.create({$$type: tag, varName: "--crumbs-valid"}),
  Object.assign([], {$$type: tag, varName: "--crumbs-valid"}),
  {$$type: tag, varName: "--crumbs-valid", extra: true},
]
describe("native token reference admission", () => {
  it("rejects malformed reference shapes in guards and both resolvers", () => {
    for (const value of malformed) {
      expect(isThemeTokenReference(value)).toBe(false)
      expect(() => resolveThemeTokens({width: value}, theme)).toThrow(/CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE.*width/)
      expect(() => resolveThemeStyles({panel: {width: value}}, theme)).toThrow(/CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE/)
    }
  })
  it("never executes reference accessors", () => {
    let calls = 0
    const value = {$$type: tag, get varName() {calls++; return "--crumbs-valid"}}
    const tagged = {get $$type() {calls++; return tag}, varName: "--crumbs-valid"}
    for (const input of [value, tagged]) {
      expect(isThemeTokenReference(input)).toBe(false)
      expect(() => resolveThemeStyles({panel: {width: input}}, theme)).toThrow(/CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE/)
    }
    expect(calls).toBe(0)
  })
  it("validates constructors and uses own theme tokens with stable missing diagnostics", () => {
    for (const name of ["--crumbs-", "var(--crumbs-valid)", "--browser-valid", "--crumbs-x y"]) {
      expect(() => createThemeTokenReference(name)).toThrow(/CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE/)
    }
    const inherited = { ...theme, tokens: Object.create({"--crumbs-valid": 99}) }
    expect(() => resolveThemeTokens({width: createThemeTokenReference("--crumbs-valid")}, inherited)).toThrow(/CRUMBS_CSS_MISSING_THEME_TOKEN/)
    expect(resolveThemeTokens({width: createThemeTokenReference("--crumbs-valid")}, theme)).toEqual({width: 24})
  })
  it("keeps valid JSON/null-prototype DTOs, overridden invalid values and opaque nested values", () => {
    const ref = createThemeTokenReference("--crumbs-valid")
    expect(isThemeTokenReference(JSON.parse(JSON.stringify(ref)))).toBe(true)
    expect(isThemeTokenReference(Object.assign(Object.create(null), ref))).toBe(true)
    expect(resolveThemeTokens([{width: malformed[0]}, {width: 3}], theme)).toEqual({width: 3})
    const transform = [{translateX: malformed[0]}]
    expect(resolveThemeTokens({transform}, theme)?.transform as unknown).toBe(transform)
  })
  it("admits generated valid names and rejects generated invalid suffixes", () => {
    const suffix = fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"), {minLength: 1,maxLength: 30}).map(chars => chars.join(""))
    fc.assert(fc.property(suffix, suffix => {
      const ref = createThemeTokenReference(`--crumbs-${suffix}`)
      expect(isThemeTokenReference(ref)).toBe(true)
      expect(isThemeTokenReference({...ref, varName: `${ref.varName})`})).toBe(false)
    }), {seed: 20260919, numRuns: 100})
  })
  it("checks supported and unknown properties identically for literals and tokens", () => {
    for (const value of ["2px", "var(--crumbs-valid)"]) {
      expect(() => cssDeclarationsToRN([["unknown-native-property", value]], {strictDiagnostics: true})).toThrow(/CRUMBS_CSS_DROPPED_DECLARATION/)
      expect(cssDeclarationsToRN([["width", value]], {strictDiagnostics: true})).toHaveProperty("width")
    }
    expect(() => cssDeclarationsToRN([["width", "var(--crumbs-invalid name)"]])).toThrow(/CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE/)
  })
})
