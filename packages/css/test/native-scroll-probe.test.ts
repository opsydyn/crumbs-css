import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { runInNewContext } from "node:vm"

const script = readFileSync(resolve(import.meta.dir, "../../../apps/playground/e2e/read-probe.js"), "utf8")
function decode(text: string) {
  const context = { maestro: { copiedText: text }, output: {} as { probe?: unknown } }
  runInNewContext(script, context)
  return JSON.parse(JSON.stringify(context.output.probe))
}

describe("native scroll evidence admission", () => {
  it("decodes the independently specified native measurement fixture", () => {
    expect(decode("Scroll probe: y=440 first=8 viewport=579 content=6397\nTouch: starts=1 moves=17 ends=1 drags=1")).toEqual({ y: 440, first: 8, viewport: 579, content: 6397, starts: 1, moves: 17, ends: 1, drags: 1 })
  })

  it("fails closed on absent, partial, malformed or unrelated measurements", () => {
    for (const text of ["", "Scroll probe: y=440 first=8", "Other text", "Scroll probe: y=NaN first=8 viewport=579 content=6397\nTouch: starts=1 moves=17 ends=1 drags=1"]) {
      expect(() => decode(text)).toThrow()
    }
  })

  it("rejects invalid geometry, row identity and unsafe numbers", () => {
    for (const text of [
      "Scroll probe: y=0 first=0 viewport=579 content=6397\nTouch: starts=0 moves=0 ends=0 drags=0",
      "Scroll probe: y=0 first=1 viewport=0 content=6397\nTouch: starts=0 moves=0 ends=0 drags=0",
      "Scroll probe: y=9007199254740992 first=1 viewport=579 content=6397\nTouch: starts=0 moves=0 ends=0 drags=0",
    ]) expect(() => decode(text)).toThrow()
  })
})
