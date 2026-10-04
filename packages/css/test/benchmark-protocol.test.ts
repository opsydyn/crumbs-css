import { describe, expect, it } from "bun:test"
import { resolve } from "node:path"
import { parseWarmTransformCwdMode, resolveWarmTransformCwd, verifyTransformOutputParity, withWorkingDirectory } from "../bench/benchmark-protocol"

describe("warm-transform benchmark cwd protocol", () => {
  it("keeps fixture-root as the default and resolves each explicit mode", () => {
    expect(parseWarmTransformCwdMode(undefined)).toBe("fixture-root")
    expect(resolveWarmTransformCwd("fixture-root", "/repo/packages/css", "/repo/packages/css/fixtures/consumer"))
      .toBe("/repo/packages/css/fixtures/consumer")
    expect(resolveWarmTransformCwd("package-root", "/repo/packages/css", "/repo/packages/css/fixtures/consumer"))
      .toBe("/repo/packages/css")
  })

  it("rejects unrecognized modes rather than silently selecting a cwd", () => {
    expect(() => parseWarmTransformCwdMode("repository-root")).toThrow(
      'CRUMBS_BENCH_WARM_TRANSFORM_CWD must be "fixture-root" or "package-root"',
    )
  })

  it("restores process cwd when a warm transform rejects", async () => {
    const previousDirectory = process.cwd()
    const packageRoot = resolve(import.meta.dir, "..")

    await expect(withWorkingDirectory(packageRoot, async () => {
      expect(process.cwd()).toBe(packageRoot)
      throw Error("transform receipt failed")
    })).rejects.toThrow("transform receipt failed")

    expect(process.cwd()).toBe(previousDirectory)
  })

  it("requires equivalent cold and warm output when both use the same cwd", () => {
    expect(verifyTransformOutputParity([{ outputSha256: "same" }, { outputSha256: "same" }], "same", true)).toBe(true)
    expect(() => verifyTransformOutputParity([{ outputSha256: "same" }, { outputSha256: "different" }], "same", true)).toThrow("Cold/warm transform output mismatch")
  })

  it("records output parity without failing when historical and cold cwd protocols differ", () => {
    expect(verifyTransformOutputParity([{ outputSha256: "fixture-owner" }], "package-owner", false)).toBe(false)
  })
})
