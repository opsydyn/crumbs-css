import {readFileSync,existsSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
const pre=JSON.parse(readFileSync('.superpowers/sdd/2026-10-09-m11-3-native-motion/preflight.json','utf8'));
const own=JSON.parse(readFileSync('.superpowers/tools/m11-3-native/ownership.json','utf8'));
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
function check(ok:unknown,msg:string):asserts ok{if(!ok)throw Error(msg)}
check(sha('bun.lock')===pre.lockSha256&&pre.frozenInstall.lockAfter===pre.lockSha256,'Original lock drift');
check(sha(pre.controlArtifact.path)===pre.controlArtifact.sha256,'Control artifact drift');
check(pre.frozenInstall.passed&&pre.originalDependencies.length===5,'Missing frozen/rollback records');
check(Bun.spawnSync([pre.nodeFloor,'--version']).stdout.toString().trim()==='v22.0.0','Genuine Node floor');
check(Bun.spawnSync(['node','--version']).stdout.toString().trim()==='v24.15.0','Current Node');
check(own.devices.ios.id!==own.protectedSimulator&&own.studyId==='crumbs-m113','Foreign native ownership');
for(const value of Object.values(own.tools))if(typeof value==='string'&&value.startsWith('/'))check(existsSync(value),'Missing tool '+value);
check(sha(own.assets.androidApk)===own.assets.androidApkSha256,'Android asset drift');
for(const record of pre.originalDependencies)check(realpathSync(record.path).startsWith(realpathSync(pre.installRoot)),'Unowned dependency attachment '+record.path);
console.log('M11.3 preflight PASS: frozen lock, genuine host matrix, control, owned tools/assets/devices and five restoration records');
