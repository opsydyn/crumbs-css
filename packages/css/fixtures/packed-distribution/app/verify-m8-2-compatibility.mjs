import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { realpathSync } from "node:fs"
import { dirname } from "node:path"
import { PassThrough } from "node:stream"
import React from "react"
import { renderToPipeableStream } from "react-dom/server"
import {
  TokenThemeProvider,
  createSprinklesResolver,
  createThemeDependencyPlan,
  createThemeDependencyResolver,
  resolveThemeTokens,
} from "@opsydyn/crumbs-css/theme"
import {
  createTokenContract,
  createTokenThemeSnapshot,
  defineToken,
  getTokenId,
} from "@opsydyn/crumbs-css/tokens"
import { decodeExternalTokenTheme } from "@opsydyn/crumbs-css/tokens/schema"
import { theme, vars } from "@acme/design-tokens"

const appRequire = createRequire(import.meta.url)
const uiEntryPath = appRequire.resolve("@acme/ui")
const uiRequire = createRequire(uiEntryPath)

function resolvePackageRoot(requireFromConsumer, packageName) {
  return dirname(realpathSync(requireFromConsumer.resolve(`${packageName}/package.json`)))
}

const directCrumbsRoot = resolvePackageRoot(appRequire, "@opsydyn/crumbs-css")
const nestedCrumbsRoot = resolvePackageRoot(uiRequire, "@opsydyn/crumbs-css")
assert.notEqual(
  directCrumbsRoot,
  nestedCrumbsRoot,
  `App and UI must resolve distinct physical Crumbs copies; both resolved ${directCrumbsRoot}`,
)

const appReactPath = realpathSync(appRequire.resolve("react"))
const uiReactPath = realpathSync(uiRequire.resolve("react"))
assert.equal(
  appReactPath,
  uiReactPath,
  `App and UI must share one React instance; resolved ${appReactPath} and ${uiReactPath}`,
)

const secondaryContract = createTokenContract({
  color: {
    accent: defineToken("color"),
    canvas: defineToken("color"),
    muted: defineToken("color"),
    onAccent: defineToken("color"),
  },
  radius: {md: defineToken("length")},
  space: {md: defineToken("length")},
}, {
  identity: {owner: "@acme/brand-tokens", name: "SecondaryFoundation", version: 1},
})
const secondaryTheme = createTokenThemeSnapshot(secondaryContract, {
  base: {
    color: {
      accent: "#c42f73",
      canvas: "#fff8fb",
      muted: "#6d344d",
      onAccent: "#ffffff",
    },
    radius: {md: 10},
    space: {md: 20},
  },
  contexts: {},
})

const LazyThemeProbe = React.lazy(() => import("@acme/ui/theme-probe"))
const app = React.createElement(
  TokenThemeProvider,
  {contract: vars, theme},
  React.createElement(
    TokenThemeProvider,
    {contract: secondaryContract, theme: secondaryTheme},
    React.createElement(
      React.Suspense,
      {fallback: React.createElement("span", {"data-probe": "loading"}, "loading")},
      React.createElement(LazyThemeProbe, {secondaryContract}),
    ),
  ),
)

const rendered = await new Promise((resolve, reject) => {
  const output = new PassThrough()
  let html = ""
  let renderError
  output.setEncoding("utf8")
  output.on("data", chunk => { html += chunk })
  output.on("error", reject)
  output.on("end", () => renderError === undefined ? resolve(html) : reject(renderError))

  const stream = renderToPipeableStream(app, {
    onAllReady() {
      stream.pipe(output)
    },
    onShellError(error) {
      reject(error)
    },
    onError(error) {
      renderError ??= error
    },
  })
})

assert.match(rendered, /data-probe="foundation">#2457d6<\/span>/)
assert.match(rendered, /data-probe="secondary">#c42f73<\/span>/)

const recipeV2 = {
  $$type: "crumbs.css.component-recipe",
  version: 2,
  slots: {root: "view"},
  base: {root: {opacity: 1}},
  variants: {},
  defaultVariants: {},
  compoundVariants: [],
}
assert.doesNotThrow(() => resolveThemeTokens(recipeV2, theme))
assert.throws(
  () => resolveThemeTokens({...recipeV2, version: 4}, theme),
  /Unsupported component recipe version 4/,
)

const extensionV1 = {
  $$type: "crumbs.css.component-recipe-extension",
  version: 1,
  identity: {owner: "@acme/brand", name: "M8CompatibilityProbe", version: 1},
  componentIdentity: {owner: "@acme/ui", name: "M8CompatibilityProbe", version: 1},
  defaultVariants: {},
  variants: {},
  compoundVariants: [],
  slotOverrides: {},
}
assert.doesNotThrow(() => resolveThemeTokens(extensionV1, theme))
assert.throws(
  () => resolveThemeTokens({...extensionV1, version: 2}, theme),
  /Unsupported component recipe extension version 2/,
)

const sprinklesV1 = {
  $$type: "crumbs.css.sprinkles-lookup-plan",
  version: 1,
  primitives: ["view"],
  properties: {},
  shorthands: {},
}
assert.deepEqual(createSprinklesResolver(sprinklesV1)(), [])
assert.throws(
  () => createSprinklesResolver({...sprinklesV1, version: 2}),
  /Unsupported native Sprinkles lookup plan version 2/,
)

const dependencyPlanV1 = createThemeDependencyPlan([])
assert.doesNotThrow(() => createThemeDependencyResolver({}, dependencyPlanV1))
assert.throws(
  () => createThemeDependencyResolver({}, {...dependencyPlanV1, version: 2}),
  /Unsupported theme dependency plan version/,
)

const externalThemeV1 = {
  _tag: "CrumbsTokenTheme",
  version: 1,
  contract: {owner: "@acme/design-tokens", name: "Foundation", version: 1},
  values: {[getTokenId(vars.color.accent)]: "#2457d6"},
}
assert.equal(decodeExternalTokenTheme(externalThemeV1).ok, true)
assert.equal(decodeExternalTokenTheme({...externalThemeV1, version: 2}).ok, false)

assert.throws(() => createTokenContract({
  color: {
    accent: defineToken("color"),
    canvas: defineToken("color"),
    muted: defineToken("color"),
    onAccent: defineToken("color"),
    danger: defineToken("color"),
  },
  radius: {md: defineToken("length")},
  space: {md: defineToken("length")},
}, {
  identity: {owner: "@acme/design-tokens", name: "Foundation", version: 1},
}), /CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION/)

console.log(JSON.stringify({
  status: "passed",
  crumbsCopies: [directCrumbsRoot, nestedCrumbsRoot],
  sharedReact: appReactPath,
  lazyThemeValues: ["#2457d6", "#c42f73"],
  rejectedFutureVersions: ["recipe:4", "extension:2", "sprinkles:2", "theme-dependency-plan:2", "external-token-theme:2"],
  rejectedIdentityShapeCollision: true,
}))
