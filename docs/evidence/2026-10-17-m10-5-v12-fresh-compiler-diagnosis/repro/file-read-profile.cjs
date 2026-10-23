const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(process.argv[2]), mode = process.argv[3], output = process.argv[4];
if (!['control', 'profile'].includes(mode)) throw Error('Expected control or profile');
if (mode === 'profile') {
  process.env.CRUMBS_OWNED_FRESH_PROFILE = '1';
  process.env.ESBUILD_BINARY_PATH = path.join(path.dirname(root), 'timing-service.sh');
} else {
  delete process.env.CRUMBS_OWNED_FRESH_PROFILE;
  delete process.env.ESBUILD_BINARY_PATH;
}
globalThis.__CRUMBS_FRESH_PROFILE = [];
const req = require('node:module').createRequire(path.join(root, 'package.json'));
let fileReads = [], observingMetafile = false;
const readFile = fs.readFileSync;
fs.readFileSync = function(...args) {
  const start = performance.now(); let outcome = 'read';
  try { return readFile.apply(this,args); } catch(error) { outcome = error.code || error.name; throw error; }
  finally { if (!observingMetafile) fileReads.push({path:String(args[0]),ms:performance.now()-start,outcome}); }
};
const integration = req('@vanilla-extract/integration'), original = integration.compile;
const esbuild = require('node:module').createRequire(req.resolve('@vanilla-extract/integration'))('esbuild');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
let calls = [];
integration.compile = async options => {
  const start = performance.now(), index = globalThis.__CRUMBS_FRESH_PROFILE.length;
  let metafile;
  const recorder = {name: 'owned-metafile-recorder', setup(build) {build.onEnd(result => {metafile = result.metafile;});}};
  const result = await original({...options, esbuildOptions: {...options.esbuildOptions, plugins: [...(options.esbuildOptions?.plugins ?? []), recorder]}});
  observingMetafile = true;
  calls.push({ms: performance.now() - start, sourceSha256: sha(result.source), watchFiles: result.watchFiles,
    inputs: Object.entries(metafile.inputs).map(([file, info]) => ({file, bytes: info.bytes, sha256: sha(fs.readFileSync(path.resolve(options.cwd, file)))})),
    pluginEvents: globalThis.__CRUMBS_FRESH_PROFILE.slice(index)});
  observingMetafile = false;
  return result;
};
const transformer = req(path.join(root, 'dist/transformer.cjs'));
(async () => {
  process.chdir(root);
  const rows = [];
  try {
    for (const [label, file, cwd] of [['README', 'examples/recipe.css.ts', root], ['consumer', 'fixtures/consumer/styles/button.css.ts', path.join(root, 'fixtures/consumer')]]) {
      const run = async () => {
        calls = []; fileReads = [];
        const start = performance.now();
        const code = await transformer.transformCssTsToStyleSheet(path.join(root, file), cwd, {strictDiagnostics: true});
        return {ms: performance.now() - start, sha256: sha(code), compileCalls: calls, fileReads};
      };
      const setup = [await run(), await run()], samples = [];
      for (let i = 0; i < 6; i++) samples.push(await run());
      rows.push({label, file, cwd, setup, samples});
    }
  } finally { await esbuild.stop(); }
  fs.writeFileSync(output, JSON.stringify({format: 'crumbs.m10.5.fresh-compile-profile', version: 1, mode,
    runtime: {node: process.version, bun: typeof Bun === 'undefined' ? null : Bun.version},
    protocol: 'Compiled CJS diagnostic; two setup calls, six retained full transforms per fixture; owned integration/native timers; not official budget qualification', rows}, null, 2) + '\n');
})().catch(error => {console.error(error); process.exitCode = 1;});
