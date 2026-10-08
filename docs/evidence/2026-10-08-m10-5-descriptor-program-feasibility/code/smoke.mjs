import{pathToFileURL}from'node:url'
import{writeFileSync}from'node:fs'
const root='/private/tmp/crumbs-m105-descriptor-program',rows=[],exports={}
for(const cohort of ['control','candidate'])for(const entry of ['theme-core.mjs','theme-core.cjs','theme.mjs','theme.cjs']){
 const api=await import(pathToFileURL(root+'/'+cohort+'/dist/'+entry))
 exports[cohort+':'+entry]=Object.keys(api).sort()
 if(cohort==='candidate'&&JSON.stringify(exports[cohort+':'+entry])!==JSON.stringify(exports['control:'+entry]))throw Error('Export drift')
 const theme={contract:{},values:{},tokens:{'--crumbs-probe':24}}
 const plain={color:'red'},style={width:api.createThemeTokenReference('--crumbs-probe')}
 const result=api.resolveThemeTokens(style,theme)
 if(result.width!==24||api.resolveThemeTokens(style,theme)!==result||api.resolveThemeTokens(plain,theme)!==plain)throw Error('Basic token/cache/alias smoke failed')
 const flattened=api.resolveThemeTokens([false,plain,style],theme)
 if(flattened.width!==24||flattened.color!=='red')throw Error('Basic recursive flatten smoke failed')
 rows.push({cohort,entry,receipt:'basic import/token/cache/alias/array smoke passed'})
}
writeFileSync(root+'/smoke.json',JSON.stringify({qualification:'diagnostic-only',host:process.version,rows,exports},null,2))
console.log(JSON.stringify({receipts:rows.length,qualification:'diagnostic-only'}))
