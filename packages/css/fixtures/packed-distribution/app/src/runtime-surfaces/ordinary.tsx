import { Text, View } from "react-native"
import { createThemeTokenReference, resolveThemeTokens } from "@opsydyn/crumbs-css/theme/core"
import { createTokenContract, createTokenTheme, defineToken } from "@opsydyn/crumbs-css/tokens"

const contract = createTokenContract({
  color: { canvas: defineToken("color") },
  space: { card: defineToken({ kind: "length" }) },
}, { owner: "@acme/runtime-surfaces", name: "Ordinary", version: 1 })
const theme = createTokenTheme(contract, {
  color: { canvas: "#f7f8fb" },
  space: { card: 16 },
})
const canvasName = contract.color.canvas.slice(4, -1)
const cardStyles = resolveThemeTokens({
  backgroundColor: createThemeTokenReference(canvasName),
  padding: contract.space.card,
}, theme) ?? {}

export default function OrdinaryRuntimeSurface() {
  return (
    <View style={cardStyles}>
      <Text>Ordinary theme and token runtime</Text>
    </View>
  )
}
