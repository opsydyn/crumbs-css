const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.argv[2],out=process.argv[3];
const req=require('node:module').createRequire(path.join(root,'package.json'));
const integration=req('@vanilla-extract/integration');
const integrationRequire=require('node:module').createRequire(req.resolve('@vanilla-extract/integration'));
const babelRequire=require('node:module').createRequire(integrationRequire.resolve('@babel/core'));
const parser=babelRequire('@babel/parser');
(async()=>{
 const rows=[];
 for(const [label,file,cwd] of [['README',path.join(root,'examples/recipe.css.ts'),root],['consumer',path.join(root,'fixtures/consumer/styles/button.css.ts'),path.join(root,'fixtures/consumer')]]){
  let metafile;
  const result=await integration.compile({filePath:file,cwd,identOption:'debug',esbuildOptions:{plugins:[{name:'inspect-only',setup(build){build.onEnd(r=>{metafile=r.metafile;});}}]}});
  const inputs=[];
  for(const [name,info] of Object.entries(metafile.inputs)){
   const file=path.resolve(cwd,name),bytes=fs.readFileSync(file),issues=[];
   if(!file.endsWith('.json')){
    try{
     const ast=parser.parse(bytes.toString('utf8'),{sourceType:'unambiguous',plugins:['typescript','jsx'],createImportExpressions:true});
     const visit=value=>{
      if(!value||typeof value!=='object')return;
      if(value.type==='ImportExpression')issues.push({kind:'dynamic-import',line:value.loc.start.line});
      if(value.type==='CallExpression'&&value.callee?.type==='Identifier'&&value.callee.name==='require'&&(value.arguments.length!==1||value.arguments[0].type!=='StringLiteral'))issues.push({kind:'computed-require',line:value.loc.start.line});
      for(const [key,child] of Object.entries(value))if(!['loc','start','end','tokens','comments'].includes(key)){if(Array.isArray(child))child.forEach(visit);else visit(child);}
     };visit(ast);
    }catch(error){issues.push({kind:'parser-rejection',message:error.message});}
   }
   inputs.push({name,file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),imports:info.imports,issues});
  }
  rows.push({label,file,cwd,inputs,totalBytes:inputs.reduce((sum,i)=>sum+i.bytes,0),sourceSha256:crypto.createHash('sha256').update(result.source).digest('hex')});
 }
 fs.writeFileSync(out,JSON.stringify({protocol:'read-only eligibility diagnostic; no proof or cache admission',parser:babelRequire.resolve('@babel/parser'),rows},null,2)+'\n');
 console.log(JSON.stringify(rows.map(r=>({label:r.label,inputCount:r.inputs.length,bytes:r.totalBytes,issues:r.inputs.filter(i=>i.issues.length).map(i=>({name:i.name,issues:i.issues}))})),null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
