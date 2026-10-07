import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../')
const packageRequire = createRequire(resolve(repoRoot, 'packages/css/package.json'))
const appRequire = createRequire(resolve(repoRoot, 'package.json'))
const packageReactPath = packageRequire.resolve('react')
packageRequire('react')
const rendererPath = appRequire.resolve('react-dom/server')
const rendererRequire = createRequire(rendererPath)
const rendererReactPath = rendererRequire.resolve('react')
rendererRequire.cache[rendererReactPath] = packageRequire.cache[packageReactPath]
const { createElement } = packageRequire('react')
const { renderToStaticMarkup } = appRequire('react-dom/server')
const core = await import(pathToFileURL(resolve(repoRoot, 'packages/css/dist/theme-core.mjs')).href)
const focused = await import(pathToFileURL(resolve(repoRoot, 'packages/css/dist/theme-react.mjs')).href)

const theme = { contract: {}, values: {}, tokens: {} }
function render(providerApi, consumerApi) {
  function Probe() {
    const selectedTheme = consumerApi.useTheme()
    const styles = consumerApi.useThemedStyles({ root: { opacity: 0.5 } })
    return createElement('output', { 'data-opacity': styles.root.opacity }, selectedTheme === theme ? 'shared-context' : 'wrong-context')
  }
  return renderToStaticMarkup(createElement(providerApi.ThemeProvider, { theme }, createElement(Probe)))
}
const results = {
  coreProviderFocusedHooks: render(core, focused),
  focusedProviderCoreHooks: render(focused, core),
}
if (Object.values(results).some(value => !value.includes('shared-context') || !value.includes('data-opacity="0.5"'))) {
  throw new Error(`Cross-entrypoint provider/hook contract failed: ${JSON.stringify(results)}`)
}
console.log(JSON.stringify({ receipt: 'passed', ...results }))
