import { describe, expect, it } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { consumerFixtures } from "../test-support/consumer-fixtures"

const names = ["shared.css.ts", "button.css.ts", "reference.css.ts", "theme.css.ts"]

describe("required package-owned consumer fixtures", () => {
  it("admits the complete durable compiler project", () => {
    const fixtures = consumerFixtures()
    expect(Object.keys(fixtures)).toEqual(["root", "shared", "button", "reference", "theme"])
    expect(fixtures.shared).toBe(resolve(fixtures.root, "styles/shared.css.ts"))
  })

  it("rejects missing projects, missing individual files and directory impostors", () => {
    const root = mkdtempSync(resolve(tmpdir(), "crumbs-required-fixtures-"))
    try {
      expect(() => consumerFixtures(root)).toThrow(/Required Crumbs consumer fixture/)
      mkdirSync(resolve(root, "styles"))
      for (const name of names) writeFileSync(resolve(root, "styles", name), "")
      for (const name of names) {
        const file = resolve(root, "styles", name)
        rmSync(file)
        expect(() => consumerFixtures(root)).toThrow(file)
        mkdirSync(file)
        expect(() => consumerFixtures(root)).toThrow(file)
        rmSync(file, { recursive: true })
        writeFileSync(file, "")
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
