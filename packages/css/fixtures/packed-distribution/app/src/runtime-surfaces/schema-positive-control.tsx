import { Text, View } from "react-native"
import { decodeExternalTokenTheme } from "@opsydyn/crumbs-css/tokens/schema"

const decodedTheme = decodeExternalTokenTheme({
  _tag: "CrumbsTokenTheme",
  version: 1,
  contract: { owner: "@acme/runtime-surfaces", name: "PositiveControl", version: 1 },
  values: { "color.canvas": "#f7f8fb" },
})
if (!("value" in decodedTheme)) throw new Error("The tree-shaking positive-control payload must decode")
const decodedValue = decodedTheme.value

export default function SchemaPositiveControlSurface() {
  return (
    <View>
      <Text>{decodedValue.values["color.canvas"]}</Text>
    </View>
  )
}
