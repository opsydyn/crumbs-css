import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises"
import { join, resolve } from "node:path"
import { stage, identity } from "./playground"
import { assertRuntimeBundleSources } from "./runtime-bundle-contract"
export type WidgetMapRow = { platform: string; dev: boolean; sources: string[]; metadata: boolean }
export function validateWidgetMapSet(rows: readonly WidgetMapRow[]): void {
  const expected = new Set(["ios:true","ios:false","android:true","android:false","web:true","web:false"])
  for (const row of rows) {
    const key = `${row.platform}:${row.dev}`
    if (!expected.delete(key)) throw Error(`Unexpected or duplicate cohort ${key}`)
    const widget = row.sources.some(p => /devtools-native\.(?:mjs|cjs)$/.test(p))
    if (row.dev && (!widget || !row.metadata)) throw Error(`Missing widget/provenance in ${key}`)
    if (!row.dev) {
      if (assertRuntimeBundleSources(row.sources) === 0) throw Error(`Missing Crumbs runtime in ${key}`)
      if (widget || row.metadata || row.sources.some(p => /devtools\/(?:probes|DevtoolsPanel)|expo-clipboard/.test(p))) throw Error(`Debug implementation leaked into ${key}`)
    }
  }
  if (expected.size) throw Error(`Missing cohorts: ${[...expected].join(",")}`)
}
export function widgetMapSources(map: unknown): string[] {
  if (!map || typeof map !== "object") throw Error("Invalid source map")
  const value = map as { sources?: unknown; sections?: Array<{map:unknown}> }
  if (Array.isArray(value.sources) && value.sources.every(source => typeof source === "string")) return value.sources
  if (Array.isArray(value.sections) && value.sections.length) return value.sections.flatMap(section=>widgetMapSources(section.map))
  throw Error("Missing source map sources")
}
const digest = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex")
async function main() {
  const args = process.argv.slice(2), outArg = args.find(x => x.startsWith("--out=")), workerArg = args.find(x => x.startsWith("--worker="))
  if (!outArg || !workerArg || args.length !== 2 || !["babel","rust"].includes(workerArg.slice(9))) throw Error("Usage: --out=<new-owned-directory> --worker=babel|rust")
  const out = resolve(outArg.slice(6)), worker = workerArg.slice(9), root = resolve(import.meta.dir,"..")
  await mkdir(out) // Refuse overwriting a prior qualification.
  const commands: Array<{ name: string; exitCode: number; logSha256: string }> = []
  async function run(name: string, command: string[], cwd: string, env: Record<string,string|undefined> = process.env) {
    const child = Bun.spawn(command,{cwd,env,stdout:"pipe",stderr:"pipe"})
    const [stdout,stderr,exitCode] = await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited])
    const log = stdout + "\n" + stderr
    await writeFile(join(out,`${name}.log`),log)
    commands.push({name,exitCode,logSha256:digest(log)})
    if(exitCode!==0) throw Error(`${name} failed; inspect its owned log`)
    return stdout
  }
  try {
    const head=(await run("source-head",["git","rev-parse","HEAD"],root)).trim()
    const names=(await run("source-files",["git","ls-files","--cached","--others","--exclude-standard"],root)).trim().split("\n").filter(p=>/^(packages\/css|apps|scripts)\/|^(bun.lock|package.json)$/.test(p) && /\.(ts|tsx|js|mjs|json)$|bun.lock$/.test(p))
    const sourceDigest=digest((await Promise.all(names.sort().map(async p=>`${p} ${digest(await readFile(join(root,p)))}`))).join("\n"))
    await run("build",["bun","run","build"],root)
    const packed=JSON.parse(await run("pack",["npm","pack","--ignore-scripts","--json","--pack-destination",out],join(root,"packages/css")))
    const tarball=join(out,packed[0].filename), tarSha256=digest(await readFile(tarball))
    const consumer=await stage(`file:${tarball}`,out,{sdk:58})
    // stage intentionally omits workspace app.config; pin the requested worker directly.
    const configPath=join(consumer,"app.json"), config=JSON.parse(await readFile(configPath,"utf8"))
    config.expo.experiments={...config.expo.experiments,noxcturnalTransformWorker:worker==="rust"}
    await writeFile(configPath,JSON.stringify(config,null,2))
    const env={...process.env,CI:"1",EXPO_NO_METRO_WORKSPACE_ROOT:"1",CRUMBS_METRO_WORKER:worker}
    await run("install",["npm","install","--ignore-scripts","--no-audit","--no-fund"],consumer,env)
    const version=JSON.parse(await readFile(join(root,"packages/css/package.json"),"utf8")).version
    await identity(consumer,"packed",version)
    await run("types",[join(consumer,"node_modules/.bin/tsc"),"--noEmit"],consumer,env)
    const rows:WidgetMapRow[]=[]
    const maps:Array<{platform:string;dev:boolean;sha256:string;bundleSha256:string}>=[]
    for(const dev of [true,false]){
      const output=join(out,dev?"development":"production")
      await run(dev?"development-export":"production-export",[join(consumer,"node_modules/.bin/expo"),"export","--platform","all","--source-maps","--clear","--output-dir",output,...(dev?["--dev"]:[])],consumer,env)
      async function walk(dir:string):Promise<string[]>{const result:string[]=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())result.push(...await walk(path));else if(path.endsWith(".map"))result.push(path)}return result}
      for(const path of await walk(output)){
        const platform=["ios","android","web"].find(p=>path.includes(`/js/${p}/`));if(!platform)continue
        const bytes=await readFile(path),map=JSON.parse(bytes.toString()),bundle=await readFile(path.slice(0,-4))
        const sources=widgetMapSources(map)
        rows.push({platform,dev,sources,metadata:bundle.includes(Buffer.from("__crumbsDev"))})
        maps.push({platform,dev,sha256:digest(bytes),bundleSha256:digest(bundle)})
      }
    }
    validateWidgetMapSet(rows)
    const receipt={type:"crumbs.m9.3a.packed-qualification",version:1,status:"passed",sourceHead:head,sourceDigest,tarSha256,packageVersion:version,sdk:58,workerConfiguration:worker,node:process.version,bun:Bun.version,commands,maps,limits:{nativeUI:"not-run-by-this-script",workerRouting:"Expo configuration; no per-file routing claim"}}
    await writeFile(join(out,"qualification.json"),JSON.stringify(receipt,null,2)+"\n")
    console.log(JSON.stringify({status:"passed",receipt:join(out,"qualification.json"),consumer}))
  } catch(error) {
    await writeFile(join(out,"failure.json"),JSON.stringify({status:"failed",commands,error:String(error).replaceAll(root,"<repo>").replaceAll(out,"<owned-output>")},null,2))
    throw error
  }
}
if(import.meta.main) await main()
