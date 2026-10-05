import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,readdirSync,lstatSync,mkdtempSync,cpSync,rmSync} from 'node:fs'
import {join,relative,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {verifyCompletionEvidence} from '../../../scripts/m10-5-completion-evidence'
import {captureGuaranteesSourceIdentity} from '../../../scripts/guarantees-matrix/source-identity'
const root=import.meta.dir, repository=resolve(root,'../../..')
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
const read=(base:string,file:string)=>JSON.parse(readFileSync(join(base,file),'utf8'))
function files(base:string,at=base):string[]{return readdirSync(at).sort().flatMap(name=>{const path=join(at,name),stat=lstatSync(path);if(stat.isSymbolicLink()||(!stat.isFile()&&!stat.isDirectory()))throw Error('Non-regular evidence');return stat.isDirectory()?files(base,path):[relative(base,path)]})}
function assert(value:unknown,message:string):asserts value {if(!value)throw Error(message)}
function verify(base=root){
 const result=verifyCompletionEvidence(base)
 const before=read(base,'native/input-before.json'),after=read(base,'native/input-after.json')
 assert(JSON.stringify(before)===JSON.stringify(after),'Native collection changed')
 assert(before.source.sha256===result.sourceDigest,'Native source identity differs')
 assert(JSON.stringify(before.artifacts)===JSON.stringify(read(base,'native/runtime-artifacts.json').files),'Native original graph differs')
 const contexts=read(base,'native/context-qualification.json')
 assert(contexts.sourceDigest===result.sourceDigest&&contexts.ios.preferencesRestored&&contexts.android.preferencesRestored,'Native contexts not restored')
 const logs:[string,string[]][]=[]
 for(const platform of ['ios','android']) {
  logs.push([platform+'-storybook-ui.log',[
   'Input text M10.5 action... COMPLETED',
   'Tap on "M10.5 action"... COMPLETED',
   'Assert that ".*onActionPress.*" is visible... COMPLETED',
   'Input text Open stories... COMPLETED',
   'Assert that "Inspect tokens" is visible... COMPLETED',
   'Assert that "Unavailable action" is visible... COMPLETED',
   'Take screenshot native-restored-story... COMPLETED',
  ]])
  logs.push([platform+'-reference.log',['Assert that "Primary action selected." is visible... COMPLETED']])
  logs.push([platform+'-contexts.log',[
   'Assert that "Native preference: reduced" is visible... COMPLETED',
   'Tap on "Run motion preview"... COMPLETED',
   'Assert that "Native condition: more" is visible... COMPLETED',
   platform==='ios'?'Assert that ".*Current scale: 1.3[0-9].*" is visible... COMPLETED':'Assert that ".*Current scale: 1.30.*" is visible... COMPLETED',
  ]])
  logs.push([platform+'-restored.log',[
   'Assert that ".*Current scale: 1.00.*" is visible... COMPLETED',
   'Assert that "Native preference: full" is visible... COMPLETED',
   'Assert that "Native condition: normal" is visible... COMPLETED',
  ]])
  logs.push([platform+'-full-motion.log',[
   'Tap on "Run motion preview"... COMPLETED',
   'Assert that "Native condition direction: RTL" is visible... COMPLETED',
   'Assert that "Native condition direction: LTR" is visible... COMPLETED',
  ]])
 }
 for(const [path,steps] of logs){const log=readFileSync(join(base,'native/replay',path),'utf8');assert(!log.includes('... FAILED')&&steps.every(step=>log.includes(step)),'Native positive replay missing: '+path)}
 assert(readFileSync(join(base,'native/preferences/ios-before.txt'),'utf8')===readFileSync(join(base,'native/preferences/ios-after.txt'),'utf8'),'iOS preferences differ')
 for(const [file,value] of [['android-font-after.txt','1.0'],['android-motion-after.txt','1.0'],['android-contrast-after.txt','null']])assert(readFileSync(join(base,'native/preferences',file),'utf8').trim()===value,'Android preferences differ: '+file)
 for(const platform of ['ios','android'])for(const frame of ['action-event','light-story','disabled-story','restored-story'])assert(readFileSync(join(base,'native/ui',platform+'-native-'+frame+'.png')).length>1000,'Native UI frame missing')
 return {...result,nativeContextReplay:true,storybookLiteUiQualified:true,animatedFullUiQualified:false}
}
if(process.argv[2]==='freeze'){
 const entries=files(root).filter(path=>path!=='manifest.json').map(path=>({path,sha256:hash(readFileSync(join(root,path)))}))
 writeFileSync(join(root,'manifest.json'),JSON.stringify({format:'crumbs.m10-5-completion-evidence',version:1,sourceDigest:captureGuaranteesSourceIdentity(repository).sha256,files:entries},null,2)+'\n')
 console.log(JSON.stringify(verify()))
}else if(process.argv[2]==='tamper'){
 for(const control of [
  {path:'native/input-after.json',edit:(x:any)=>({...x,artifacts:[]})},
  {path:'native/context-qualification.json',edit:(x:any)=>({...x,ios:{...x.ios,preferencesRestored:false}})},
  {path:'native/runtime-artifacts.json',edit:(x:any)=>({...x,files:x.files.slice(1)})},
  {path:'native/visual-final/screenshot-diff.json',edit:(x:any)=>({...x,comparisons:[]})},
  {path:'host-budgets/input-identity.json',edit:(x:any)=>({...x,sourceBefore:{...x.sourceBefore,sha256:'0'.repeat(64)}})},
  {path:'native/replay/android-storybook-ui.log',edit:(x:any)=>String(x).replace('Assert that \".*onActionPress.*\" is visible... COMPLETED','removed action proof'),text:true},
 ]){
  const temporary=mkdtempSync(join(tmpdir(),'crumbs-m105-remediation-tamper-'));try{
   cpSync(root,temporary,{recursive:true});const path=join(temporary,control.path);writeFileSync(path,(control as any).text?control.edit(readFileSync(path,'utf8')):JSON.stringify(control.edit(read(temporary,control.path))))
   const manifest=read(temporary,'manifest.json');manifest.files.find((x:any)=>x.path===control.path).sha256=hash(readFileSync(path));writeFileSync(join(temporary,'manifest.json'),JSON.stringify(manifest))
   let rejected=false;try{verify(temporary)}catch{rejected=true}assert(rejected,'Tamper accepted: '+control.path);console.log('rejected '+control.path)
  }finally{rmSync(temporary,{recursive:true,force:true})}
 }
}else console.log(JSON.stringify(verify()))
