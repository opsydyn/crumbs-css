import { build } from '/private/tmp/crumbs-css-m105-clean/node_modules/.bun/tsdown@0.21.10+0b680d063ff02e1e/node_modules/tsdown/dist/index.mjs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const packageRoot = resolve(process.argv[2])
const { default: configs } = await import(pathToFileURL(packageRoot + '/tsdown.config.ts').href)
for (const entry of ['theme-core','theme']) {
  const config = configs.find(candidate => candidate.entry && Object.hasOwn(candidate.entry,entry))
  if (!config) throw Error('Missing original runtime group: '+entry)
  await build({ ...config, ...(process.argv.includes('--minify')?{minify:true}:{}), config:false, cwd:packageRoot,
    outDir:packageRoot+(process.argv.includes('--reference')?'/dist':'/mapped-dist'), clean:false,
    dts:false, sourcemap:process.argv.includes('--reference')?false:'hidden', logLevel:'error', report:false })
}
