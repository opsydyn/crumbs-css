import {readFileSync,readlinkSync,unlinkSync,symlinkSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const scratch='.superpowers/sdd/2026-10-09-m11-4-token-algebra';
const overlay=JSON.parse(readFileSync(scratch+'/budget-overlay.json','utf8'));
const before=readlinkSync('apps/playground/node_modules');
const checks=overlay.baselineFiles.map((f:any)=>{const actual=createHash('sha256').update(readFileSync(f.path)).digest('hex');if(actual!==f.sha256)throw Error('Budget baseline drift '+f.name);return {...f,actual}});
let exitCode:number|undefined;
try {unlinkSync('apps/playground/node_modules');symlinkSync(overlay.root,'apps/playground/node_modules');
 const proc=Bun.spawn(['bun','scripts/measure-current-host-budgets.ts','docs/evidence/2026-10-09-m11-4-token-algebra/host-budgets'],{stdout:'inherit',stderr:'inherit',env:{...process.env,CRUMBS_AUDIT_NODE_FLOOR:'/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node',CRUMBS_METRO_PORT:'8876'}});exitCode=await proc.exited;
} finally {if(readlinkSync('apps/playground/node_modules')!==overlay.root)throw Error('Budget temporary link drift');unlinkSync('apps/playground/node_modules');symlinkSync(before,'apps/playground/node_modules');
 const after=readlinkSync('apps/playground/node_modules');if(before!==after)throw Error('Budget app link restoration failed');
 for(const f of checks)if(createHash('sha256').update(readFileSync(f.path)).digest('hex')!==f.sha256)throw Error('Budget baseline changed');
 writeFileSync('docs/evidence/2026-10-09-m11-4-token-algebra/budget-environment.json',JSON.stringify({selectedInputs:checks,before,temporary:overlay.root,after,restored:before===after,exitCode,primaryReadOnly:true},null,2)+'\n');}
if(exitCode!==0)throw Error('Host collector exited '+exitCode);
