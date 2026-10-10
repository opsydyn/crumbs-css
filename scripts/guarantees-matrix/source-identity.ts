import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { resolve } from 'node:path'

const authoredRoots = ['scripts', 'packages/css/src', 'packages/css/test', 'packages/css/bench', 'apps/storybook/src', 'apps/storybook/e2e']
const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
/** Content identity across a final commit, excluding documentation and unrelated untracked native/dependency trees. */
export function captureGuaranteesSourceIdentity(repositoryRoot: string) {
 const list=(args:string[])=>execFileSync('git',['ls-files','-z',...args],{cwd:repositoryRoot,encoding:'utf8'}).split('\0').filter(Boolean)
 const paths=[...new Set([...list(['--cached','--',':(top,exclude)docs/**']),...list(['--others','--exclude-standard','--',...authoredRoots])])].filter(path=>!path.startsWith('docs/')).sort()
 const files=paths.map(path=>{
  const absolute=resolve(repositoryRoot,path),stat=lstatSync(absolute)
  if(!stat.isFile()&&!stat.isSymbolicLink()) throw Error('Source identity requires a file: '+path)
  return {path,sha256:sha256(readFileSync(absolute)),executable:!!(stat.mode&0o111),...(stat.isSymbolicLink()?{link:readlinkSync(absolute)}:{})}
 })
 return {format:'crumbs.guarantees-source-identity' as const,version:1 as const,sha256:sha256(JSON.stringify(files)),files}
}
