import { expect, mock, test } from "bun:test"
import * as ReactNativeWeb from "react-native-web"
import { dirname, resolve } from "node:path"
import { readFile } from "node:fs/promises"

// Bun's Node-style test runtime cannot parse React Native's Flow entrypoint.
// Metro is separately exercised for iOS and web; map native components to the
// consumer's installed web implementation for this host-side interaction test.
mock.module("react-native", () => ReactNativeWeb)
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
await Bun.plugin({
  name: "crumbs-packed-web-styles",
  setup(builder) {
    builder.onResolve({ filter: /[.]styles$/ }, args => ({
      path: resolve(dirname(args.importer), args.path + ".web.js"),
    }))
    builder.onLoad({ filter: /portal.*index[.]mjs$/ }, async args => ({
      contents: await readFile(args.path, "utf8"),
      loader: "jsx",
    }))
  },
})

const { default: TestRenderer, act } = await import("react-test-renderer")
const { brandScopes } = await import("@acme/design-tokens")
const { default: App } = await import("../src/App")

function flattenStyles(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(flattenStyles)
  return value !== null && typeof value === "object"
    ? [value as Record<string, unknown>]
    : []
}

test("packed ActionCard supports two brands, a scoped portal, and disabled accessibility", async () => {
  expect(brandScopes.signal.color.accent).toBe("#c42f73")

  let renderer
  await act(() => {
    renderer = TestRenderer.create(<App />)
  })
  if (renderer === undefined) throw new Error("Packed app did not render")

  const buttons = renderer.root.findAll(node => node.type === ReactNativeWeb.Pressable)
  expect(buttons).toHaveLength(3)
  expect(buttons.every(button => button.props.accessibilityRole === "button")).toBe(true)

  const resolvedBackgrounds = buttons.map(button => {
    const style = button.props.style
    return flattenStyles(typeof style === "function" ? style({ pressed: false }) : style)
      .map(slot => slot.backgroundColor)
      .find(color => color !== undefined)
  })
  expect(resolvedBackgrounds).toEqual(["#2457d6", "#c42f73", "#c42f73"])

  const disabledButton = buttons.find(button => button.props.disabled === true)
  expect(disabledButton).toBeDefined()
  expect(disabledButton?.props.accessibilityState).toMatchObject({ disabled: true })
  const disabledStyle = flattenStyles(disabledButton?.props.style({ pressed: false }))
  expect(disabledStyle).toContainEqual(expect.objectContaining({ opacity: 0.5 }))
})
