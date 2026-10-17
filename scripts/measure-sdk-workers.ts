import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { openSync, closeSync } from "node:fs";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import {
  assertRustWorkerEvidence,
  summarizeRustWorkerEvents,
} from "./sdk-worker-evidence";
import { assertRuntimeBundleSources } from "./runtime-bundle-contract";

// Matched installed consumers; timing is separate from backend instrumentation.
const [sdk57File, sdk58File, outputArg] = process.argv.slice(2);
if (!sdk57File || !sdk58File || !outputArg || process.argv.length !== 5)
  throw Error(
    "Expected SDK57 receipt, SDK58 receipt and fresh absolute output",
  );
const output = resolve(outputArg);
await mkdir(output, { recursive: false });
const receipts = await Promise.all(
  [sdk57File, sdk58File].map(async (file) =>
    JSON.parse(await readFile(file, "utf8")),
  ),
);
const tarball = receipts[0].crumbs.tarballSha256;
if (
  receipts.some(
    (r) => r.contractPassed !== true || r.crumbs.tarballSha256 !== tarball,
  ) ||
  receipts[0].sdk !== 57 ||
  receipts[1].sdk !== 58
)
  throw Error("Matched qualified SDK57/58 artifact required");
const roots = new Map<number, string>(receipts.map((r) => [r.sdk, r.consumer]));
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const controls = [
  { sdk: 57, worker: "babel" },
  { sdk: 58, worker: "babel" },
  { sdk: 58, worker: "rust" },
] as const;
const changes = new Map<string, string | undefined>();
const observations: any[] = [];
const backend: any[] = [];
const before = "12345.375",
  after = "12346.625";
async function put(root: string, file: string, content: string) {
  const path = join(root, file);
  if (!changes.has(path)) {
    try {
      changes.set(path, await readFile(path, "utf8"));
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
      changes.set(path, undefined);
    }
  }
  await writeFile(path, content);
}
async function port() {
  const server = createServer();
  await new Promise<void>((yes, no) => {
    server.once("error", no);
    server.listen(0, "127.0.0.1", yes);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw Error("No owned port");
  await new Promise<void>((yes, no) =>
    server.close((e) => (e ? no(e) : yes())),
  );
  return address.port;
}
async function pause(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}
async function get(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  const code = await response.text();
  if (!response.ok)
    throw Error(
      `Bundle request failed ${response.status}: ${code.slice(0, 500)}`,
    );
  return code;
}
function sources(map: any): string[] {
  return [
    ...(map.sources ?? []),
    ...(map.sections ?? []).flatMap((s: any) => sources(s.map)),
  ];
}
function median(values: number[]) {
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length / 2) - 1];
}
function hasCompiledPadding(code: string, value: string) {
  const number = value.replaceAll(".", "\\.");
  return ["Top", "Right", "Bottom", "Left"].every((edge) =>
    new RegExp(`["']?padding${edge}["']?\\s*:\\s*${number}(?![0-9.])`).test(
      code,
    ),
  );
}
if (
  hasCompiledPadding(`export const padding=${after}`, after) ||
  hasCompiledPadding(
    `const style={paddingTop:${before},paddingRight:${before},paddingBottom:${before},paddingLeft:${before}};export const padding=${after}`,
    after,
  )
)
  throw Error("Compiled-style check accepted a plain token or stale style");
