import {writeFile} from 'node:fs/promises';
const command=['.superpowers/tools/m11-3-native/sdk/platform-tools/adb','-s','emulator-5570','exec-out','screencap'];
const at=Date.now(),p=Bun.spawn(command,{stdout:'pipe',stderr:'pipe'}),reader=p.stdout.getReader(),chunks:Buffer[]=[];let count=0,headerAt:number|undefined;
while(true){const next=await reader.read();if(next.done)break;const bytes=Buffer.from(next.value);chunks.push(bytes);count+=bytes.length;if(count>=16&&headerAt===undefined)headerAt=Date.now()}
const code=await p.exited,done=Date.now(),bytes=Buffer.concat(chunks),result={command,exitCode:code,startedAt:at,headerAt,completedAt:done,headerReadyMs:headerAt!-at,totalMs:done-at,bytes:bytes.length,header:[0,4,8,12].map(x=>bytes.readUInt32LE(x))};
await writeFile('.superpowers/sdd/2026-10-09-m11-3-native-motion/raw-header-probe.json',JSON.stringify(result,null,2)+'\n');console.log(result);
