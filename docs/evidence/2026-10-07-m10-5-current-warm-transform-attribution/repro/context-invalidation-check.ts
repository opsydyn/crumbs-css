import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { consumerFixtures } from "../test-support/consumer-fixtures"
import { transformCssTsToStyleSheet } from "../src/transformer"
const fixtures = consumerFixtures()
const hash = (value: string) => createHash("sha256").update(value).digest("hex")
const transform = () => transformCssTsToStyleSheet(fixtures.button, fixtures.root, { strictDiagnostics: true })
const prior = process.env.CRUMBS_M105_CONTEXT_REUSE
delete process.env.CRUMBS_M105_CONTEXT_REUSE
const control = await transform()
process.env.CRUMBS_M105_CONTEXT_REUSE = "1"
const expected = hash(control)
if (hash(await transform()) !== expected) throw Error("fresh/context output mismatch")
for (let i = 0; i < 6; i++) if (hash(await transform()) !== expected) throw Error("repeated context output mismatch")
const edit = async (file: string, before: string, after: string) => {
 const original = readFileSync(file, "utf8")
 if (original.split(before).length !== 2) throw Error("edit anchor must be unique")
 try { writeFileSync(file, original.replace(before, after)); const changed = hash(await transform()); if (changed === expected) throw Error("edit did not invalidate output") }
 finally { writeFileSync(file, original) }
 if (hash(await transform()) !== expected) throw Error("restore did not recover output")
}
await edit(fixtures.button, "minHeight: 48", "minHeight: 49")
await edit(resolve(fixtures.root, "styles/theme.css.ts"), "#3559c7", "#3659c7")
await globalThis.__crumbsDisposeContexts?.()
if (prior === undefined) delete process.env.CRUMBS_M105_CONTEXT_REUSE; else process.env.CRUMBS_M105_CONTEXT_REUSE = prior
console.log(JSON.stringify({ outputParity: true, repeatedTransforms: 6, entryAndDependencyInvalidation: true, restoredOutputParity: true }))
