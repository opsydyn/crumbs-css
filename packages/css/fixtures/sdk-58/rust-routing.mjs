// Run with Bun against an owned staged packed consumer, never a workspace app.
import { readFile, writeFile, mkdir, rm, realpath } from "node:fs/promises";
import { openSync, closeSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { createServer } from "node:net";
import { verifyRuntimeBundles } from "../../../../scripts/runtime-bundle-contract.ts";
import { assertRustWorkerEvidence, summarizeRustWorkerEvents, assertEnvironmentOnlyInputs } from "../../../../scripts/sdk-worker-evidence.ts";
const [consumerArg, outputArg] = process.argv.slice(2);
if (!consumerArg || !outputArg)
  throw Error("Expected staged consumer and output directory");
const root = await realpath(consumerArg),
  output = resolve(outputArg);
if (!basename(root).startsWith("crumbs-playground-"))
  throw Error("Only owned staged consumers are allowed");
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (
  pkg.name !== "@crumbs/playground" ||
  !String(pkg.dependencies["@opsydyn/crumbs-css"]).startsWith("file:")
)
  throw Error("Expected packed staged consumer");
await mkdir(output, { recursive: true });
const hash = (x) => createHash("sha256").update(x).digest("hex");
const originals = new Map();
async function put(file, value) {
  if (!originals.has(file)) {
    try {
      originals.set(file, await readFile(join(root, file)));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      originals.set(file, null);
    }
  }
  await mkdir(join(root, file, ".."), { recursive: true });
  await writeFile(join(root, file), value);
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const env = {
  ...process.env,
  CI: "0",
  EXPO_NO_TELEMETRY: "1",
  EXPO_NO_METRO_WORKSPACE_ROOT: "1",
  LOG_DEBUG: "transform:*",
  CRUMBS_SDK_CACHE: join(output, "metro-cache"),
};
let child;
async function stop() {
  if (!child) return;
  const current = child;
  child = undefined;
  current.kill("SIGTERM");
  await Promise.race([
    new Promise((r) => current.once("exit", r)),
    pause(5000),
  ]);
  if (current.exitCode === null) current.kill("SIGKILL");
}
const { SourceMapConsumer } = createRequire(join(root, "package.json"))(
  "source-map",
);
function verifyAuthoredMap(sourceMap, authored = styleSource) {
  const sections = sourceMap.sections
    ? sourceMap.sections.flatMap((s) =>
        s.map.sections ? s.map.sections.map((child) => child.map) : [s.map],
      )
    : [sourceMap];
  const anchors = new Set();
  let mappings = 0;
  for (const map of sections) {
    if (!map.sources.some((source) => source.endsWith("src/rust-probe.css.ts")))
      continue;
    new SourceMapConsumer(map).eachMapping((mapping) => {
      if (!mapping.source?.endsWith("src/rust-probe.css.ts")) return;
      const line = authored.split("\n")[mapping.originalLine - 1];
      if (line === undefined || mapping.originalColumn > line.length)
        throw Error("Source map points outside authored style source");
      mappings++;
      anchors.add(`${mapping.originalLine}:${mapping.originalColumn}`);
    });
  }
  for (const name of ["panel", "ProbeCard"])
    if (
      !anchors.has(
        `1:${authored.indexOf("export const " + name) + "export const ".length}`,
      )
    )
      throw Error(`Missing authored export anchor: ${name}`);
  return { mappings, anchors: [...anchors] };
}
let styleSource;
const records = [];
try {
  await put(
    "package.json",
    JSON.stringify({ ...pkg, main: "src/rust-probe.ts" }, null, 2),
  );
  await put(
    "babel.config.js",
    'module.exports = api => {api.cache(true); return {presets:["babel-preset-expo"]}};\n',
  );
  await put(
    "src/rust-probe.ts",
    'import {registerRootComponent} from "expo"; import {createElement} from "react"; import {View,Text} from "react-native"; import {panel,ProbeCard} from "./rust-probe.css"; import {dependencyMarker} from "@crumbs/rust-probe"; import {workletProbe,reanimatedProbe} from "./rust-probe-worklet"; export const workerEnvironment=process.env.EXPO_PUBLIC_CRUMBS_SDK_PROBE; registerRootComponent(()=>createElement(View,{style:panel},createElement(Text,null,dependencyMarker+workletProbe()+typeof reanimatedProbe),createElement(ProbeCard)));\n',
  );
  await put(
    "src/rust-probe-worklet.ts",
    'import {withTiming} from "react-native-reanimated";export function workletProbe(){"worklet";return 42};export const reanimatedProbe=()=>withTiming(1);\n',
  );
  await put("src/rust-probe-token.ts", "export const padding=30000+1;\n");
  await put(
    "src/rust-probe-base.css.ts",
    'import {viewStyle} from "@opsydyn/crumbs-css/style"; export const base=viewStyle({margin:31000+1});\n',
  );
  await put("src/rust-probe-optional.js", "export const border=33000+1;\n");
  const themeSource =
    'import {createTheme,createThemeContract} from "@opsydyn/crumbs-css/style";export const vars=createThemeContract({space:{gap:null}});export const theme=createTheme(vars,{space:{gap:34000+1}});\n';
  await put("src/rust-probe-theme.css.ts", themeSource);

  await put(
    "node_modules/@crumbs/rust-probe/package.json",
    JSON.stringify({
      name: "@crumbs/rust-probe",
      version: "1.0.0",
      main: "index.js",
      types: "index.d.ts",
    }),
  );
  const runtime =
    'exports.dependencyMarker="eligible-dependency-rust-probe";exports.factoryMarker="factory-before";exports.createProbe=function(style){return function Probe(props){return require("react").createElement(require("react-native").View,{...props,style:[style,props.style]})}};\n';
  await put("node_modules/@crumbs/rust-probe/index.js", runtime);
  await put(
    "node_modules/@crumbs/rust-probe/index.d.ts",
    'import type {ComponentType} from "react";import type {ViewStyle,ViewProps} from "react-native";export declare const dependencyMarker:string;export declare const factoryMarker:string;export declare function createProbe(style:ViewStyle):ComponentType<ViewProps>;\n',
  );
  await put(
    "src/rust-probe-authoring.ts",
    'import type * as Runtime from "@crumbs/rust-probe";import {defineExtension} from "@opsydyn/crumbs-css/extensions";export const factory=defineExtension<typeof Runtime>().factory({importPath:"@crumbs/rust-probe",importName:"createProbe"});\n',
  );
  const style =
    'import {viewStyle} from "@opsydyn/crumbs-css/style";import {padding} from "./rust-probe-token";import {base} from "./rust-probe-base.css";import {border} from "./rust-probe-optional";import {factory} from "./rust-probe-authoring";import {vars,theme} from "./rust-probe-theme.css";export const probeTheme=theme;export const panel=viewStyle([base,{padding,gap:vars.space.gap,borderWidth:border,backgroundColor:"#3559c7"}]);export const ProbeCard=factory({padding:8});\n';
  styleSource = style;
  await put("src/rust-probe.css.ts", style);
  // A diagnostic wrapper records boundaries; it delegates unmodified inputs/results.
  await put(
    "sdk-upstream-probe.cjs",
    'const fs=require("node:fs"),crypto=require("node:crypto");const upstream=require(require("expo/metro-config").getDefaultConfig(__dirname).transformerPath);module.exports={...upstream,transform:async function(config,root,file,data,options){if(file.endsWith(".css.ts"))fs.appendFileSync(process.env.CRUMBS_SDK_TRACE,JSON.stringify({kind:"generated",file,sha256:crypto.createHash("sha256").update(data).digest("hex"),code:data.toString()})+"\\n");return upstream.transform(config,root,file,data,options)}};\n',
  );
  await put(
    "sdk-worker-probe.cjs",
    'const fs=require("node:fs");const worker=require("@opsydyn/crumbs-css/dist/transformer");module.exports={...worker,transform:async function(config,root,file,data,options){const result=await worker.transform({...config,upstreamTransformerPath:require.resolve("./sdk-upstream-probe.cjs")},root,file,data,options);if(file.endsWith(".css.ts"))fs.appendFileSync(process.env.CRUMBS_SDK_TRACE,JSON.stringify({kind:"compiled",file,mapKind:typeof result.output?.[0]?.data?.map,mapIsArray:Array.isArray(result.output?.[0]?.data?.map),reconcile:!!result.output?.[0]?.data?.reconcile,hasMetadata:!!result.__crumbsNativeStyles,resultKey:result.unstable_transformResultKey})+"\\n");return result}};\n',
  );
  const metro = await readFile(join(root, "metro.config.js"), "utf8");
  if (!metro.includes("const config = getDefaultConfig(__dirname)"))
    throw Error("Expected staged Expo Metro configuration");
  const scopedMetro = metro.replace(
    "const config = getDefaultConfig(__dirname)",
    "const config = getDefaultConfig(__dirname)\nconfig.cacheStores=config.cacheStores.map(store=>new store.constructor({root:process.env.CRUMBS_SDK_CACHE}))",
  );
  await put(
    "metro.config.js",
    scopedMetro +
      '\nmodule.exports={...module.exports,transformerPath:require.resolve("./sdk-worker-probe.cjs")};\n',
  );
  const workerReceipt = Bun.spawnSync(
    [
      "node",
      "-e",
      `const fs=require('node:fs'),{createRequire}=require('node:module');const r=createRequire(process.cwd()+'/package.json');console.log(JSON.stringify({metro:{path:fs.realpathSync(r.resolve('metro/package.json')),version:r('metro/package.json').version},expoWorker:fs.realpathSync(r('expo/metro-config').getDefaultConfig(process.cwd()).transformerPath),crumbsWorker:fs.realpathSync(r.resolve('@opsydyn/crumbs-css/dist/transformer'))}))`,
    ],
    { cwd: root, stdout: "pipe", stderr: "pipe" },
  );
  if (workerReceipt.exitCode !== 0)
    throw Error(workerReceipt.stderr.toString());
  const workers = JSON.parse(workerReceipt.stdout.toString());
  if (
    workers.metro.version !== "0.87.1" ||
    !workers.metro.path.startsWith(root + "/node_modules/")
  )
    throw Error("Expected app-owned Metro 0.87.1");
  const hostRequire = createRequire(join(root, "package.json"));
  const hostBabel = hostRequire("@babel/core");
  let baselineSemantics;
  function verifyHostSemantics(generatedCode) {
    const native = {
      View: "ControlledView",
      StyleSheet: { create: (styles) => styles },
    };
    const factory = { exports: {} };
    const peer = (specifier) =>
      specifier === "react-native"
        ? native
        : specifier === "react"
          ? hostRequire("react")
          : specifier === "@crumbs/rust-probe"
            ? factory.exports
            : specifier.startsWith(".")
              ? {}
              : (() => {
                  throw Error(`Unexpected generated host import: ${specifier}`);
                })();
    runInNewContext(runtime, { exports: factory.exports, require: peer });
    const exports = {};
    const code = hostBabel.transformSync(generatedCode, {
      configFile: false,
      babelrc: false,
      plugins: [
        hostRequire.resolve("@babel/plugin-transform-modules-commonjs"),
      ],
    }).code;
    runInNewContext(code, { exports, require: peer });
    let presses = 0;
    const element = exports.ProbeCard({
      onTouchEnd: () => presses++,
      style: { opacity: 0.5 },
    });
    element.props.onTouchEnd();
    const panel = hostRequire(
      "@opsydyn/crumbs-css/theme/core",
    ).resolveThemeStyles({ panel: exports.panel }, exports.probeTheme).panel;
    if (
      element.type !== "ControlledView" ||
      presses !== 1 ||
      (panel.rowGap !== 34001 || panel.columnGap !== 34001) ||
      panel.paddingTop !== 30001 ||
      panel.marginTop !== 31001 ||
      panel.borderTopWidth !== 33001 ||
      element.props.style[0].padding !== 8
    )
      throw Error("Generated style or factory callback semantics differ");
    const receipt = {
      panel,
      factoryStyle: element.props.style,
      callbackCount: presses,
      boundary:
        "pre-upstream generated JS with real React and controlled RN host; not native event acceptance",
    };
    if (
      baselineSemantics &&
      JSON.stringify(baselineSemantics) !== JSON.stringify(receipt)
    )
      throw Error("Backend style/callback semantics differ");
    baselineSemantics ??= receipt;
    return receipt;
  }
  const app = JSON.parse(await readFile(join(root, "app.json"), "utf8"));
  const entry = await readFile(join(root, "src/rust-probe.ts"), "utf8");
  const initialHashes = [];
  let baselineGenerated;
  let baselineProduction;
  const stepHashes = new Map();
  const primedInputs = new Map();
  async function inputHashes() {
    const files = [...new Set(["package.json", "package-lock.json", "babel.config.js", ...originals.keys()])].sort();
    return Object.fromEntries(await Promise.all(files.map(async file => {
      try { return [file, hash(await readFile(join(root, file)))]; }
      catch (error) { if (error.code !== "ENOENT") throw error; return [file, "missing"]; }
    })));
  }
  for (const [mode, environment] of [
    ["babel", "env-alpha"],
    ["babel-env", "env-beta"],
    ["babel-restore", "env-alpha"],
    ["rust", "env-alpha"],
    ["rust-env", "env-beta"],
    ["rust-restore", "env-alpha"],
  ]) {
    const useRust = mode.startsWith("rust"),
      environmentOnly = mode.includes("-"),
      backend = useRust ? "rust" : "babel",
      trace = join(output, mode + "-boundary.jsonl"),
      events = join(output, mode + "-events.jsonl");
    await writeFile(trace, "");
    await writeFile(events, "");
    const appProbe = `src/rust-eligible-${backend}.ts`,
      dependencyProbe = `@crumbs/rust-eligible-${backend}`;
    if (!environmentOnly) {
    await put(
      appProbe,
      `import {marker} from "${dependencyProbe}";export const eligibleMarker=marker;\n`,
    );
    await put(
      `node_modules/${dependencyProbe}/package.json`,
      JSON.stringify({
        name: dependencyProbe,
        version: "1.0.0",
        main: "index.js",
      }),
    );
    await put(
      `node_modules/${dependencyProbe}/index.js`,
      'exports.marker="eligible-rust-dependency";\n',
    );
    await put(
      "src/rust-probe.ts",
      entry +
        `\nimport {eligibleMarker} from "./rust-eligible-${backend}";console.log(eligibleMarker);\n`,
    );

    await put(
      "app.json",
      JSON.stringify(
        {
          ...app,
          expo: {
            ...app.expo,
            experiments: {
              ...app.expo.experiments,
              noxcturnalTransformWorker: useRust,
            },
          },
        },
        null,
        2,
      ),
    );
    }
    const invariantInputs = await inputHashes();
    if (environmentOnly) assertEnvironmentOnlyInputs(primedInputs.get(backend), invariantInputs);
    const port = await new Promise((resolve, reject) => {
      const server = createServer();
      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const p = server.address().port;
        server.close(() => resolve(p));
      });
    });
    const fd = openSync(join(output, mode + "-metro.log"), "w");
    child = spawn(
      "node",
      [
        join(root, "node_modules/.bin/expo"),
        "start",
        "--port",
        String(port),
        "--max-workers",
        "2",
        ...(mode === "babel" ? ["--clear"] : []),
      ],
      {
        cwd: root,
        env: {
          ...env,
          LOG_EVENTS: events,
          CRUMBS_SDK_TRACE: trace,
          EXPO_PUBLIC_CRUMBS_SDK_PROBE: environment,
        },
        stdio: ["ignore", fd, fd],
      },
    );
    closeSync(fd);
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (child.exitCode !== null) throw Error(`Metro exited: ${mode}`);
      try {
        if ((await fetch(`http://127.0.0.1:${port}/status`)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await pause(250);
    }
    if (!ready) throw Error("Metro readiness timeout");
    const url = `http://127.0.0.1:${port}/src/rust-probe.bundle?platform=ios&dev=true&minify=false&lazy=false`;
    const fetchBundle = async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
      const text = await res.text();
      if (!res.ok) throw Error(text.slice(0, 2400));
      return text;
    };
    const readTrace = async () => {
      const text = await readFile(trace, "utf8");
      return text.trim() ? text.trim().split("\n").map(JSON.parse) : [];
    };
    const latest = (rows) =>
      rows
        .filter(
          (r) =>
            r.kind === "generated" && r.file.endsWith("src/rust-probe.css.ts"),
        )
        .at(-1);
    const initial = await fetchBundle();
    const before = await readTrace();
    const generated = latest(before) ?? baselineGenerated;
    if (!generated) throw Error("No Crumbs generated module");
    baselineGenerated ??= generated;
    verifyHostSemantics(generated.code);
    if (
      before.filter(
        (r) =>
          r.kind === "compiled" && r.file.endsWith("src/rust-probe.css.ts"),
      ).length > 1
    )
      throw Error("Expected at most one Crumbs compile per initial miss");
    if (
      !before.filter((r) => r.kind === "compiled").every((r) => r.hasMetadata)
    )
      throw Error("Native metadata lost");
    initialHashes.push({ mode, sha256: generated.sha256 });
    await fetchBundle();
    if (
      (await readTrace()).filter((r) => r.kind !== "graph-inspection")
        .length !== before.filter((r) => r.kind !== "graph-inspection").length
    )
      throw Error("Warm request unnecessarily transformed native styles");
    if (!initial.includes(environment))
      throw Error("Environment cache invalidation failed");
    const steps = [];
    async function changed(label, edit, want) {
      const oldCount = (await readTrace()).filter(
        (r) =>
          r.kind === "generated" && r.file.endsWith("src/rust-probe.css.ts"),
      ).length;
      await edit();
      let success = false;
      let text;
      for (let i = 0; i < 25; i++) {
        await pause(150);
        try {
          text = await fetchBundle();
        } catch (error) {
          await writeFile(
            join(output, mode + "-transient-error.txt"),
            String(error),
          );
          continue;
        }
        const traceRows = await readTrace();
        const now = latest(traceRows);
        const count = traceRows.filter(
          (r) =>
            r.kind === "generated" && r.file.endsWith("src/rust-probe.css.ts"),
        ).length;
        if (now && want(now.code, text) && count > oldCount) {
          success = true;
          break;
        }
      }
      if (!success) throw Error(`Stale Crumbs output: ${mode}/${label}`);
      const generatedSha256 = latest(await readTrace()).sha256;
      if (mode === "babel") stepHashes.set(label, generatedSha256);
      else if (stepHashes.get(label) !== generatedSha256)
        throw Error(`Generated payload differs: ${label}`);
      steps.push({ label, generatedSha256, bundleSha256: hash(text) });
      console.log(JSON.stringify({ mode, label }));
      await writeFile(
        join(output, mode + "-steps.json"),
        JSON.stringify(steps, null, 2),
      );
    }
    if (!environmentOnly) {
      await changed(
        "plain-token",
        () => put("src/rust-probe-token.ts", "export const padding=30000+2;\n"),
        (code) => /30002/.test(code),
      );
      await changed(
        "nested-css",
        () =>
          put(
            "src/rust-probe-base.css.ts",
            'import {viewStyle} from "@opsydyn/crumbs-css/style";export const base=viewStyle({margin:31000+3});\n',
          ),
        (code) => /31003/.test(code),
      );
      await changed(
        "created-resolution-candidate",
        () =>
          put("src/rust-probe-optional.ts", "export const border=33000+4;\n"),
        (code) => /33004/.test(code),
      );
      await changed(
        "deleted-resolution-candidate",
        () => rm(join(root, "src/rust-probe-optional.ts")),
        (code) => /33001/.test(code) && !/33004/.test(code),
      );
      await changed(
        "theme-css",
        () =>
          put(
            "src/rust-probe-theme.css.ts",
            themeSource.replace("34000+1", "34000+5"),
          ),
        (code) => /34005/.test(code),
      );
      await changed(
        "direct-entry",
        () => put("src/rust-probe.css.ts", style.replace("#3559c7", "#3659c7")),
        (code) => code.includes("#3659c7"),
      );
      await changed(
        "runtime-factory",
        () =>
          put(
            "node_modules/@crumbs/rust-probe/index.js",
            runtime.replace("factory-before", "factory-after"),
          ),
        (code, bundle) => bundle.includes("factory-after"),
      );
      await changed(
        "restore",
        async () => {
          await put(
            "src/rust-probe-token.ts",
            "export const padding=30000+1;\n",
          );
          await put(
            "src/rust-probe-base.css.ts",
            'import {viewStyle} from "@opsydyn/crumbs-css/style"; export const base=viewStyle({margin:31000+1});\n',
          );
          styleSource = style;
          await put("src/rust-probe-theme.css.ts", themeSource);
          await put("src/rust-probe.css.ts", style);
          await put("node_modules/@crumbs/rust-probe/index.js", runtime);
        },
        (code) => hash(code) === generated.sha256,
      );
    }
    const mapResponse = await fetch(url.replace(".bundle?", ".map?"), {
      signal: AbortSignal.timeout(120000),
    });
    if (!mapResponse.ok) throw Error("Source map unavailable");
    const mapText = await mapResponse.text();
    const sourceMap = JSON.parse(mapText);
    await writeFile(join(output, mode + "-map.json"), mapText);
    const hostSemantics = verifyHostSemantics(
      latest(await readTrace())?.code ?? generated.code,
    );
    const authoredLocations = verifyAuthoredMap(sourceMap);
    const maps = sourceMap.sections
      ? sourceMap.sections.map((s) => s.map)
      : [sourceMap];
    const sources = maps.flatMap((m) => m.sources ?? []);
    if (
      !sources.some((s) => s.endsWith("src/rust-probe.css.ts")) ||
      !sources.some((s) => s.endsWith("src/rust-probe.ts"))
    )
      throw Error("Probe source locations missing");
    await stop();
    await pause(100);
    const allEvents = (await readFile(events, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse);
    const rust = useRust
      ? environmentOnly ? summarizeRustWorkerEvents(allEvents) : assertRustWorkerEvidence(allEvents, {
          app: appProbe,
          dependency: `node_modules/${dependencyProbe}/index.js`,
        })
      : null;
    if (
      !useRust &&
      allEvents.some(
        (e) => e._e === "transform:noxcturnal:full" && e.status === "complete",
      )
    )
      throw Error("Babel control unexpectedly used Rust");
    const productionTrace = join(output, mode + "-production-boundary.jsonl"),
      productionEvents = join(output, mode + "-production-events.jsonl");
    await writeFile(productionTrace, "");
    await writeFile(productionEvents, "");
    const productionDir = join(root, "dist", "sdk58-" + mode),
      fdProd = openSync(join(output, mode + "-production.log"), "w");
    await rm(productionDir, { recursive: true, force: true });
    child = spawn(
      "node",
      [
        join(root, "node_modules/.bin/expo"),
        "export",
        "--platform",
        "all",
        "--source-maps",
        "--max-workers",
        "2",
        "--output-dir",
        productionDir,
      ],
      {
        cwd: root,
        env: {
          ...env,
          CI: "1",
          LOG_EVENTS: productionEvents,
          CRUMBS_SDK_TRACE: productionTrace,
          EXPO_PUBLIC_CRUMBS_SDK_PROBE: environment,
        },
        stdio: ["ignore", fdProd, fdProd],
      },
    );
    closeSync(fdProd);
    const code = await new Promise((resolve, reject) => {
      child.once("exit", resolve);
      child.once("error", reject);
    });
    child = undefined;
    if (code !== 0) throw Error(`Production export failed: ${mode}`);
    const productionRows = (await readFile(productionTrace, "utf8"))
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse),
      productionModule = latest(productionRows) ?? baselineProduction;
    baselineProduction ??= productionModule;
    if (
      !productionModule ||
      productionModule.code.includes("export const __crumbsDev")
    )
      throw Error("Production style metadata leaked or missing compile");
    const productionRuntime = await verifyRuntimeBundles(productionDir);
    const productionLocations = [];
    for (const bundle of productionRuntime) {
      const map = JSON.parse(await readFile(bundle.file, "utf8"));
      productionLocations.push({
        file: bundle.file,
        ...verifyAuthoredMap(map),
      });
    }
    const webBundle = productionRuntime.find((bundle) =>
      bundle.file.endsWith(".js.map"),
    );
    if (
      !webBundle ||
      !(await readFile(webBundle.file.slice(0, -4), "utf8")).includes(
        environment,
      )
    )
      throw Error("Production environment output stayed stale");
    const productionEventRows = (await readFile(productionEvents, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse);
    const productionRust = useRust
      ? environmentOnly ? summarizeRustWorkerEvents(productionEventRows) : assertRustWorkerEvidence(productionEventRows, {
          app: appProbe,
          dependency: `node_modules/${dependencyProbe}/index.js`,
        })
      : null;
    const finalInputs = await inputHashes();
    if (environmentOnly) assertEnvironmentOnlyInputs(invariantInputs, finalInputs);
    else primedInputs.set(backend, finalInputs);
    records.push({
      mode,
      environmentOnly: environmentOnly ? { primedBy: backend, inputSha256: invariantInputs, unchangedThroughExport: true, restored: mode.endsWith("restore") } : false,
      workerEvidence: environmentOnly ? "cache-only cohort; fresh eligible-module acceptance belongs to " + backend : "fresh eligible app and dependency modules required",
      environment,
      hostSemantics,
      production: {
        generatedSha256: productionModule.sha256,
        debugMetadata: false,
        initialCompileCount: productionRows.filter(
          (r) =>
            r.kind === "compiled" && r.file.endsWith("src/rust-probe.css.ts"),
        ).length,
        runtimeBundles: productionRuntime,
        authoredLocations: productionLocations,
        rustFiles: productionRust?.rustFiles.length ?? 0,
        styleRouting: productionRust && {
          rust: productionRust.rustFiles.filter((file) =>
            file.endsWith("src/rust-probe.css.ts"),
          ),
          fallbacks: productionRust.fallbacks.filter((row) =>
            row.file.endsWith("src/rust-probe.css.ts"),
          ),
        },
      },
      initialGeneratedSha256: generated.sha256,
      initialBundleSha256: hash(initial),
      initialCompileCount: before.filter(
        (r) =>
          r.kind === "compiled" && r.file.endsWith("src/rust-probe.css.ts"),
      ).length,
      sourceMap: {
        authoredLocations,
        sha256: hash(mapText),
        probeSources: sources.filter((s) => s.includes("rust-probe")),
      },
      steps,
      rust: rust && {
        completeFiles: rust.rustFiles.length,
        styleRouting: {
          rust: rust.rustFiles.filter((file) =>
            file.endsWith("src/rust-probe.css.ts"),
          ),
          fallbacks: rust.fallbacks.filter((row) =>
            row.file.endsWith("src/rust-probe.css.ts"),
          ),
        },
        fallbacks: rust.fallbacks,
      },
    });
    await writeFile(
      join(output, "qualification.json"),
      JSON.stringify(
        {
          consumer: root,
          workers,
          protocol: "Diagnostic boundary wrapper; not performance evidence",
          records,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      JSON.stringify({
        mode,
        steps: steps.length,
        rustFiles: rust?.rustFiles.length,
      }),
    );
  }
  if (new Set(initialHashes.map((r) => r.sha256)).size !== 1)
    throw Error("Pre-upstream Crumbs payload differs between modes");
} finally {
  await stop();
  for (const [file, bytes] of [...originals].reverse()) {
    if (bytes === null) await rm(join(root, file), { force: true });
    else await writeFile(join(root, file), bytes);
  }
}
