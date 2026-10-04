import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const esm = {
  theme: await import('@opsydyn/crumbs-css/theme'),
  core: await import('@opsydyn/crumbs-css/theme/core'),
  conditions: await import('@opsydyn/crumbs-css/theme/conditions'),
  expressions: await import('@opsydyn/crumbs-css/theme/expressions'),
  recipes: await import('@opsydyn/crumbs-css/theme/recipes'),
  sprinkles: await import('@opsydyn/crumbs-css/theme/sprinkles'),
}
const cjs = {
  theme: require('@opsydyn/crumbs-css/theme'),
  core: require('@opsydyn/crumbs-css/theme/core'),
  conditions: require('@opsydyn/crumbs-css/theme/conditions'),
  expressions: require('@opsydyn/crumbs-css/theme/expressions'),
  recipes: require('@opsydyn/crumbs-css/theme/recipes'),
  sprinkles: require('@opsydyn/crumbs-css/theme/sprinkles'),
}
const themeEntries = ['conditions', 'expressions', 'recipes', 'sprinkles']
function compare(left, right) {
  const shared = Object.keys(left).filter(key => Object.hasOwn(right, key))
  const same = shared.filter(key => Object.is(left[key], right[key]))
  const references = shared.filter(key => (typeof left[key] === 'function' || (typeof left[key] === 'object' && left[key] !== null) || typeof left[key] === 'symbol') && typeof left[key] === typeof right[key])
  const sameReferences = references.filter(key => Object.is(left[key], right[key]))
  return { overlappingRuntimeExports: shared.length, sameExportValueCount: same.length, differentExportValueCount: shared.length - same.length, referenceExportCount: references.length, sameReferenceCount: sameReferences.length, differentReferenceCount: references.length - sameReferences.length, differentNames: shared.filter(key => !Object.is(left[key], right[key])) }
}
function surfaces(modules) { return Object.fromEntries(Object.entries(modules).map(([name, api]) => [name, {count: Object.keys(api).length, names: Object.keys(api).sort()}])) }
function identity(modules) {
  const compared = { 'theme↔theme-core': compare(modules.theme, modules.core) }
  for (const name of themeEntries) compared[`theme↔theme-${name}`] = compare(modules.theme, modules[name])
  return compared
}
const theme = { contract: {}, values: {}, tokens: { '--crumbs-m10-5-entry-group-probe': 'matched' } }
function render(provider, hook) {
  function Reader() { return React.createElement('output', null, hook().tokens['--crumbs-m10-5-entry-group-probe'] ?? 'missing') }
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(provider, { theme }, React.createElement(Reader)))
  if (html !== '<output>matched</output>') throw new Error(`mixed provider/hook render mismatch: ${html}`)
  return html
}
const behavior = {}
for (const [name, modules] of Object.entries({esm, cjs})) {
  behavior[`${name}:theme-provider-core-hook`] = render(modules.theme.ThemeProvider, modules.core.useTheme)
  behavior[`${name}:core-provider-theme-hook`] = render(modules.core.ThemeProvider, modules.theme.useTheme)
}
behavior['esm-provider-cjs-hook'] = render(esm.theme.ThemeProvider, cjs.core.useTheme)
behavior['cjs-provider-esm-hook'] = render(cjs.theme.ThemeProvider, esm.core.useTheme)
const themeEsmUrl = import.meta.resolve('@opsydyn/crumbs-css/theme')
const packageRequire = createRequire(fileURLToPath(themeEsmUrl))
const consumerReactPath = require.resolve('react')
const packageReactPath = packageRequire.resolve('react')
if (consumerReactPath !== packageReactPath) throw new Error(`package resolves a different React peer: ${packageReactPath} != ${consumerReactPath}`)
console.log(JSON.stringify({
  node: process.version,
  packageSpecifier: '@opsydyn/crumbs-css',
  peerReact: {consumerPath: consumerReactPath, packagePath: packageReactPath, sameResolution: true, version: React.version},
  exportSurfaces: { esm: surfaces(esm), cjs: surfaces(cjs) },
  identity: { esm: identity(esm), cjs: identity(cjs) },
  mixedProviderHookRenders: behavior,
}, null, 2))
