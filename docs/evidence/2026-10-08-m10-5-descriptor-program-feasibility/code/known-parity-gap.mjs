import{pathToFileURL}from'node:url'
import{writeFileSync}from'node:fs'
const root='/private/tmp/crumbs-m105-descriptor-program',rows=[]
function constructible(fn){try{Reflect.construct(Object,[],fn);return true}catch(error){if(error instanceof TypeError)return false;throw error}}
for(const format of ['mjs','cjs']){
 const results={}
 for(const cohort of ['control','candidate']){
  const api=await import(pathToFileURL(root+'/'+cohort+'/dist/theme.'+format))
  const resolver=api.createThemeDependencyResolver({},{$$type:'crumbs.css.theme-dependency-plan',version:1,entries:[]})
  results[cohort]={name:resolver.resolve.name,length:resolver.resolve.length,hasOwnPrototype:Object.hasOwn(resolver.resolve,'prototype'),constructible:constructible(resolver.resolve)}
 }
 if(JSON.stringify(results.control)===JSON.stringify(results.candidate))throw Error('Expected concrete prototype limitation not observed')
 rows.push({format,...results,parity:'failed'})
}
writeFileSync(root+'/known-parity-gap.json',JSON.stringify({qualification:'diagnostic-only',reason:'Interpreted method uses a rest-parameter ordinary function; observable metadata and constructibility differ',rows},null,2))
console.log(JSON.stringify(rows))
