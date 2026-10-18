import {expect,it} from "bun:test"
import {validateWidgetMapSet,widgetMapSources} from "../../../scripts/m9-3a-devtools-qualification"
it("rejects incomplete platform exports and development tooling in production",()=>{
 expect(()=>validateWidgetMapSet([])).toThrow()
 expect(()=>validateWidgetMapSet([{platform:"web",dev:false,sources:["node_modules/@opsydyn/crumbs-css/dist/devtools-native.mjs"],metadata:false}])).toThrow()
 const rows=["ios","android","web"].flatMap(platform=>[
  {platform,dev:true,sources:["node_modules/@opsydyn/crumbs-css/dist/devtools-native.mjs"],metadata:true},
  {platform,dev:false,sources:["node_modules/@opsydyn/crumbs-css/dist/theme-core.mjs"],metadata:false},
 ])
 expect(()=>validateWidgetMapSet(rows)).not.toThrow()
 expect(()=>validateWidgetMapSet(rows.map(row=>row.dev?row:{...row,sources:[]}))).toThrow()
 expect(()=>validateWidgetMapSet(rows.map(row=>row.dev?row:{...row,sources:["node_modules/react/index.js"]}))).toThrow()
 expect(()=>validateWidgetMapSet(rows.map(row=>row.dev?{...row,metadata:false}:row))).toThrow()
 expect(()=>validateWidgetMapSet([...rows,rows[0]!])).toThrow()
})

it("traverses sectioned Metro maps and rejects missing embedded maps",()=>{
 expect(widgetMapSources({sections:[{map:{sources:["one"]}},{map:{sections:[{map:{sources:["two"]}}]}}]})).toEqual(["one","two"])
 expect(()=>widgetMapSources({sections:[{}]})).toThrow()
})
