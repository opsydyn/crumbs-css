import {createHash} from 'node:crypto'
import {readFileSync,readdirSync,lstatSync} from 'node:fs'
import {resolve,join,relative} from 'node:path'
import {pathToFileURL} from 'node:url'
import {execFileSync} from 'node:child_process'
import {isDeepStrictEqual} from 'node:util'

// Read-only replay of the existing release verifiers. No build, seal or exception.
const [repositoryArg,packetArg,sourceRepositoryArg]=process.argv.slice(2)
if(!repositoryArg||!packetArg)throw Error('Expected absolute repository and packet directories')
const repository=resolve(repositoryArg),packet=resolve(packetArg)
const sourceRepository=resolve(sourceRepositoryArg??repositoryArg)
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'))
const hash=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
const final=join(repository,'docs/evidence/2026-10-17-m1-10c-expo58-release/final-release')
const candidate=read(join(final,'candidate.json'))
const tarball=readFileSync(join(packet,'artifact/opsydyn-crumbs-css-1.2.0.tgz'))
if(hash(tarball)!==candidate.tarballSha256)throw Error('Tarball SHA-256 drift')
const integrity='sha512-'+createHash('sha512').update(tarball).digest('base64')
if(integrity!==candidate.tarballIntegrity)throw Error('Tarball integrity drift')
const revision=execFileSync('git',['rev-parse','v1.2.0^{commit}'],{cwd:repository,encoding:'utf8'}).trim()
if(revision!==candidate.sourceRevision)throw Error('Local tag drift')
const files:Array<{path:string;sha256:string}>=[]
const report=join(final,'host-report')
function visit(directory:string){
 for(const name of readdirSync(directory)){
  const file=join(directory,name),stat=lstatSync(file)
  if(stat.isSymbolicLink())throw Error('Unexpected report symlink')
  if(stat.isDirectory())visit(file)
  else if(stat.isFile())files.push({path:relative(report,file).replaceAll('\\','/'),sha256:hash(readFileSync(file))})
  else throw Error('Unexpected report entry')
 }
}
visit(report);files.sort((a,b)=>a.path.localeCompare(b.path))
if(!isDeepStrictEqual(files,candidate.reportFiles)||hash(JSON.stringify(files))!==candidate.reportDigest)throw Error('Full host-report inventory drift')
const matrixPath=join(final,'sdk-matrix.json')
if(hash(readFileSync(matrixPath))!==candidate.sdkMatrixSha256)throw Error('SDK matrix pin drift')
const {checkSdkReleaseMatrix}=await import(pathToFileURL(join(repository,'scripts/release-sdk-matrix.ts')).href)
checkSdkReleaseMatrix(final,{tarballSha256:candidate.tarballSha256,tarballIntegrity:integrity,sourceRevision:revision,packageVersion:candidate.packageVersion},false)
const {verifyReleaseHostBudgetReport}=await import(pathToFileURL(join(repository,'scripts/release-host-budget-report.ts')).href)
const result=verifyReleaseHostBudgetReport({reportDirectory:report,repositoryRoot:sourceRepository,expectedRevision:revision})
if(!isDeepStrictEqual(result,read(join(final,'host-verification.json'))))throw Error('Host-verification replay differs')
if(result.releasePolicyQualified!==false||!isDeepStrictEqual(result.blocking.failIds,['cold-transform-ms','warm-transform-ms','incremental-rebuild'])||result.blocking.incompleteIds.length)throw Error('Unexpected host disposition')
if(result.blockers.length!==3||result.sourceDigest!==candidate.sourceDigest)throw Error('Unexpected identity or non-numerical blocker')
console.log(JSON.stringify({status:'verified-exact-bindings-not-release-qualified',releaseTag:candidate.releaseTag,sourceRevision:revision,tarballSha256:candidate.tarballSha256,reportDigest:candidate.reportDigest,sdkMatrixSha256:candidate.sdkMatrixSha256,reportFiles:files.length,sdkCohorts:[56,57,58],hostVerification:result},null,2))
