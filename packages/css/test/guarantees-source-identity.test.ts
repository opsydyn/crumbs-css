import { test, expect } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { captureGuaranteesSourceIdentity } from '../../../scripts/guarantees-matrix/source-identity'

test('source content identity survives docs and commit changes but rejects code drift and newly authored scripts', () => {
 const root=mkdtempSync(join(tmpdir(),'crumbs-source-identity-'))
 try {
  execFileSync('git',['init','--quiet'],{cwd:root});mkdirSync(join(root,'scripts'));mkdirSync(join(root,'docs'))
  writeFileSync(join(root,'scripts/check.ts'),'export const version=1\n');writeFileSync(join(root,'docs/note.md'),'first\n')
  execFileSync('git',['add','.'],{cwd:root})
  const initial=captureGuaranteesSourceIdentity(root)
  writeFileSync(join(root,'docs/note.md'),'second\n');expect(captureGuaranteesSourceIdentity(root).sha256).toBe(initial.sha256)
  execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture'],{cwd:root})
  expect(captureGuaranteesSourceIdentity(root).sha256).toBe(initial.sha256)
  writeFileSync(join(root,'scripts/check.ts'),'export const version=2\n');expect(captureGuaranteesSourceIdentity(root).sha256).not.toBe(initial.sha256)
  writeFileSync(join(root,'scripts/check.ts'),'export const version=1\n');writeFileSync(join(root,'scripts/new.ts'),'export const added=true\n')
  expect(captureGuaranteesSourceIdentity(root).sha256).not.toBe(initial.sha256)
 } finally {rmSync(root,{recursive:true,force:true})}
})
