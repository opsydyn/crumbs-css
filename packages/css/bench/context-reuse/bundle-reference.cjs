"use strict";
// Untimed, fresh public native transform. Bind source-map content to the source state,
// including cache hits which legitimately have no new worker trace.
const fs = require("node:fs");
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const transformer = require(spec.transformerPath);
(async () => {
 const code = await transformer.transformCssTsToStyleSheet(spec.entry, spec.app, {
  strictDiagnostics: spec.config.nativeStyles?.strictDiagnostics === true || process.env.CRUMBS_CSS_STRICT === "1",
  useStyleSheet: spec.options.platform !== "web",
  platform: spec.options.platform ?? null,
  dev: spec.options.dev,
  includeStyleExplanations: spec.config.nativeStyles?.includeStyleExplanations ?? spec.options.dev,
 });
 fs.writeFileSync(spec.output, code);
 if(spec.fullResultOutput){const result=await transformer.transform(spec.config,spec.app,require("node:path").relative(spec.app,spec.entry),fs.readFileSync(spec.entry),spec.options);fs.writeFileSync(spec.fullResultOutput,JSON.stringify(result));}
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
