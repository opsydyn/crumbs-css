import {readFile,writeFile} from 'node:fs/promises';
import {auditPackedRuntimeEntrypoints} from '../../../scripts/packed-runtime-graph';
import {resolve} from 'node:path';
const root=process.cwd(), packageRoot=resolve(root,'packages/css'), manifest=JSON.parse(await readFile(resolve(packageRoot,'package.json'),'utf8'));
const graph=await auditPackedRuntimeEntrypoints(packageRoot);
const values:Record<string,string[]>={};for(const [key,e] of Object.entries(manifest.exports)){if(key==='./package.json')continue; const entry=(e as any).import; values[key]=Object.keys(await import(resolve(packageRoot,entry))).sort()}
await writeFile(resolve(import.meta.dir,'control-inventory.json'),JSON.stringify({graphs:graph,values,exports:manifest.exports},null,2)+'\n');console.log('Control: '+graph.length+' graphs and '+Object.keys(values).length+' value surfaces captured.');
