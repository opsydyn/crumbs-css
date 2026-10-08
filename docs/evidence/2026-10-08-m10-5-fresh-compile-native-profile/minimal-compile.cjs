// Stock fresh integration build against the retained input graph; no Crumbs transform/evaluation.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const graph = path.resolve(process.argv[2]), dependencies = path.resolve(process.argv[3]);
const req = require('node:module').createRequire(path.join(dependencies, 'package.json'));
const integration = req('@vanilla-extract/integration'), esbuild = req('esbuild');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
(async () => {
  const rows = [];
  try {
    for (const [label, entry, cwd] of [['README', 'examples/recipe.css.ts', graph], ['consumer', 'fixtures/consumer/styles/button.css.ts', path.join(graph, 'fixtures/consumer')]]) {
      const result = await integration.compile({filePath: path.join(graph, entry), cwd, identOption: 'debug'});
      rows.push({label, sourceSha256: sha(result.source), watchFiles: result.watchFiles.map(file => path.relative(graph, file))});
    }
  } finally { await esbuild.stop(); }
  console.log(JSON.stringify({format: 'crumbs.m10.5.minimal-stock-compile-smoke', version: 1,
    runtime: {node: process.version, bun: typeof Bun === 'undefined' ? null : Bun.version}, rows}, null, 2));
})().catch(error => {console.error(error); process.exitCode = 1;});
