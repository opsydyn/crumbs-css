import { Text, View } from "react-native"
import { decodeTokenValue } from "@opsydyn/crumbs-css/tokens/schema/value"

const decodedCanvas = decodeTokenValue({ kind: "color" }, "#f7f8fb")

export default function SchemaDecoderSurface() {
  return (
    <View>
      <Text>{decodedCanvas}</Text>
    </View>
  )
}
