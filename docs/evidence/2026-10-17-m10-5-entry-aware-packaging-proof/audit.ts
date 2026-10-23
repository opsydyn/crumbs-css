import {writeFileSync,readFileSync,mkdirSync,copyFileSync,cpSync} from "node:fs"
import {resolve} from "node:path"
import {pathToFileURL} from "node:url"
const base=resolve(process.argv[2]!)
const repository=resolve(process.argv[3]!)
const {auditPackedRuntimeEntrypoints}=await import(pathToFileURL(resolve(repository,"scripts/packed-runtime-graph.ts")).href)
const {assertRuntimeBundleSources}=await import(pathToFileURL(resolve(repository,"scripts/runtime-bundle-contract.ts")).href)
const {readEmittedGraph}=await import(pathToFileURL(resolve(repository,"packages/css/bench/effect-boundary-audit.ts")).href)
const receipt:Record<string,any>={}
for(const label of ["control","candidate"]){
 const root=resolve(base,label,"packages/css")
 const graphs=await auditPackedRuntimeEntrypoints(root)
 const sourceGuards=graphs.filter(g=>g.classification==="ordinary-runtime").map(g=>{
  try{return{subpath:g.subpath,format:g.format,status:"pass",count:assertRuntimeBundleSources(g.files.map(f=>resolve(root,f)))}}
  catch(e){return{subpath:g.subpath,format:g.format,status:"fail",error:String(e)}}
 })
 receipt[label]={packedGraphStatus:"pass",graphs,sourceGuards,style:Object.fromEntries(["mjs","cjs"].map(format=>[format,readEmittedGraph(resolve(root,`dist/style.${format}`))]))}
}
writeFileSync(resolve(base,"isolation.json"),JSON.stringify({execution:{buildHost:"node",node:"24.15.0",auditHost:`Bun ${Bun.version}`,newLayoutCount:1},...receipt},null,2)+"\n")
const negatives=[]
for(const kind of ["direct","transitive"]){
 for(const [format,extension]of [["esm","mjs"],["cjs","cjs"]]){
  const root=resolve(base,"negative-controls",`${kind}-${format}`)
  mkdirSync(root,{recursive:true})
  cpSync(resolve(base,"candidate/packages/css/dist"),resolve(root,"dist"),{recursive:true})
  copyFileSync(resolve(base,"candidate/packages/css/package.json"),resolve(root,"package.json"))
  const tokens=receipt.candidate.graphs.find((g:any)=>g.subpath==="./tokens"&&g.format===format)
  const target=kind==="direct"?`dist/tokens.${extension}`:tokens.files.find((f:string)=>f.includes("~lq85xt2r-"))
  if(!target)throw Error("Missing real transitive token chunk")
  const injection=format==="esm"?'import "@vanilla-extract/css";\n':'require("@vanilla-extract/css");\n'
  writeFileSync(resolve(root,target),injection+readFileSync(resolve(root,target),"utf8"))
  let error:string|undefined
  try{await auditPackedRuntimeEntrypoints(root)}catch(e){error=String(e)}
  if(!error?.includes("ordinary-runtime export imports unauthorized external @vanilla-extract/css"))throw Error(`Negative control did not reject: ${kind} ${format}: ${error}`)
  negatives.push({kind,format,target,status:"rejected-as-required",error})
 }
}
writeFileSync(resolve(base,"negative-controls.json"),JSON.stringify(negatives,null,2)+"\n")
console.log(JSON.stringify({controlGraphs:receipt.control.graphs.length,candidateGraphs:receipt.candidate.graphs.length,controlGuardFailures:receipt.control.sourceGuards.filter((r:any)=>r.status==="fail").length,candidateGuardFailures:receipt.candidate.sourceGuards.filter((r:any)=>r.status==="fail").length,negativeControls:negatives.length},null,2))
