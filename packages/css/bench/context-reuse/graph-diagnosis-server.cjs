"use strict";
// Private stock SDK-peer Metro owner; no WorkerFarm or shipping changes.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const f=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const workspace=createRequire(path.join(f.repo,'apps/storybook/package.json'));
const expo=createRequire(fs.realpathSync(workspace.resolve('expo/package.json')));
const sdk=createRequire(expo.resolve('@expo/cli/package.json'));
(async()=>{
 const config=await sdk('@expo/metro/metro-config').loadConfig({cwd:f.integration.app,config:path.join(f.integration.app,'metro.config.js')});
 config.server.port=Number(process.argv[3]);config.maxWorkers=1;config.cacheStores=[];config.resetCache=true;config.reporter={update(){}};
 let closed;const ended=new Promise(resolve=>closed=resolve);
 const owner=await sdk('@expo/metro/metro').runServer(config,{host:'::1',onClose:()=>closed()});
 const server=owner.httpServer||owner;
 process.stdout.write('READY\n');
 process.once('SIGINT',async()=>{
  try {await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));await ended;
   const t=require(f.artifact.transformerPath);await t.__crumbsQualificationClose();
   fs.writeFileSync(process.argv[4],JSON.stringify({pid:process.pid,node:process.version,closed:t.__crumbsQualificationSnapshot()}));
  }catch(e){console.error(e.stack);process.exitCode=1;}
 });
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
