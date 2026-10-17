const fs=require('node:fs'),path=require('node:path');
exports.createBridge=function(rolldown,stats){
 return async function build(options){
  if(options.write!==false||options.bundle!==true||options.platform!=='node'||options.entryPoints.length!==1)throw Error('Spike supports only the current fixed compiler options');
  const onLoads=[],onEnds=[],inputs={},edges=new Map(),loaded=new Map();
  const cwd=options.absWorkingDir;
  for(const plugin of options.plugins??[])plugin.setup({initialOptions:options,onLoad(filter,callback){onLoads.push({filter,callback})},onEnd(callback){onEnds.push(callback)}});
  const key=id=>path.relative(cwd,id).split(path.sep).join('/');
  const record=(source,importer,resolved,kind)=>{
   if(!importer||importer.startsWith('\0'))return;
   const list=edges.get(importer)??[];
   list.push({path:resolved.external?resolved.id:key(resolved.id),kind,original:source,...(resolved.external?{external:true}:{})});
   edges.set(importer,list);
  };
  const bundle=await rolldown({input:options.entryPoints,cwd,platform:'node',plugins:[{
   name:'owned-crumbs-rolldown-spike',
   async resolveId(source,importer,extra){
    const external=(options.external??[]).some(id=>source===id||source.startsWith(id+'/'));
    if(external){const result={id:source,external:true};record(source,importer,result,extra.kind);return result}
    const resolved=await this.resolve(source,importer,{skipSelf:true,kind:extra.kind});
    if(resolved)record(source,importer,resolved,extra.kind);
    return resolved;
   },
   async load(id){
    if(id.startsWith('\0'))return null;
    for(const item of onLoads)if(item.filter.filter.test(id)){
     const result=await item.callback({path:id,namespace:'file'});
     if(result){loaded.set(id,result.contents);return {code:result.contents,...(result.loader?{moduleType:result.loader}:{})}}
    }
    return null;
   },
   moduleParsed(info){
    if(info.id.startsWith('\0'))return;
    inputs[key(info.id)]={bytes:Buffer.byteLength(loaded.get(info.id)??fs.readFileSync(info.id)),imports:[]};
   }
  }]});
  stats.created++;
  let generated;
  try{generated=await bundle.generate({format:'cjs',exports:'named',sourcemap:false})}
  finally{await bundle.close();stats.closed++}
  for(const [id,list] of edges)if(inputs[key(id)])inputs[key(id)].imports=list;
  const chunks=generated.output.filter(item=>item.type==='chunk');
  if(chunks.length!==1||generated.output.length!==1)throw Error('Spike requires one generated JS chunk');
  const result={outputFiles:[{text:chunks[0].code}],metafile:{inputs}};
  for(const callback of onEnds)await callback(result);
  stats.calls++;
  return result;
 };
};
