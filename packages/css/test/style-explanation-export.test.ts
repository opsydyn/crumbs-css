import { describe, expect, it } from "bun:test"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const theme = { contract: {}, tokens: {}, values: {} }
const moduleNamespace = {
  __crumbsDev: {
    $$type: "crumbs.css.style-explanation-metadata",
    version: 1,
    moduleId: "@acme/ui#src/Card.css.ts",
    exports: [{
      path: ["card"],
      candidates: [],
      branches: [],
      tokenDependencies: [],
      coverage: { status: "partial", reasons: ["compatibility-only"] },
    }],
  },
  __crumbsModule: {
    $$type: "crumbs.css.native-module",
    version: 2,
    dependencyPlan: { $$type: "crumbs.css.theme-dependency-plan", version: 1, entries: [] },
  },
  card: { opacity: 0.5 },
}

describe("isolated style explanation export", () => {
  it("loads the ESM subpath and returns the versioned report", async () => {
    const api = await import("../dist/devtools.mjs")
    const report = api.explainStyle({ module: moduleNamespace, exportPath: ["card"], current: { theme } })

    expect(report).toMatchObject({
      $$type: "crumbs.css.style-explanation",
      version: 1,
      resolution: { value: { opacity: 0.5 } },
    })
  })

  it("loads the CommonJS subpath and returns the same report contract", () => {
    const api = require("../dist/devtools.cjs") as typeof import("../src/devtools/index")
    const report = api.explainStyle({ module: moduleNamespace, exportPath: ["card"], current: { theme } })

    expect(report).toMatchObject({
      $$type: "crumbs.css.style-explanation",
      version: 1,
      resolution: { value: { opacity: 0.5 } },
    })
  })
})
