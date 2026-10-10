import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { approvedM19bException, assertM19bReleaseContext, assertM19bBudgetAdmission, assertM19bSdkReceipt } from "../../../scripts/m19b-publication"

const failure = "Host-budget metric warm-transform-ms is fail; expected pass"

describe("M1.9b exact release disposition", () => {
  test("admits only the pinned v1.1.0 source, tarball and report", () => {
    expect(() => assertM19bReleaseContext(approvedM19bException)).not.toThrow()
    for (const key of ["releaseTag", "sourceRevision", "packageName", "packageVersion", "tarballSha256", "reportDigest"] as const) {
      expect(() => assertM19bReleaseContext({ ...approvedM19bException, [key]: "changed" })).toThrow()
    }
  })

  test("admits the complete approved warm failure through both independent verifiers", () => {
    expect(assertM19bBudgetAdmission({valid:false,blockers:[failure]},false,9.26974999999993)).toBe("approved-warm-exception")
    expect(assertM19bBudgetAdmission({valid:false,blockers:[`Host-budget report is not release-qualified: ${failure}`]},true,9.26974999999993)).toBe("approved-warm-exception")
  })

  test("rejects additional, duplicate, incomplete and invalid evidence failures", () => {
    for (const blockers of [[], [failure,failure], [failure,"incomplete"], ["Host-budget metric incremental-rebuild is fail; expected pass"], [failure,"Source digest mismatch"]]) {
      expect(() => assertM19bBudgetAdmission({valid:false,blockers},false,9.26974999999993)).toThrow()
    }
    expect(() => assertM19bBudgetAdmission({valid:true,blockers:[failure]},false,9.26974999999993)).toThrow()
  })

  test("rejects a greater or missing/nonfinite warm median", () => {
    for (const median of [undefined,NaN,Infinity,-1,0,9.270]) {
      expect(() => assertM19bBudgetAdmission({valid:false,blockers:[failure]},false,median)).toThrow()
    }
  })

  test("requires the exact clean-source SDK57 qualification receipt", () => {
    const bytes=readFileSync(resolve(import.meta.dir,"../../../docs/evidence/2026-10-10-m1-9b-expo57/exact-candidate/sdk57-qualification.json"))
    expect(() => assertM19bSdkReceipt(bytes)).not.toThrow()
    const changed=JSON.parse(bytes.toString())
    changed.checks.types="failed"
    expect(() => assertM19bSdkReceipt(Buffer.from(JSON.stringify(changed)))).toThrow()
    expect(() => assertM19bSdkReceipt(Buffer.from("{}"))).toThrow()
  })
})
