import { useCrumbsInspectorTarget } from "@opsydyn/crumbs-css/devtools/native"
import type { CrumbsDevtoolsWidgetProps } from "@opsydyn/crumbs-css/devtools/native"
const widget:CrumbsDevtoolsWidgetProps={copyText:async()=>{}}
void widget
// @ts-expect-error clipboard adapter required
const noClipboard:CrumbsDevtoolsWidgetProps={}
void noClipboard
function types(){
 // @ts-expect-error getter required
 useCrumbsInspectorTarget({label:"card",exportPath:["card"]})
 // @ts-expect-error path segments must be strings or numbers
 useCrumbsInspectorTarget({label:"card",exportPath:[true],getInput:()=>({module:{},exportPath:[],current:{}})})
}
void types
