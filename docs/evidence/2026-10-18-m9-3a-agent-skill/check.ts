import {readFile, writeFile, mkdir, cp, rm, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const repo=process.argv[2], root=process.argv[3], out=process.argv[4];
assert(repo && root && out);
const folder=join(root,'src/m93a-skill-check');
await mkdir(folder);
await mkdir(out,{recursive:true});
await cp(join(repo,'.agents/skills/crumbs-css'),join(out,'copied-skill'),{recursive:true});
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const examples:Record<string,string>={};
for(const [ref,names] of [
 ['design-system.md',['foundation.ts','card.css.ts','ActionCard.tsx','App.tsx']],
 ['native-inspector.md',['inspector.tsx','inspector.dev.tsx','App.tsx']],
] as const){
 const text=await readFile(join(out,'copied-skill/references',ref),'utf8');
 const blocks=[...text.matchAll(/```tsx?\n([\s\S]*?)```/g)].map(m=>m[1]!);
 assert.equal(blocks.length,names.length);
 for(let i=0;i<names.length;i++){examples[names[i]!]=hash(blocks[i]!);await writeFile(join(folder,names[i]!),blocks[i]!);}
}
const originalAction=await readFile(join(folder,'ActionCard.tsx'),'utf8');
await writeFile(join(folder,'ActionCard.tsx'),"import {CardProbe} from './inspector';\n"+originalAction.replace('return <Pressable','return <><CardProbe tone={tone} /><Pressable').replace('</Pressable>;','</Pressable></>;'));
await writeFile(join(folder,'negative.tsx'),`import {CardProbe} from './inspector';
// @ts-expect-error unsupported recipe selection
const bad = <CardProbe tone="danger" />;
import type {CrumbsDevtoolsWidgetProps} from '@opsydyn/crumbs-css/devtools/native';
// @ts-expect-error clipboard completion must be asynchronous
const badCopy: CrumbsDevtoolsWidgetProps = {copyText: (_:string) => {}};
`);
async function run(label:string,args:string[]){const p=Bun.spawn(args,{cwd:root,env:{...process.env,CI:'1',EXPO_NO_TELEMETRY:'1'},stdout:'pipe',stderr:'pipe'});const [a,b,status]=await Promise.all([new Response(p.stdout).text(),new Response(p.stderr).text(),p.exited]);await writeFile(join(out,label+'.log'),a+'\n'+b);assert.equal(status,0,label);console.log(label+': passed');}
const entry=join(root,'index.js'), original=await readFile(entry,'utf8');
try {
 const req=createRequire(join(root,'package.json'));
 assert.equal(JSON.parse(await readFile(join(root,'node_modules/@opsydyn/crumbs-css/package.json'),'utf8')).version,'1.3.0');
 await run('types',[join(root,'node_modules/.bin/tsc'),'--noEmit']);
 const {transformCssTsToStyleSheet}=req('@opsydyn/crumbs-css/dist/transformer');
 const {explainStyle}=req('@opsydyn/crumbs-css/devtools');
 const {theme}=await import(join(folder,'foundation.ts'));
 const evaluate=(code:string)=>{const value:Record<string,any>={};new Function('exports',code.replace(/^import .*;$/gm,'').replace(/export const (\w+) =/g,'exports.$1 ='))(value);return value;};
 const dev=await transformCssTsToStyleSheet(join(folder,'card.css.ts'),root,{useStyleSheet:false,dev:true});
 const compiled=evaluate(dev);assert(compiled.__crumbsDev);assert(compiled.__crumbsModule);
 const report=explainStyle({module:{...compiled},exportPath:['card'],current:{theme,selection:{tone:'secondary'}}});
 assert.equal(report.coverage.status,'partial');assert.equal(report.resolution.value.root.backgroundColor,'#eef3ff');assert.equal(report.resolution.value.label.color.resolvedValue,'#18202b');
 const prod=await transformCssTsToStyleSheet(join(folder,'card.css.ts'),root,{useStyleSheet:false,dev:false});
 const production=evaluate(prod);assert.equal(production.__crumbsDev,undefined);
 const missing=explainStyle({module:{...production},exportPath:['card'],current:{theme,selection:{tone:'secondary'}}});
 assert.equal(missing.coverage.status,'unavailable');
 await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 await writeFile(entry,"import {registerRootComponent} from 'expo';import {createElement} from 'react';import {App} from './src/m93a-skill-check/App';function Root(){return createElement(App,{onActionPress:()=>{}})}registerRootComponent(Root);\n");
 await run('production-exports',[join(root,'node_modules/.bin/expo'),'export','--platform','all','--source-maps','--output-dir',join(out,'exports')]);
 const {verifyRuntimeBundles}=await import(join(repo,'scripts/runtime-bundle-contract.ts'));
 const maps=await verifyRuntimeBundles(join(out,'exports'));
 for(const row of maps){const map=JSON.parse(await readFile(row.file,'utf8'));assert(((function sources(m:any):string[]{return [...(m.sources??[]),...(m.sections??[]).flatMap((s:any)=>sources(s.map))]})(map)).every((s:string)=>!s.includes('inspector.dev')&&!s.includes('expo-clipboard')&&!s.includes('devtools')));}
 await writeFile(join(out,'qualification.json'),JSON.stringify({package:'@opsydyn/crumbs-css',version:'1.3.0',tarballSha256:hash(await readFile('/private/tmp/crumbs-m93a-v130-registry.tgz')),examples,strictTypes:'passed',negativeTypeCases:2,developmentReportCoverage:report.coverage,productionReportCoverage:missing.coverage,productionPlatforms:maps.map(row=>({platform:['ios','android','web'].find(p=>row.file.includes('/'+p+'/')),crumbs:row.crumbs,crumbsSources:row.crumbsSources})),debugModuleClipboardDevtoolsAbsent:true,nativeInteraction:'not rerun for this reference-only slice'},null,2)+'\n');
 console.log('Published compiler, report and production graph checks passed');
} finally {await writeFile(entry,original);await rm(folder,{recursive:true,force:true});}
