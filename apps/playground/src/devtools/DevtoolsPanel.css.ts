import { viewStyle, textStyle, recipe } from "@opsydyn/crumbs-css/style"
import { vars } from "../theme.css"
export const card=viewStyle({backgroundColor:vars.playground.color.panel,padding:16,borderRadius:12,marginBottom:12})
export const copy=textStyle({color:vars.playground.color.text,fontSize:16})
const first=viewStyle({opacity:0.4})
export const override=viewStyle([first,{opacity:0.8,padding:12}])
export const choice=recipe({base:{padding:12},variants:{selected:{true:{opacity:1},false:{opacity:0.5}}},defaultVariants:{selected:false}})
