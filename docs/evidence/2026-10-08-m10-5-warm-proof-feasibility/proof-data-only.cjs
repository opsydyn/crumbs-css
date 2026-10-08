// THROWAWAY lower-bound probe: mandatory witness work, deliberately not a complete resolver proof.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.argv[2],out=process.argv[3];
const req=require('node:module').createRequire(path.join(root,'package.json'));
const integration=req('@vanilla-extract/integration'),original=integration.compile,cache=new Map();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const ancestors=dir=>{const rows=[];for(;;){rows.push(dir);const next=path.dirname(dir);if(next===dir)return rows;dir=next;}};
const tools=new Set();
const addTree=dir=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())addTree(file);else if(item.isFile()&&!file.endsWith('.map')&&!file.endsWith('.md')&&!file.endsWith('.ts'))tools.add(file);}};
const integrationReq=require('node:module').createRequire(req.resolve('@vanilla-extract/integration'));
for(const name of ['@vanilla-extract/integration','@vanilla-extract/babel-plugin-debug-ids','esbuild']){const manifest=integrationReq.resolve(name+'/package.json');tools.add(manifest);addTree(path.join(path.dirname(manifest),name==='esbuild'?'lib':'dist'));}
const babelReq=require('node:module').createRequire(integrationReq.resolve('@babel/core'));
for(const name of ['@babel/core','@babel/parser']){const manifest=babelReq.resolve(name+'/package.json');tools.add(manifest);addTree(path.join(path.dirname(manifest),'lib'));}
let validations=0;const spans=[];
function inventory(cwd,metafile){
 const files=new Set(),dirs=new Set();
 for(const name of Object.keys(metafile.inputs)){const file=path.resolve(cwd,name);files.add(file);for(const logical of [file,fs.realpathSync(file)])for(const dir of ancestors(path.dirname(logical)))dirs.add(dir);}
 for(const dir of ancestors(cwd))dirs.add(dir);
 for(const dir of dirs)for(const name of ['package.json','tsconfig.json','jsconfig.json','bun.lock','bun.lockb','package-lock.json','yarn.lock','pnpm-lock.yaml'])files.add(path.join(dir,name));
 return {files:[...files].sort(),dirs:[...dirs].sort()};
}
function snapshot(witness){
 validations++;const started=performance.now();let bytes=0;
 const files=witness.files.map(file=>{try{const data=fs.readFileSync(file);bytes+=data.length;return[file,fs.realpathSync(file),sha(data)];}catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')return[file,null,null];throw error;}});
 const filesFinished=performance.now();const dirs=witness.dirs.map(dir=>[dir,fs.realpathSync(dir),sha(JSON.stringify(fs.readdirSync(dir,{withFileTypes:true}).map(item=>{const file=path.join(dir,item.name);return[item.name,item.isDirectory()?'directory':item.isSymbolicLink()?'link':item.isFile()?'file':'other',item.isSymbolicLink()?fs.readlinkSync(file):null];}).sort((a,b)=>a[0].localeCompare(b[0]))))]);
 const dirsFinished=performance.now();const result=sha(JSON.stringify({files,dirs}));spans.push({ms:performance.now()-started,filesMs:filesFinished-started,dirsMs:dirsFinished-filesFinished,bytes,files:files.length,dirs:dirs.length});return result;
}
integration.compile=async options=>{
 const key=JSON.stringify([options.filePath,options.cwd,options.identOption]),prior=cache.get(key);
 if(prior){const before=snapshot(prior.witness);for(const plugin of options.esbuildOptions?.plugins??[])plugin.setup({onEnd:callback=>callback(prior.metafile)});const after=snapshot(prior.witness);if(before!==after)throw Error('Probe witness changed');return prior.result;}
 let metafile;const recorder={name:'probe-floor',setup(build){build.onEnd(result=>{metafile=result.metafile;});}};
 const result=await original({...options,esbuildOptions:{...options.esbuildOptions,plugins:[...(options.esbuildOptions?.plugins??[]),recorder]}});
 cache.set(key,{result,metafile:{metafile},witness:inventory(options.cwd,metafile)});return result;
};
const transformer=req(path.join(root,'dist/transformer.cjs'));
(async()=>{process.chdir(root);const rows=[];
 for(const[label,file,cwd]of[['README',path.join(root,'examples/recipe.css.ts'),root],['consumer',path.join(root,'fixtures/consumer/styles/button.css.ts'),path.join(root,'fixtures/consumer')]]){
 const run=()=>transformer.transformCssTsToStyleSheet(file,cwd,{strictDiagnostics:true});await run();await run();const samples=[];
 for(let i=0;i<6;i++){const start=performance.now(),code=await run();samples.push({ms:performance.now()-start,sha256:sha(code)});}
 const ordered=samples.map(r=>r.ms).sort((a,b)=>a-b);rows.push({label,medianMs:(ordered[2]+ordered[3])/2,samples});
 }console.log(JSON.stringify({protocol:'diagnostic data-only witness variant; compiler-file identity is NOT revalidated; omits complete negative resolution/config grammar/env/parser/Metro/consume fencing',rows,validations,spans}));
})().catch(error=>{console.error(error);process.exitCode=1;});
