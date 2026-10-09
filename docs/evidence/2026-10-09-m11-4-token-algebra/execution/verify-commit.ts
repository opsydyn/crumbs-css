import {readFile} from 'node:fs/promises';
import {m114SourceIdentity} from '../../../scripts/m11-4-qualification';
import {captureGuaranteesSourceIdentity} from '../../../scripts/guarantees-matrix/source-identity';
const root=process.cwd();
const proof=JSON.parse(await readFile(root+'/docs/evidence/2026-10-09-m11-4-token-algebra/final-integrity.json','utf8'));
const source=await m114SourceIdentity();
const collector=captureGuaranteesSourceIdentity(root);
if(source.digest!==proof.sourceDigest||collector.sha256!==proof.collectorSourceDigest)throw Error('Committed source identity drift');
console.log(JSON.stringify({functionalSource:source.digest,collectorSource:collector.sha256,unchanged:true}));
