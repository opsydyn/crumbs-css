import http from 'node:http';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const root=new URL('.',import.meta.url).pathname;const study=JSON.parse(fs.readFileSync(root+'study.json'));const artifacts=JSON.parse(fs.readFileSync(root+'artifacts.json'));const variants=['plain','core','compatibility'];const events=[];let active=null;const receipts=[];
const call=(...args)=>{const start=Date.now();try{const out=execFileSync('xcrun',['simctl',...args],{encoding:'utf8',timeout:30000});events.push({args,startedAt:new Date(start).toISOString(),exit:0,output:out});fs.writeFileSync(root+'commands.json',JSON.stringify(events,null,2));return out;}catch(e){events.push({args,startedAt:new Date(start).toISOString(),exit:e.status,error:String(e)});fs.writeFileSync(root+'commands.json',JSON.stringify(events,null,2));throw e;}};
const server=http.createServer((req,res)=>{let body='';req.on('data',x=>body+=x);req.on('end',()=>{try{const receipt=JSON.parse(body);if(req.url!='/receipt'||!active||receipt.study!==study.id||receipt.variant!==active.variant)throw Error('Unexpected receipt');if(receipt.dev!==false||receipt.hermes!==true||receipt.platform!=='ios')throw Error('Wrong runtime');const row={...receipt,round:active.round,warmup:active.round===-1,receivedAt:new Date().toISOString()};receipts.push(row);fs.writeFileSync(root+'receipts.json',JSON.stringify(receipts,null,2));res.end('ok');active.resolve(row);active=null;}catch(e){res.statusCode=400;res.end(String(e));}});});
await new Promise(resolve=>server.listen(18765,'127.0.0.1',resolve));
try{
 for(const v of variants)call('install',study.device,root+v+'/CrumbsDiagnostic.app');
 for(let round=-1;round<5;round++)for(let j=0;j<3;j++){
  const variant=variants[(j+(round+1)%3)%3];let timer;const wait=new Promise((resolve,reject)=>{active={variant,round,resolve};timer=setTimeout(()=>reject(Error('Receipt timeout '+variant+' '+round)),45000);});
  call('launch','--terminate-running-process',study.device,artifacts.variants[variant].appId);const row=await wait;clearTimeout(timer);
  call('terminate',study.device,artifacts.variants[variant].appId);
  console.log(JSON.stringify({variant,round,entryMs:row.layout?.entryToLayoutMs,importMs:row.moduleImportMs,samples:row.samples.length,counts:row.counts}));
 }
}finally{for(const v of variants){try{call('uninstall',study.device,artifacts.variants[v].appId);}catch{}}server.close();}
