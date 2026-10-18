import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import { ShowcaseCard } from "../ShowcaseCard"
import { InspectorProbe, ClipboardCheck } from "./adapter"
import * as s from "./DevtoolsFixture.css"
export function DevtoolsFixture(){
 const [disabled,setDisabled]=useState(false),[actions,setActions]=useState(0),[mounted,setMounted]=useState(true)
 const styles=useThemedStyles(s)
 return <View><ShowcaseCard disabled={disabled} onActionPress={()=>setActions(n=>n+1)} title="Inspect this card" body="Use the Crumbs button to explain scoped tokens and idle/disabled action variants."/>
 <Text>Action count: {actions}</Text><Pressable accessibilityRole="button" accessibilityLabel="Toggle inspected variant" onPress={()=>setDisabled(v=>!v)}><Text>Action disabled: {String(disabled)}</Text></Pressable>
 <View style={styles.override}><InspectorProbe label="Override opacity" module={s} exportPath={["override"]}/><Text>Opacity 0.4 overridden by 0.8</Text></View>
 <Pressable accessibilityRole="button" accessibilityLabel="Toggle inspector target" onPress={()=>setMounted(v=>!v)}><Text>Toggle registered target</Text></Pressable>
 {mounted&&<InspectorProbe label="Missing metadata" module={{card:{opacity:0.3}}} exportPath={["card"]}/>}
 <ClipboardCheck/></View>
}