async function run(
  sdk: number,
  worker: string,
  name: string,
  instrumented: boolean,
) {
  const root = roots.get(sdk)!,
    req = createRequire(join(root, "package.json")),
    folder = join(output, name);
  await mkdir(folder);
  const fd = openSync(join(folder, "metro.log"), "w"),
    ownedPort = await port(),
    base = `http://127.0.0.1:${ownedPort}`;
  const url =
    base + "/index.bundle?platform=ios&dev=false&minify=false&runModule=true";
  const env = {
    ...process.env,
    CI: "0",
    NODE_OPTIONS: "--dns-result-order=ipv4first",
    EXPO_NO_TELEMETRY: "1",
    EXPO_NO_METRO_WORKSPACE_ROOT: "1",
    CRUMBS_METRO_WORKER: worker,
    CRUMBS_MATCHED_CACHE: join(folder, "metro-cache"),
    CRUMBS_MATCHED_FILE_MAP: join(folder, "file-map"),
    EXPO_METRO_CACHE_OUTPUT_DIR: join(folder, "cache"),
  };
  delete (env as any).LOG_EVENTS;
  delete (env as any).LOG_DEBUG;
  if (instrumented)
    Object.assign(env, {
      LOG_DEBUG: "transform:*",
      LOG_EVENTS: join(folder, "events.jsonl"),
    });
  await put(root, "src/m110c-spacing.ts", `export const padding=${before};\n`);
  const started = performance.now();
  let child: ChildProcess | undefined;
  let shutdown = false;
  try {
    child = spawn(
      "node",
      [
        req.resolve("expo/bin/cli"),
        "start",
        "--offline",
        "--port",
        String(ownedPort),
        "--max-workers",
        "1",
      ],
      { cwd: root, env, detached: true, stdio: ["ignore", fd, fd] },
    );
    child.once("error", () => {});
    const deadline = Date.now() + 90000;
    while (true) {
      if (child.exitCode !== null || child.signalCode)
        throw Error("Owned Metro exited during startup");
      try {
        if ((await get(base + "/status")).includes("packager-status:running"))
          break;
      } catch {}
      if (Date.now() > deadline) throw Error("Owned Metro startup timeout");
      await pause(100);
    }
    const first = await get(url),
      coldMs = performance.now() - started;
    if (!hasCompiledPadding(first, before))
      throw Error("Cold bundle lacks compiled style value");
    const warm: number[] = [];
    for (let n = 0; n < 3; n++) {
      const t = performance.now(),
        code = await get(url);
      warm.push(performance.now() - t);
      if (sha(code) !== sha(first))
        throw Error("Repeated bundle identity differs");
    }
    const editStart = performance.now();
    await put(root, "src/m110c-spacing.ts", `export const padding=${after};\n`);
    let edited: string;
    const limit = Date.now() + 60000;
    while (true) {
      edited = await get(url);
      if (
        hasCompiledPadding(edited, after) &&
        !hasCompiledPadding(edited, before)
      )
        break;
      if (Date.now() > limit) throw Error("Dependency edit did not invalidate");
      await pause(25);
    }
    const editMs = performance.now() - editStart;
    if (sha(edited) === sha(first))
      throw Error("Dependency edit retained old output");
    const result = {
      sdk,
      worker,
      processId: child.pid,
      instrumented,
      coldStartupAndBundleMs: coldMs,
      repeatedBundleRequestMs: warm,
      repeatedBundleMedianMs: median(warm),
      dependencyEditMs: editMs,
      compiledPaddingVerified: {
        cold: before,
        edited: after,
        rawTokenAndStaleStyleControlsRejected: true,
      },
      initialBundleSha256: sha(first),
      editedBundleSha256: sha(edited),
    };
    if (instrumented) {
      const map = JSON.parse(
          await get(base + "/index.map?platform=ios&dev=false&minify=false"),
        ),
        graph = sources(map);
      assertRuntimeBundleSources(graph);
      let events: any[] = [];
      try {
        events = (await readFile(join(folder, "events.jsonl"), "utf8"))
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l));
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
      }
      const evidence =
        worker === "rust"
          ? assertRustWorkerEvidence(events, {
              app: "src/m110c-view.tsx",
              dependency: "node_modules/react/jsx-runtime.js",
            })
          : summarizeRustWorkerEvents(events);
      if (worker === "babel" && evidence.rustFiles.length)
        throw Error("Babel control executed Rust");
      await writeFile(
        join(folder, "backend.json"),
        JSON.stringify(
          {
            sdk,
            worker,
            rustFiles: evidence.rustFiles,
            fallbacks: evidence.fallbacks,
            moduleCount: graph.length,
          },
          null,
          2,
        ) + "\n",
      );
      backend.push({
        sdk,
        worker,
        evidence: name + "/backend.json",
        timingsExcluded: true,
      });
    } else
      observations.push({
        ...result,
        repetition: Number(name.match(/^rep-(\d+)/)![1]),
      });
    await writeFile(
      join(folder, "result.json"),
      JSON.stringify({ ...result, timingsEligible: !instrumented }, null, 2) +
        "\n",
    );
  } finally {
    if (child?.pid) {
      const exited = new Promise<void>((done) => {
        if (child!.exitCode !== null || child!.signalCode) done();
        else child!.once("exit", () => done());
      });
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (e: any) {
        if (e.code !== "ESRCH") throw e;
      }
      await Promise.race([exited, pause(10000)]);
      if (child.exitCode === null && !child.signalCode) {
        process.kill(-child.pid, "SIGKILL");
        await exited;
      }
      shutdown = true;
    }
    closeSync(fd);
    await writeFile(
      join(folder, "shutdown.json"),
      JSON.stringify({ pid: child?.pid, ownedGroupStopped: shutdown }) + "\n",
    );
  }
}
try {
  const dependencies: Record<string, unknown> = {};
  for (const [sdk, root] of roots) {
    if (!basename(root).startsWith("crumbs-playground-"))
      throw Error("Only owned staged consumers allowed");
    const req = createRequire(join(root, "package.json")),
      fromCrumbs = createRequire(
        req.resolve("@opsydyn/crumbs-css/package.json"),
      );
    const originalMetro = await readFile(join(root, "metro.config.js"), "utf8");
    if (!originalMetro.includes("module.exports = withNativeStyles(config)"))
      throw Error("Unexpected staged Metro config");
    await put(
      root,
      "metro.config.js",
      originalMetro.replace(
        "module.exports = withNativeStyles(config)",
        "config.cacheStores=[new (require('metro-cache').FileStore)({root:process.env.CRUMBS_MATCHED_CACHE})];config.fileMapCacheDirectory=process.env.CRUMBS_MATCHED_FILE_MAP;module.exports = withNativeStyles(config)",
      ),
    );
    const compiler = Object.fromEntries(
      [
        "@vanilla-extract/css",
        "@vanilla-extract/integration",
        "css-to-react-native",
        "effect",
      ].map((name) => [name, fromCrumbs(name + "/package.json").version]),
    );
    dependencies[sdk] = compiler;
    await put(
      root,
      "app.config.js",
      `module.exports=({config})=>({...config,experiments:{...config.experiments,...(${sdk}===58&&process.env.CRUMBS_METRO_WORKER==='rust'?{noxcturnalTransformWorker:true}:{})}});\n`,
    );
    await put(
      root,
      "babel.config.js",
      `module.exports=api=>{api.cache(true);return{presets:[require('expo/internal/babel-preset')]}};\n`,
    );
    await put(
      root,
      "index.js",
      `import {registerRootComponent} from 'expo';import {App} from './src/m110c-view';registerRootComponent(App);\n`,
    );
    await put(
      root,
      "src/m110c-view.tsx",
      `import {View} from 'react-native';import {panel} from './m110c-style.css';export function App(){return <View style={panel}/>};\n`,
    );
    await put(
      root,
      "src/m110c-style.css.ts",
      `import {viewStyle} from '@opsydyn/crumbs-css/style';import {padding} from './m110c-spacing';export const panel=viewStyle({padding});\n`,
    );
  }
  if (JSON.stringify(dependencies[57]) !== JSON.stringify(dependencies[58]))
    throw Error("Compiler dependency cohort differs");
  await writeFile(
    join(output, "inputs.json"),
    JSON.stringify(
      {
        tarballSha256: tarball,
        receipts: [sdk57File, sdk58File],
        dependencies,
        protocol:
          "Five independent fresh-server cohorts per SDK57 Babel/SDK58 Babel/SDK58 Rust, rotating order; cold includes CLI startup and first iOS bundle; three repeated requests per server; transitive token edit to observed compiled value; HTTP/poll overhead included. Timed workers have event instrumentation disabled. Backend evidence uses separate untimed servers. No device/FPS or internal compiler-cache-hit ratio claim.",
      },
      null,
      2,
    ) + "\n",
  );
  for (let rep = 1; rep <= 5; rep++)
    for (let n = 0; n < 3; n++) {
      const control = controls[(n + rep - 1) % 3]!;
      console.log(`rep ${rep}: SDK${control.sdk}/${control.worker}`);
      await run(
        control.sdk,
        control.worker,
        `rep-${rep}-${control.sdk}-${control.worker}`,
        false,
      );
    }
  for (const control of controls)
    await run(
      control.sdk,
      control.worker,
      `backend-${control.sdk}-${control.worker}`,
      true,
    );
  const summary = controls.map((c) => {
    const rows = observations.filter(
      (r) => r.sdk === c.sdk && r.worker === c.worker,
    );
    if (rows.length !== 5 || new Set(rows.map((r) => r.processId)).size !== 5)
      throw Error("Five independent cohorts required");
    return {
      ...c,
      repetitions: rows.length,
      coldStartupAndBundleMs: median(rows.map((r) => r.coldStartupAndBundleMs)),
      repeatedBundleMs: median(rows.map((r) => r.repeatedBundleMedianMs)),
      dependencyEditMs: median(rows.map((r) => r.dependencyEditMs)),
    };
  });
  await writeFile(
    join(output, "qualification.json"),
    JSON.stringify(
      {
        passed: true,
        observations,
        backend,
        summary,
        boundary:
          "Matched host observation; not a speedup claim, release-host gate or physical/native acceptance",
      },
      null,
      2,
    ) + "\n",
  );
} catch (error) {
  await writeFile(
    join(output, "failure.json"),
    JSON.stringify(
      { failure: String(error), observations, backend, timingsEligible: false },
      null,
      2,
    ) + "\n",
  );
  throw error;
} finally {
  for (const [path, before] of changes) {
    if (before === undefined) await rm(path, { force: true });
    else await writeFile(path, before);
  }
}
