import type { ReactNode } from "react"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context"
import * as Clipboard from "expo-clipboard"
import { CrumbsDevtoolsProvider, CrumbsDevtoolsWidget, useCrumbsInspectorTarget } from "@opsydyn/crumbs-css/devtools/native"
import type { CrumbsInspectorInput } from "@opsydyn/crumbs-css/devtools/native"
import { useTheme } from "@opsydyn/crumbs-css/theme/core"
export type InspectorProbeProps = { label: string; module: CrumbsInspectorInput["module"]; exportPath: CrumbsInspectorInput["exportPath"]; selection?: Readonly<Record<string, unknown>>; conditions?: CrumbsInspectorInput["current"]["conditions"] }
export function InspectorProbe({label,module,exportPath,selection,conditions}:InspectorProbeProps){
 const theme=useTheme()
 useCrumbsInspectorTarget({label,exportPath,getInput:()=>({module:{...module},exportPath,current:{theme,...(selection?{selection}:{}),...(conditions?{conditions}: {})}})})
 return null
}
// Test-only readback checksum; not a security or integrity primitive.
let lastCopiedChecksum: string | null = null
function checksum(text: string): string {
 let hash = 0x811c9dc5
 for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193)
 return `${text.length}:${(hash >>> 0).toString(16)}`
}
function Widget(){
 const insets=useSafeAreaInsets()
 return <CrumbsDevtoolsWidget insets={{top:insets.top+12,bottom:insets.bottom+12,left:12,right:12}} copyText={async text=>{await Clipboard.setStringAsync(text);lastCopiedChecksum=checksum(text)}}/>
}
export function InspectorHost({children}:{children:ReactNode}){
 return <SafeAreaProvider><CrumbsDevtoolsProvider>{children}<Widget/></CrumbsDevtoolsProvider></SafeAreaProvider>
}
export function ClipboardCheck() {
 const [result, setResult] = useState("Clipboard not read")
 async function verify() {
  try {
   const text = await Clipboard.getStringAsync()
   const value = JSON.parse(text)
   setResult(value.type === "crumbs.devtools.capture" && checksum(text) === lastCopiedChecksum
    ? `Clipboard matches: ${value.target.label} revision ${value.revision} checksum ${lastCopiedChecksum}`
    : "Clipboard does not match the prepared capture")
  } catch { setResult("Clipboard read failed or is not a capture") }
 }
 return <View>
  <Pressable accessibilityRole="button" accessibilityLabel="Verify copied report" onPress={() => { void verify() }}><Text>Verify copied report</Text></Pressable>
  <Text testID="crumbs-clipboard-check">{result}</Text>
 </View>
}
