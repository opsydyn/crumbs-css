import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureResolutionIdentity, hasChangedResolutionIdentity } from "../src/compiler/resolution-identity";
import { createNativeStylesCacheStore, createNativeTransformResultKey } from "../src/transform-cache";
function fixture(run: (root: string, cwd: string, entry: string) => void | Promise<void>) {
 const root=mkdtempSync(join(tmpdir(),"crumbs-resolution-")),cwd=join(root,"app"),entry=join(cwd,"src/card.css.ts");
 mkdirSync(join(cwd,"src"),{recursive:true});writeFileSync(join(root,"package.json"),'{"workspaces":["app"]}');writeFileSync(join(cwd,"package.json"),'{"name":"app"}');writeFileSync(entry,"export const x=1;");
 return Promise.resolve().then(()=>run(root,cwd,entry)).finally(()=>rmSync(root,{recursive:true,force:true}));
}
const inputs=(original?:string)=>({"src/card.css.ts":{imports:original?[{path:"../tokens/token.ts",original,kind:"import-statement"}]:[]}});
describe("M10.5 compiler resolution identity",()=>{
 test("detects inherited JSONC config edits with unchanged entry and token bytes",()=>fixture((root,cwd,entry)=>{
  writeFileSync(join(cwd,"tsconfig.json"),'{/* extends */ "extends":"./base",}');writeFileSync(join(cwd,"base.json"),'{"compilerOptions":{"paths":{"token":["./a"]}}}');
  const r=captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry});expect(r.cacheable).toBe(true);expect(hasChangedResolutionIdentity(r)).toBe(false);
  writeFileSync(join(cwd,"base.json"),'{"compilerOptions":{"paths":{"token":["./b"]}}}');expect(hasChangedResolutionIdentity(r)).toBe(true);
 }));
 test("detects newly created nearest config and missing extends appearing",()=>fixture((root,cwd,entry)=>{
  const r=captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry});writeFileSync(join(cwd,"src/tsconfig.json"),"{}");expect(hasChangedResolutionIdentity(r)).toBe(true);
  writeFileSync(join(cwd,"src/tsconfig.json"),'{"extends":"./missing"}');expect(captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry}).cacheable).toBe(false);
 }));
 test("detects package exports edits and canonical link retargets even with equal file content",()=>fixture((root,cwd,entry)=>{
  const a=join(root,"a"),b=join(root,"b"),link=join(cwd,"node_modules/tokens");for(const p of[a,b]){mkdirSync(p);writeFileSync(join(p,"package.json"),'{"name":"tokens","exports":{".":"./token.ts"}}');writeFileSync(join(p,"token.ts"),"export const n=1");}mkdirSync(join(cwd,"node_modules"));symlinkSync(a,link);
  const r=captureResolutionIdentity(inputs("tokens"),{cwd,absoluteEntryPath:entry});expect(hasChangedResolutionIdentity(r)).toBe(false);unlinkSync(link);symlinkSync(b,link);expect(hasChangedResolutionIdentity(r)).toBe(true);
  const s=captureResolutionIdentity(inputs("tokens"),{cwd,absoluteEntryPath:entry});writeFileSync(join(b,"package.json"),'{"name":"tokens","exports":{".":"./other.ts"}}');expect(hasChangedResolutionIdentity(s)).toBe(true);
 }));
 test("tracks package based extends and installation files",()=>fixture((root,cwd,entry)=>{
  const pkg=join(cwd,"node_modules/config");mkdirSync(pkg,{recursive:true});writeFileSync(join(pkg,"package.json"),'{"name":"config"}');writeFileSync(join(pkg,"base.json"),'{}');writeFileSync(join(cwd,"tsconfig.json"),'{"extends":"config/base.json"}');writeFileSync(join(root,"bun.lock"),"first");
  const r=captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry});expect(r.cacheable).toBe(true);writeFileSync(join(root,"bun.lock"),"second");expect(hasChangedResolutionIdentity(r)).toBe(true);
 }));
 test("fails closed for cyclic or malformed config instead of accepting cached styles",()=>fixture((root,cwd,entry)=>{
  writeFileSync(join(cwd,"tsconfig.json"),'{"extends":"./tsconfig.json"}');expect(captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry}).cacheable).toBe(false);
  writeFileSync(join(cwd,"tsconfig.json"),'{"extends":');expect(captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry}).cacheable).toBe(false);
 }));
 test("cache-store and graph keys include resolution identity while legacy metadata remains valid",()=>fixture(async(root,cwd,entry)=>{
  writeFileSync(join(cwd,"tsconfig.json"),"{}");const resolutionIdentity=captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry});const value={__crumbsNativeStyles:{$$type:"crumbs.css.transform-cache",dependencies:[],resolutionIdentity}};
  const store=createNativeStylesCacheStore({get:async()=>value,set:async()=>{},clear:()=>{}});expect(await store.get(Buffer.from("key"))).toEqual(value);
  const key=createNativeTransformResultKey(value,"key");writeFileSync(join(cwd,"tsconfig.json"),'{"compilerOptions":{"strict":true}}');expect(await store.get(Buffer.from("key"))).toBeNull();
  const next={__crumbsNativeStyles:{...value.__crumbsNativeStyles,resolutionIdentity:captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry})}};expect(createNativeTransformResultKey(next,"key")).not.toBe(key);
  const legacy={__crumbsNativeStyles:{$$type:"crumbs.css.transform-cache",dependencies:[]}};expect(await createNativeStylesCacheStore({get:async()=>legacy,set:async()=>{},clear:()=>{}}).get(Buffer.from("key"))).toEqual(legacy);
 }));
});

