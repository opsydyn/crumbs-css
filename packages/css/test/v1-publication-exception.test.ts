import { describe, expect, it } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assertCleanV1Source, assertV1ReleaseContext, assertV1BudgetAdmission, assertV1ExceptionReceipt, approvedV1Exception } from "../../../scripts/v1-publication"

const warm = "Host-budget metric warm-transform-ms is fail; expected pass"
const wrappedWarm = `Host-budget report is not release-qualified: ${warm}`
const context = { releaseTag: "v1.0.0", sourceRevision: "382768a45f429f4c039e7584cd7c31e4f8821fc0", packageName: "@opsydyn/crumbs-css", packageVersion: "1.0.0", tarballSha256: "89b14b8fb70f8c07931c180b81b3a45cc4e8452d31ea43a768c041c7fe297baf" }
const receipt = () => ({ format: "crumbs.v1.publication-exception.v1", approval: approvedV1Exception, manifestSha256: "a".repeat(64), toolingRevision: "b".repeat(40), toolingSha256: "c".repeat(64) })

describe("approved v1 publication exception", () => {
 it("rejects changed or injected authoring source even when HEAD still names the released commit", () => {
  const root=mkdtempSync(join(tmpdir(),"crumbs-v1-clean-source-"))
  const git=(...args:string[])=>execFileSync("git",args,{cwd:root,stdio:"pipe"})
  try {
   mkdirSync(join(root,"scripts")); mkdirSync(join(root,"docs")); mkdirSync(join(root,"packages/css/bench"),{recursive:true})
   writeFileSync(join(root,"scripts/probe.ts"),"export const probe=1\n"); writeFileSync(join(root,"docs/proof.json"),"{}\n")
   git("init","-q");git("add",".");git("-c","user.name=Crumbs test","-c","user.email=crumbs-test@example.invalid","commit","-qm","synthetic fixture")
   expect(()=>assertCleanV1Source(root)).not.toThrow()
   writeFileSync(join(root,"scripts/probe.ts"),"export const probe=2\n")
   expect(()=>assertCleanV1Source(root)).toThrow()
   git("checkout","--","scripts/probe.ts")
   writeFileSync(join(root,"packages/css/bench/injected.ts"),"export const invalid=1\n")
   expect(()=>assertCleanV1Source(root)).toThrow()
   rmSync(join(root,"packages/css/bench/injected.ts"));writeFileSync(join(root,"docs/proof.json"),"{\"diagnostic\":true}\n")
   expect(()=>assertCleanV1Source(root)).not.toThrow()
  } finally {rmSync(root,{recursive:true,force:true})}
 })
 it("admits exactly the published tag, source, package and qualified tarball", () => {
  expect(() => assertV1ReleaseContext(context)).not.toThrow()
  for (const key of Object.keys(context)) expect(() => assertV1ReleaseContext({ ...context, [key]: "other" })).toThrow()
 })
 it("retains an honest distinction between a pass and the approved numerical failure", () => {
  expect(assertV1BudgetAdmission({ valid: true, blockers: [] }, false)).toBe("normal-pass")
  expect(assertV1BudgetAdmission({ valid: false, blockers: [warm] }, false)).toBe("approved-warm-exception")
  expect(assertV1BudgetAdmission({ valid: false, blockers: [wrappedWarm] }, true)).toBe("approved-warm-exception")
 })
 it("rejects every failure beyond the one exact numerical warm result", () => {
  for (const blockers of [[], [warm, warm], ["Host-budget metric cold-transform-ms is fail; expected pass"], [warm, "Source digest mismatch"], [warm.replace("fail;", "incomplete-environment-mismatch;")], [warm, "Invalid runtime graph evidence"], ["Unapproved host-budget policy"], ["Missing report"], [warm+" extra"]]) {
   expect(() => assertV1BudgetAdmission({ valid: false, blockers }, false)).toThrow()
  }
  expect(() => assertV1BudgetAdmission({ valid: true, blockers: [warm] }, false)).toThrow()
  expect(() => assertV1BudgetAdmission({ valid: false, blockers: [warm] }, true)).toThrow()
 })
 it("binds the immutable approval, report manifest and trusted workflow tooling independently", () => {
  expect(() => assertV1ExceptionReceipt(receipt(), "a".repeat(64), "b".repeat(40), "c".repeat(64))).not.toThrow()
  for (const key of ["format", "manifestSha256", "toolingRevision", "toolingSha256"]) expect(() => assertV1ExceptionReceipt({...receipt(),[key]:"other"},"a".repeat(64),"b".repeat(40),"c".repeat(64))).toThrow()
  expect(() => assertV1ExceptionReceipt({...receipt(),approval:{...approvedV1Exception,metric:"cold-transform-ms"}},"a".repeat(64),"b".repeat(40),"c".repeat(64))).toThrow()
  expect(() => assertV1ExceptionReceipt({...receipt(),approval:{...approvedV1Exception,sourceRevision:"b".repeat(40)}},"a".repeat(64),"b".repeat(40),"c".repeat(64))).toThrow()
  expect(() => assertV1ExceptionReceipt(undefined,"a".repeat(64),"b".repeat(40),"c".repeat(64))).toThrow()
  expect(() => assertV1ExceptionReceipt({...receipt(),unapproved:true},"a".repeat(64),"b".repeat(40),"c".repeat(64))).toThrow()
 })
})
