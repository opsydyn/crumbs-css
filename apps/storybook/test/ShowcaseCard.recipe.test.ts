import { describe, expect, it } from "bun:test"
import { endFileScope, setFileScope } from "@vanilla-extract/css/fileScope"
import { resolveComponentRecipeStyles } from "@opsydyn/crumbs-css/theme"

describe("ShowcaseCard action recipe", () => {
  it("uses base-only styles when disabled and pressed are selected together", async () => {
    setFileScope("showcase-card-recipe.test.css.ts", "@crumbs/storybook")
    let action: typeof import("../src/components/ShowcaseCard.css").action
    try {
      ;({ action } = await import("../src/components/ShowcaseCard.css"))
    } finally {
      endFileScope()
    }

    const enabledStyles = resolveComponentRecipeStyles(action, { disabled: false, pressed: true })
    expect(enabledStyles.root).toHaveLength(2)
    expect(enabledStyles.label).toHaveLength(1)

    const disabledStyles = resolveComponentRecipeStyles(action, { disabled: true, pressed: false })
    expect(disabledStyles.root).toHaveLength(2)
    expect(disabledStyles.label).toHaveLength(2)

    const warnings: string[] = []
    const originalWarn = console.warn
    let prohibitedStyles: typeof disabledStyles
    console.warn = (...args: ReadonlyArray<unknown>) => warnings.push(args.map(String).join(" "))
    try {
      prohibitedStyles = resolveComponentRecipeStyles(action, { disabled: true, pressed: true })
    } finally {
      console.warn = originalWarn
    }
    expect(prohibitedStyles.root).toHaveLength(1)
    expect(prohibitedStyles.label).toHaveLength(1)
    expect(warnings.some(message => message.includes('state "disabled" rejects normalized selection'))).toBe(true)
  })
})