test("M10.5 malformed resolution cache metadata is a miss, never a cache crash", async()=>{
 for(const resolutionIdentity of [{}, {cacheable:true,files:"bad",links:[]}, {cacheable:true,files:[{sourcePath:3}],links:[]}]){
  const value={__crumbsNativeStyles:{$$type:"crumbs.css.transform-cache",dependencies:[],resolutionIdentity}};
  const store=createNativeStylesCacheStore({get:async()=>value,set:async()=>{},clear:()=>{}});
  expect(await store.get(Buffer.from("key"))).toBeNull();
 }
});
test("M10.5 JSONC extends arrays preserve quoted comment/comma text and commented trailing commas",()=>fixture((root,cwd,entry)=>{
 writeFileSync(join(cwd,"tsconfig.json"),'{"extends":["./base.json", /* trailing */],"compilerOptions":{"baseUrl":"http://a,b", /* comment */}}');writeFileSync(join(cwd,"base.json"),'{}');
 expect(captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry}).cacheable).toBe(true);
}));

test("M10.5 emitted identity distinguishes unchanged styles from entry/config resolution edits", async()=>{
 const { createDependencyCacheIdentity } = await import("../src/compiler/dependency-analysis");
 const ctx={compilerKey:"same",platform:"ios",dev:false,strictDiagnostics:true,useStyleSheet:true,identOption:"debug"};
 expect(createDependencyCacheIdentity([],ctx,"entry-and-config-a")).not.toBe(createDependencyCacheIdentity([],ctx,"entry-and-config-b"));
});

test("M10.5 cached package scope requires restart only when name or nearest named manifest changes",()=>fixture(async(root,cwd,entry)=>{
 const {assertPackageScopeIdentity}=await import('../src/compiler/resolution-identity');
 const cached={name:'app',path:join(cwd,'package.json')};
 expect(()=>assertPackageScopeIdentity(cwd,cached)).not.toThrow();
 writeFileSync(cached.path,'{"name":"renamed"}');
 expect(()=>assertPackageScopeIdentity(cwd,cached)).toThrow('Restart Metro');
 writeFileSync(cached.path,'{"name":"app","exports":{".":"./new.js"}}');
 expect(()=>assertPackageScopeIdentity(cwd,cached)).not.toThrow();
 writeFileSync(cached.path,'{}');
 expect(()=>assertPackageScopeIdentity(cwd,cached)).toThrow('Restart Metro');
}));

