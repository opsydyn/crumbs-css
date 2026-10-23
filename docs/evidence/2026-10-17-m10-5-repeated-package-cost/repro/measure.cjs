const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const [rootArg, variant, pairArg, output] = process.argv.slice(2);
const root = fs.realpathSync(rootArg), pair = Number(pairArg);
if (!['control', 'profile'].includes(variant) || !Number.isInteger(pair)) throw Error('Invalid arguments');
if (process.env.NODE_ENV || process.env.ESBUILD_BINARY_PATH || process.env.CRUMBS_OWNED_FRESH_PROFILE) throw Error('Unexpected diagnostic environment');
const req = createRequire(path.join(root, 'package.json'));
const compilerReq = createRequire(req.resolve('@vanilla-extract/integration'));
const originalEsbuild = compilerReq('esbuild');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const originalRead = fs.readFileSync;
let active = null;
const events = [];
if (variant === 'profile') {
  fs.readFileSync = function (...args) {
    const start = performance.now(); let outcome = 'read';
    try { return originalRead.apply(this, args); }
    catch (error) { outcome = error.code || error.name; throw error; }
    finally { if (active) active.reads.push({path:String(args[0]), start, end:performance.now(), outcome}); }
  };
  require.cache[compilerReq.resolve('esbuild')].exports = {
    ...originalEsbuild,
    async build(options) {
      if (!active) throw Error('Build outside transform');
      const build = {start:performance.now(), cssLoads:[]}; active.builds.push(build);
      const plugins = (options.plugins || []).map(plugin => ({
        ...plugin,
        setup(api) {
          return plugin.setup(new Proxy(api, {get(target, key) {
            if (key !== 'onLoad') return Reflect.get(target, key);
            return (filter, callback) => target.onLoad(filter, async args => {
              const start = performance.now();
              try { return await callback(args); }
              finally { build.cssLoads.push({plugin:plugin.name, path:args.path, start, end:performance.now()}); }
            });
          }}));
        },
      }));
      try {
        const result = await originalEsbuild.build({...options, plugins});
        build.end = performance.now(); build.metafile = result.metafile;
        build.outputText = result.outputFiles[0].text;
        return result;
      } catch (error) { build.end = performance.now(); throw error; }
    },
  };
}
const integration = req('@vanilla-extract/integration');
if (variant === 'profile') {
  const compile = integration.compile;
  integration.compile = async options => {
    const call = {start:performance.now(), entry:options.filePath}; active.compiles.push(call);
    try { const result = await compile(options); call.sourceText = result.source; call.watchFiles = result.watchFiles; return result; }
    finally { call.end = performance.now(); }
  };
}
const transformer = req(path.join(root, 'dist/transformer.cjs'));
const fixtures = [
  ['README', 'examples/recipe.css.ts', root],
  ['consumer', 'fixtures/consumer/styles/button.css.ts', path.join(root, 'fixtures/consumer')],
];
if (pair % 2 === 0) fixtures.reverse();
function category(file) {
  const p = fs.realpathSync(path.resolve(root, file));
  if (p.startsWith(path.join(root, 'dist') + path.sep)) return 'crumbs-dist';
  if (p.split(path.sep).includes('node_modules')) return 'vendor';
  return 'authored';
}
(async () => {
  process.chdir(root);
  try {
    for (const [label, file, cwd] of fixtures) {
      for (let i = -2; i < 6; i++) {
        const event = {label, file, cwd, sample:i, builds:[], compiles:[], reads:[]};
        active = event;
        event.start = performance.now();
        const code = await transformer.transformCssTsToStyleSheet(path.join(root, file), cwd, {strictDiagnostics:true});
        event.end = performance.now(); active = null;
        event.outputSha256 = sha(code); event.outputBytes = Buffer.byteLength(code);
        for (const b of event.builds) {
          b.outputSha256 = sha(b.outputText); delete b.outputText;
          b.inputs = Object.entries(b.metafile.inputs).map(([file,info]) => ({file, category:category(path.resolve(cwd,file)), bytes:info.bytes, sha256:sha(originalRead(path.resolve(cwd,file)))}));
        }
        for (const c of event.compiles) {c.sourceSha256 = sha(c.sourceText); delete c.sourceText;}
        events.push(event);
      }
    }
  } finally { active = null; await originalEsbuild.stop(); }
  fs.writeFileSync(output, JSON.stringify({format:'crumbs.m10.5.cost-attribution',version:1,pair,variant,root,
    runtime:{node:process.version,bun:typeof Bun === 'undefined' ? null : Bun.version,esbuild:originalEsbuild.version},
    observers:variant==='profile' ? ['integration.compile','esbuild.build','existing onLoad callbacks','fs.readFileSync'] : [],
    events},null,2)+'\n');
})().catch(error => {console.error(error);process.exitCode=1;});
