import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { assertRustWorkerEvidence, summarizeRustWorkerEvents, assertAppWorkerFallbackEvidence } from "./sdk-worker-evidence";
import { verifyRuntimeBundles } from "./runtime-bundle-contract";

// Real workspace entries, actual upstream events, and a fresh app/mode cache.
const [app, worker, output] = process.argv.slice(2);
if (!["playground", "storybook"].includes(app!) || !["babel", "rust"].includes(worker!) || !output || process.argv.length !== 5)
  throw new Error("Expected: expo-app-workers.ts playground|storybook babel|rust /absolute/fresh-output");
if (!output.startsWith("/")) throw new Error("Qualification output must be absolute");
const repo = resolve(import.meta.dir, ".."), root = join(repo, "apps", app!);
await mkdir(output, { recursive: false });
const appRequire = createRequire(join(root, "package.json"));
const defaultConfig = appRequire("expo/metro-config").getDefaultConfig(root);
const upstreamRequire = createRequire(defaultConfig.transformerPath);
const config = appRequire("./metro.config.js");
const events = join(output, "worker-events.jsonl"), logs = join(output, "export.log");
const report: Record<string, unknown> = {
  schema: "crumbs.m1.10b.app-worker.v1", app, worker, recordedAt: new Date().toISOString(),
  node: Bun.spawnSync(["node", "--version"], { stdout: "pipe" }).stdout.toString().trim(),
  sourceRevision: Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repo, stdout: "pipe" }).stdout.toString().trim(),
  versions: Object.fromEntries(["expo", "react", "react-native", "react-native-web"].map(name => [name, appRequire(name + "/package.json").version])),
  workers: { supervising: defaultConfig.transformerPath, custom: config.transformerPath, savedUpstream: config.transformer.upstreamTransformerPath, metro: upstreamRequire("metro/package.json").version },
  boundary: "Workspace export/actual-worker evidence; not native interaction or performance acceptance", passed: false,
};
const sourceFiles = ["package.json", "app.json", "app.config.js", "babel.config.js", "metro.config.js", "index.js"];
report.inputSha256 = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, createHash("sha256").update(await readFile(join(root, file))).digest("hex")])));
const args = ["node", appRequire.resolve("expo/bin/cli"), "export", "--platform", "all", "--source-maps", "--max-workers", "2", "--output-dir", join(output, "dist")];
report.command = args;
try {
  const child = Bun.spawn(args, { cwd: root, env: {
    ...process.env, CI: "1", EXPO_NO_TELEMETRY: "1", EXPO_NO_METRO_WORKSPACE_ROOT: "1",
    CRUMBS_METRO_WORKER: worker, EXPO_PUBLIC_STORYBOOK_ENABLED: app === "storybook" ? "true" : "false",
    STORYBOOK_DISABLE_TELEMETRY: "1", LOG_DEBUG: "transform:*", LOG_EVENTS: events,
    EXPO_METRO_CACHE_OUTPUT_DIR: join(output, "metro-cache"),
  }, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  await writeFile(logs, stdout + "\n" + stderr); report.exitCode = exitCode;
  if (exitCode !== 0) throw new Error(`App export failed; see ${logs}`);
  const records = (await readFile(events, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
  const evidence = worker === "rust" ? assertRustWorkerEvidence(records, {
    app: app === "playground" ? "src/RuntimeExtensionPanel.tsx" : "src/components/ShowcaseCard.tsx",
    dependency: "node_modules/react/jsx-runtime.js",
  }) : summarizeRustWorkerEvents(records);
  if (worker === "rust") assertAppWorkerFallbackEvidence(records, app as "playground" | "storybook");
  if (worker === "babel" && evidence.rustFiles.length) throw new Error("Babel control executed Rust");
  report.backend = { rustFiles: evidence.rustFiles, fallbacks: evidence.fallbacks };
  report.runtimeBundles = await verifyRuntimeBundles(join(output, "dist"), { storybook: app === "storybook" });
  if (report.workers && (report.workers as { metro: string }).metro !== "0.87.1") throw new Error("Unexpected actual Metro version");
  report.passed = true;
} catch (error) { report.failure = String(error); throw error; }
finally { await writeFile(join(output, "qualification.json"), JSON.stringify(report, null, 2) + "\n"); }
console.log(`${app}/${worker} actual worker and iOS/Android/web runtime graphs passed`);