test("M10.5 imported workspace config and package config links participate in invalidation",()=>fixture((root,cwd,entry)=>{
 const workspace=join(root,'tokens');mkdirSync(workspace);writeFileSync(join(workspace,'token.ts'),'export const token=1');writeFileSync(join(workspace,'tsconfig.json'),'{"compilerOptions":{"paths":{"dep":["./a"]}}}');
 const imported={...inputs(), '../tokens/token.ts':{imports:[]}};
 const receipt=captureResolutionIdentity(imported,{cwd,absoluteEntryPath:entry});
 writeFileSync(join(workspace,'tsconfig.json'),'{"compilerOptions":{"paths":{"dep":["./b"]}}}');
 expect(hasChangedResolutionIdentity(receipt)).toBe(true);
 const a=join(root,'config-a'),b=join(root,'config-b');for(const dir of[a,b]){mkdirSync(dir);writeFileSync(join(dir,'package.json'),'{"name":"config"}');writeFileSync(join(dir,'base.json'),'{}');}
 mkdirSync(join(cwd,'node_modules'));const link=join(cwd,'node_modules/config');symlinkSync(a,link);writeFileSync(join(cwd,'tsconfig.json'),'{"extends":"config/base.json"}');
 const configReceipt=captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry});unlinkSync(link);symlinkSync(b,link);
 expect(hasChangedResolutionIdentity(configReceipt)).toBe(true);
}));
test("M10.5 entry bytes are checked when a restored source hits a prior Metro transform key",()=>fixture((root,cwd,entry)=>{
 const receipt=captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry});writeFileSync(entry,'export const restored=2');expect(hasChangedResolutionIdentity(receipt)).toBe(true);
}));

test("M10.5 relative imports retain their logical symlink identity",()=>fixture((root,cwd,entry)=>{
 const lib=join(root,'lib');mkdirSync(lib);for(const name of['a.ts','b.ts'])writeFileSync(join(lib,name),'export const n=1');const logical=join(cwd,'src/token.ts');symlinkSync(join(lib,'a.ts'),logical);
 const imported={'src/card.css.ts':{imports:[{original:'./token',path:'../lib/a.ts'}]},'../lib/a.ts':{imports:[]}};
 const receipt=captureResolutionIdentity(imported,{cwd,absoluteEntryPath:entry});unlinkSync(logical);symlinkSync(join(lib,'b.ts'),logical);expect(hasChangedResolutionIdentity(receipt)).toBe(true);
}));

test("M10.5 paths aliases observe retargeted logical symlinks with unchanged config",()=>fixture((root,cwd,entry)=>{
 const lib=join(root,'lib');mkdirSync(lib);for(const name of['a.ts','b.ts'])writeFileSync(join(lib,name),'export const n=1');const logical=join(cwd,'token.ts');symlinkSync(join(lib,'a.ts'),logical);writeFileSync(join(cwd,'tsconfig.json'),'{"compilerOptions":{"paths":{"qual-token":["./token"]}}}');
 const imported={'src/card.css.ts':{imports:[{original:'qual-token',path:'../lib/a.ts'}]},'../lib/a.ts':{imports:[]}};
 const receipt=captureResolutionIdentity(imported,{cwd,absoluteEntryPath:entry});unlinkSync(logical);symlinkSync(join(lib,'b.ts'),logical);expect(hasChangedResolutionIdentity(receipt)).toBe(true);
}));

test("M10.5 package config edits after link retarget use the current target without Node resolution cache",()=>fixture((root,cwd,entry)=>{
 const a=join(root,'a'),b=join(root,'b');for(const dir of[a,b]){mkdirSync(dir);writeFileSync(join(dir,'base.json'),'{}');}mkdirSync(join(cwd,'node_modules'));const link=join(cwd,'node_modules/config');symlinkSync(a,link);writeFileSync(join(cwd,'tsconfig.json'),'{"extends":"config/base.json"}');
 captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry});unlinkSync(link);symlinkSync(b,link);
 const receipt=captureResolutionIdentity(inputs(),{cwd,absoluteEntryPath:entry});writeFileSync(join(b,'base.json'),'{"compilerOptions":{"strict":true}}');expect(hasChangedResolutionIdentity(receipt)).toBe(true);
}));
