import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import { resolveRecipeStyle } from "@opsydyn/crumbs-css/theme/recipes"
import { dark } from "../theme.css"
import { InspectorProbe, ClipboardCheck } from "./probes"
import * as s from "./DevtoolsPanel.css"
function Card({label}:{label:string}){const styles=useThemedStyles(s);return <View style={styles.card}><InspectorProbe label={label} module={s} exportPath={["card"]}/><Text style={styles.copy}>{label}</Text></View>}
export function DevtoolsPanel(){
 const styles=useThemedStyles(s),[selected,setSelected]=useState(false),[mounted,setMounted]=useState(true)
 return <View><Text style={styles.copy}>Devtools diagnosis cases</Text><Card label="Parent card"/><ThemeProvider theme={dark}><Card label="Nested dark card"/></ThemeProvider>
 <View style={styles.override}><InspectorProbe label="Override opacity" module={s} exportPath={["override"]}/><Text style={styles.copy}>Opacity 0.4 overridden by 0.8</Text></View>
 <Pressable accessibilityRole="button" accessibilityLabel="Toggle inspected variant" onPress={()=>setSelected(v=>!v)} style={[...resolveRecipeStyle(styles.choice,{selected})]}><Text style={styles.copy}>Variant selected: {String(selected)}</Text></Pressable>
 <InspectorProbe label="Selected variant" module={s} exportPath={["choice"]} selection={{selected}}/>
 <Pressable accessibilityRole="button" accessibilityLabel="Toggle inspector target" onPress={()=>setMounted(v=>!v)}><Text style={styles.copy}>Toggle registered target</Text></Pressable>
 {mounted&&<InspectorProbe label="Missing metadata" module={{card:{opacity:0.3}}} exportPath={["card"]}/>}
 <ClipboardCheck/></View>
}
