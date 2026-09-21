import {describe, expect, it} from "bun:test"
import {
  createThemeDependencyPlan,
  createThemeDependencyResolver,
} from "../src/theme-runtime"

const color = "--crumbs-color-accent"
const space = "--crumbs-space-md"
const contract = {}

function theme(colorValue: string, spaceValue: number, extra: Record<string, string | number> = {}) {
  return {
    contract,
    values: {},
    tokens: {[color]: colorValue, [space]: spaceValue, ...extra},
  }
}

describe("compiler dependency plans", () => {
  it("canonicalises paths, merges duplicate entries and freezes the plan", () => {
    const plan = createThemeDependencyPlan([
      {path: ["panel"], tokens: [space, color]},
      {path: ["panel"], tokens: [color]},
      {path: ["variants", "primary"], tokens: [color]},
    ])

    expect(plan.entries).toEqual([
      {path: ["panel"], tokens: [color, space]},
      {path: ["variants", "primary"], tokens: [color]},
    ])
    expect(Object.isFrozen(plan)).toBe(true)
    expect(Object.isFrozen(plan.entries)).toBe(true)
    expect(Object.isFrozen(plan.entries[0]!.path)).toBe(true)
    expect(Object.isFrozen(plan.entries[0]!.tokens)).toBe(true)
  })

  it("recomputes only affected paths and reports changed output notifications", () => {
    const styles = {
      panel: {color: {$$type: "crumbs.css.theme-token", varName: color}, padding: {$$type: "crumbs.css.theme-token", varName: space}},
      label: {color: {$$type: "crumbs.css.theme-token", varName: color}},
      staticStyle: {opacity: 0.5},
    }
    const plan = createThemeDependencyPlan([
      {path: ["panel"], tokens: [color, space]},
      {path: ["label"], tokens: [color]},
    ])
    const resolver = createThemeDependencyResolver(styles, plan)

    const first = resolver.resolve(theme("#2463eb", 12))
    expect(first.value as unknown).toEqual({
      panel: {color: "#2463eb", padding: 12},
      label: {color: "#2463eb"},
      staticStyle: {opacity: 0.5},
    })
    expect(first.metrics).toEqual({recomputations: 2, notifications: 0, changedTokens: [color, space]})

    const same = resolver.resolve(theme("#2463eb", 12))
    expect(same.value).toBe(first.value)
    expect(same.metrics).toEqual({recomputations: 0, notifications: 0, changedTokens: []})

    const unrelated = resolver.resolve(theme("#2463eb", 12, {"--crumbs-unrelated": 99}))
    expect(unrelated.value).toBe(first.value)
    expect(unrelated.metrics).toEqual({recomputations: 0, notifications: 0, changedTokens: []})

    const spacing = resolver.resolve(theme("#2463eb", 16))
    expect(spacing.metrics).toEqual({recomputations: 1, notifications: 1, changedTokens: [space]})
    expect(spacing.value).not.toBe(first.value)
    expect(spacing.value.panel).not.toBe(first.value.panel)
    expect(spacing.value.label).toBe(first.value.label)
    expect(spacing.value.staticStyle).toBe(first.value.staticStyle)

    const colorSameValue = resolver.resolve(theme("#2463eb", 18))
    expect(colorSameValue.metrics).toEqual({recomputations: 1, notifications: 1, changedTokens: [space]})

    const colorChanged = resolver.resolve(theme("#7c3aed", 18))
    expect(colorChanged.metrics).toEqual({recomputations: 2, notifications: 2, changedTokens: [color]})
    expect(colorChanged.value.panel).not.toBe(spacing.value.panel)
    expect(colorChanged.value.label).not.toBe(spacing.value.label)

    const differentContract = resolver.resolve({
      contract: {},
      values: {},
      tokens: {[color]: "#7c3aed", [space]: 18},
    })
    expect(differentContract.value).toBe(colorChanged.value)
    expect(differentContract.metrics).toEqual({recomputations: 2, notifications: 0, changedTokens: [color, space]})
  })

  it("fails closed when a compiler path does not match the runtime export", () => {
    const resolver = createThemeDependencyResolver(
      {panel: {color: {$$type: "crumbs.css.theme-token", varName: color}}},
      createThemeDependencyPlan([{path: ["missing"], tokens: [color]}]),
    )

    expect(() => resolver.resolve(theme("#2463eb", 12))).toThrow(/Theme dependency plan path does not exist/)
    expect(() => createThemeDependencyResolver(
      {panel: {}},
      {$$type: "crumbs.css.theme-dependency-plan", version: 2, entries: []} as unknown as Parameters<typeof createThemeDependencyResolver>[1],
    )).toThrow(/Unsupported theme dependency plan version/)
  })
})
