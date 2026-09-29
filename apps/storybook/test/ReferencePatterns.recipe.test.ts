import { describe, expect, it } from "bun:test"
import { endFileScope, setFileScope } from "@vanilla-extract/css/fileScope"
import { resolveComponentRecipeStyles } from "@opsydyn/crumbs-css/theme"

describe("reference system component recipes", () => {
  it("composes button tone and pressed state in authored order", async () => {
    setFileScope("reference-patterns-recipe.test.css.ts", "@crumbs/storybook")
    let button: typeof import("../src/components/ReferencePatterns.css").actionButton
    try {
      ;({ actionButton: button } = await import("../src/components/ReferencePatterns.css"))
    } finally {
      endFileScope()
    }

    const styles = resolveComponentRecipeStyles(button, {
      disabled: false,
      pressed: true,
      tone: "neutral",
    })

    expect(styles.root).toHaveLength(3)
    expect(styles.label).toHaveLength(2)
  })

  it("composes input focus and validation states without losing control styles", async () => {
    setFileScope("reference-patterns-input.test.css.ts", "@crumbs/storybook")
    let input: typeof import("../src/components/ReferencePatterns.css").inputField
    try {
      ;({ inputField: input } = await import("../src/components/ReferencePatterns.css"))
    } finally {
      endFileScope()
    }

    const styles = resolveComponentRecipeStyles(input, {
      disabled: false,
      focused: true,
      invalid: true,
    })

    expect(styles.control).toHaveLength(3)
    expect(styles.label).toHaveLength(1)
    expect(styles.message).toHaveLength(2)
  })

  it("keeps selected and disabled state available to selection controls", async () => {
    setFileScope("reference-patterns-selection.test.css.ts", "@crumbs/storybook")
    let selection: typeof import("../src/components/ReferencePatterns.css").selectionControl
    try {
      ;({ selectionControl: selection } = await import("../src/components/ReferencePatterns.css"))
    } finally {
      endFileScope()
    }

    const styles = resolveComponentRecipeStyles(selection, { disabled: true, selected: true })

    expect(styles.root).toHaveLength(2)
    expect(styles.indicator).toHaveLength(3)
    expect(styles.label).toHaveLength(2)
  })
})
