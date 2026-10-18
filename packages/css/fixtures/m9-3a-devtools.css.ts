import { createThemeContract, viewStyle, recipe } from "@opsydyn/crumbs-css/style"
const vars=createThemeContract({color:{panel:null}})
const first=viewStyle({opacity:0.4})
export const card=viewStyle([first,{opacity:0.8,backgroundColor:vars.color.panel}])
export const choice=recipe({base:{padding:12},variants:{selected:{false:{opacity:0.5},true:{opacity:1}}},defaultVariants:{selected:false}})
