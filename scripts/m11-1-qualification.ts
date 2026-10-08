import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createRequire } from "node:module";
import { verifyInstalledArtifact, verifyExpoBundleInventory, assertNoWorkspaceOrLinkDependencies } from "./packed-distribution-contract";
import { verifyPackedExportMap } from "./packed-export-contract";
import { auditPackedRuntimeEntrypoints } from "./packed-runtime-graph";
const repository = resolve(import.meta.dir, "..");
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
export function assertM11SourceStable(before: string, after: string) { if (before !== after)
  throw Error("Source changed during M11.1 qualification"); }
export function assertM11InstalledRoot(consumer: string, installed: string) { if (resolve(installed) !== resolve(consumer, "node_modules/@opsydyn/crumbs-css"))
  throw Error("Installed Crumbs package escaped the owned consumer"); }
export function m11Acceptance(states: {
  host: string;
  ios: string;
  android: string;
}) { return Object.values(states).some(s => s === "failed") ? "failed" : Object.values(states).every(s => s === "passed") ? "passed" : "incomplete"; }
async function sourceIdentity() {
  const process = Bun.spawn(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: repository, stdout: "pipe", stderr: "pipe" });
  const files = (await new Response(process.stdout).text()).split("\0").filter(file => /^(?:packages\/css\/(?:src|fixtures|test|bench)\/|scripts\/|apps\/(?:storybook|playground)\/(?:src|test)\/)/.test(file) || ["bun.lock", "package.json", "packages/css/package.json", "packages/css/tsdown.config.ts", "packages/css/build-policy.ts"].includes(file)).sort();
  if (await process.exited !== 0)
    throw Error("Cannot read source inventory");
  const hashes = await Promise.all(files.map(async (path) => ({ path, sha256: sha(await readFile(join(repository, path))) })));
  return { digest: sha(JSON.stringify(hashes)), files: hashes };
}
type Command = {
  command: readonly string[];
  cwd: string;
  exitCode: number;
  log: string;
  status: "passed" | "failed";
};
async function qualify(args: string[]) {
  let prepareOnly = false, output = resolve(repository, "docs/evidence/2026-10-08-m11-1-local-vars/host"), consumer: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--prepare-only")
      prepareOnly = true;
    else if (flag === "--output" && args[i + 1])
      output = resolve(args[++i]!);
    else if (flag === "--consumer-root" && args[i + 1])
      consumer = resolve(args[++i]!);
    else
      throw Error("Usage: m11-1-qualification.ts [--prepare-only] [--output directory] [--consumer-root owned-directory]");
  }
  await mkdir(output, { recursive: true });
  consumer ??= await mkdtemp(join(tmpdir(), "crumbs-m11-1-consumer-"));
  const before = await sourceIdentity(), commands: Command[] = [];
  const run = async (command: string[], cwd = consumer!, name = "command", env: Record<string, string> = {}) => {
    const child = Bun.spawn(command, { cwd, env: { ...process.env, CI: "1", EXPO_NO_METRO_WORKSPACE_ROOT: "1", ...env }, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    const log = join(output, `${commands.length}-${name}.log`);
    await writeFile(log, stdout + stderr);
    commands.push({ command, cwd, exitCode, log, status: exitCode === 0 ? "passed" : "failed" });
    if (exitCode !== 0)
      throw Error(`${name} exited ${exitCode}; see ${log}`);
    return stdout.trim();
  };
  const base = await run(["git", "rev-parse", "HEAD"], repository, "base"), workingTree = await run(["git", "status", "--short"], repository, "working-tree");
  let receipt: Record<string, unknown> = { schema: "crumbs.m11.1.qualification.v1", base, workingTree, sourceBefore: before, consumerRoot: consumer, commands, host: "not-run", native: { ios: "not-run", android: "not-run" }, acceptance: "incomplete" };
  try {
    await mkdir(consumer, { recursive: true });
    const marker = join(consumer, ".m11-1-owned.json");
    let owned: {
      source: string;
      artifact: {
        name: string;
        version: string;
        tarball: string;
        sha256: string;
      };
    } | undefined;
    try {
      owned = JSON.parse(await readFile(marker, "utf8"));
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        throw error;
    }
    if (!owned) {
      if ((await readdir(consumer)).length)
        throw Error("Consumer root is nonempty and has no M11.1 ownership record");
      const artifacts = join(consumer, "artifacts");
      await mkdir(artifacts);
      const pack = JSON.parse(await run(["npm", "pack", "--ignore-scripts", "--json", "--pack-destination", artifacts], join(repository, "packages/css"), "pack"))[0];
      const tarball = join(artifacts, pack.filename), artifact = { name: pack.name, version: pack.version, tarball, sha256: sha(await readFile(tarball)) };
      const template = join(repository, "packages/css/fixtures/packed-distribution/app"), manifest = JSON.parse(await readFile(join(template, "package.json"), "utf8"));
      delete manifest.dependencies["@acme/design-tokens"];
      delete manifest.dependencies["@acme/ui"];
      manifest.name = "crumbs-m11-1-installed-consumer";
      manifest.dependencies[artifact.name] = `file:${tarball}`;
      assertNoWorkspaceOrLinkDependencies(manifest);
      await writeFile(join(consumer, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
      await mkdir(join(consumer, "src"));
      await mkdir(join(consumer, "test"));
      for (const filename of ["local-theme.ts", "local-vars.css.ts", "local-vars.styles.d.ts", "local-vars-model.ts", "LocalVarsPanel.tsx", "LocalVarsApp.tsx"])
        await cp(join(template, "src", filename), join(consumer, "src", filename));
      await cp(join(template, "test/local-vars.integration.tsx"), join(consumer, "test/local-vars.integration.tsx"));
      await cp(join(template, "tsconfig.json"), join(consumer, "tsconfig.json"));
      await writeFile(join(consumer, "index.js"), 'import {registerRootComponent} from "expo"; import App from "./src/LocalVarsApp"; registerRootComponent(App);\n');
      await writeFile(join(consumer, "app.json"), JSON.stringify({ expo: { name: "Crumbs Local Variables", slug: "crumbs-m11-1", scheme: "crumbs-m11-1", ios: { bundleIdentifier: "dev.crumbs.m111" }, android: { package: "dev.crumbs.m111" }, web: { bundler: "metro", output: "single" } } }, null, 2));
      await writeFile(join(consumer, "metro.config.js"), 'const {getDefaultConfig}=require("expo/metro-config"); const {withNativeStyles}=require("@opsydyn/crumbs-css/metro-plugin"); const config=getDefaultConfig(__dirname); config.resolver.useWatchman=false; config.transformer={...config.transformer,upstreamTransformerPath:config.transformerPath,nativeStyles:{strictDiagnostics:true}};module.exports=withNativeStyles(config);\n');
      await run(["npm", "install", "--no-audit", "--no-fund", "--package-lock=true"], consumer, "install", { npm_config_fetch_retries: "1", npm_config_fetch_timeout: "30000" });
      owned = { source: before.digest, artifact };
      await writeFile(marker, JSON.stringify(owned, null, 2));
    }
    assertM11SourceStable(owned.source, before.digest);
    if (sha(await readFile(owned.artifact.tarball)) !== owned.artifact.sha256)
      throw Error("Tarball identity changed");
    const installed = await verifyInstalledArtifact(consumer, owned.artifact);
    assertM11InstalledRoot(await realpath(consumer), await realpath(installed.packageRoot));
    const resolutions = await verifyPackedExportMap(installed.packageRoot, consumer);
    if (!resolutions.some(row => row.subpath === "./theme/vars"))
      throw Error("Missing installed variable runtime entry");
    const graphs = await auditPackedRuntimeEntrypoints(installed.packageRoot);
    const entryHashes = await Promise.all([...new Set(graphs.flatMap(g => g.files))].sort().map(async (path) => ({ path, sha256: sha(await readFile(join(installed.packageRoot, path))) })));
    const unpacked=join(consumer,"artifact-unpacked")
    await mkdir(unpacked,{recursive:true})
    await run(["tar","-xzf",owned.artifact.tarball,"--strip-components=1","-C",unpacked],consumer,"unpack-control")
    const artifactHashes:{path:string;sha256:string}[]=[]
    async function inventory(directory:string){
      for(const entry of await readdir(directory,{withFileTypes:true})){
        const file=join(directory,entry.name)
        if(entry.isDirectory())await inventory(file)
        else if(entry.isFile()){
          const path=relative(unpacked,file),expected=sha(await readFile(file)),actual=sha(await readFile(join(installed.packageRoot,path)))
          if(expected!==actual)throw Error(`Installed artifact differs from tarball: ${path}`)
          artifactHashes.push({path,sha256:expected})
        }else throw Error("Unsupported packed artifact entry")
      }
    }
    await inventory(unpacked)

    const tools = await run(["node", "--version"], consumer, "node-version");
    const require = createRequire(join(consumer, "package.json"));
    const versions = Object.fromEntries(["expo", "react", "react-native", "react-test-renderer", "typescript"].map(name => [name, require(`${name}/package.json`).version]));
    receipt = { ...receipt, artifact: owned.artifact, installed, entryHashes, artifactHashes, graphs, versions: { node: tools, bun: Bun.version, ...versions }, lockHash: sha(await readFile(join(consumer, "package-lock.json"))) };
    if (!prepareOnly) {
      const lockBefore = await readFile(join(consumer, "package-lock.json"));
      await run(["npm", "ci", "--no-audit", "--no-fund"], consumer, "locked-reproduction");
      if (sha(lockBefore) !== sha(await readFile(join(consumer, "package-lock.json"))))
        throw Error("Locked reproduction changed package-lock.json");
      const transformer = await import(join(installed.packageRoot, "dist/transformer.mjs"));
      const transformed = await transformer.transformCssTsToStyleSheetWithManifestSidecar(join(consumer, "src/local-vars.css.ts"), consumer, { useStyleSheet: false, includeStyleExplanations: false });
      const code=transformed.code
      if(transformed.sidecar.localVariables?.$$type!=="crumbs.css.local-variable-dependencies"||transformed.sidecar.localVariables.version!==1||transformed.sidecar.localVariables.definitions.length!==2)throw Error("Invalid local-variable manifest companion")
      await writeFile(join(output,"local-variable-manifest.json"),JSON.stringify(transformed.sidecar,null,2)+"\n")
      await writeFile(join(consumer, "src/local-vars.styles.web.js"), code);
      await writeFile(join(consumer, "src/local-vars.styles.native.js"), code);
      // Node 22 cannot evaluate TypeScript dependency modules. Keep the test shim
      // limited to transpiling the installed fixture's token module, without aliases.
      const ts=require("typescript"),themeSource=await readFile(join(consumer,"src/local-theme.ts"),"utf8")
      await writeFile(join(consumer,"src/local-theme.node.mjs"),ts.transpileModule(themeSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)
      await writeFile(join(consumer,"src/local-theme.node.cjs"),ts.transpileModule(themeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)
      await writeFile(join(consumer, "src/local-vars.styles.mjs"), code.replace('import "./local-theme.ts";','import "./local-theme.node.mjs";'));
      await writeFile(join(consumer, "src/local-vars.styles.cjs"), 'require("./local-theme.node.cjs");\n'+code.replace('import "./local-theme.ts";','').replace(/export const (\w+) =/g, "exports.$1 ="));
      await writeFile(join(consumer, "src/local-vars.styles.d.ts"), 'export * from "./local-vars.css";\n');
      await run([join(consumer, "node_modules/.bin/tsc"), "--project", "tsconfig.json", "--noEmit"], consumer, "typecheck");
      for (const order of ["focused-first", "compatibility-first"])
        await run(["bun", "test", "./test/local-vars.integration.tsx"], consumer, `react-${order}`, { CRUMBS_IMPORT_ORDER: order });
      const floor = process.env.CRUMBS_NODE_FLOOR ?? "/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node";
      const matrix = [];
      for (const node of [floor, Bun.which("node")!])
        for (const format of ["cjs", "esm"]) {
          const probe = format === "cjs" ? 'const api=require("@opsydyn/crumbs-css/theme/vars");const s=require("./src/local-vars.styles.cjs");' : 'const api=await import("@opsydyn/crumbs-css/theme/vars");const s=await import("./src/local-vars.styles.mjs");';
          const script = probe + 'const a=api.assignVars({accent:s.accent,alpha:s.alpha},{accent:"#2457d6",alpha:.25});const styles=Object.freeze({card:s.card});const value=api.resolveAssignedStyles(styles,a);if(value.card.backgroundColor!=="#2457d6"||value.card.opacity!==.25||api.resolveAssignedStyles(styles,a)!==value)throw Error("Installed first-use/identity mismatch");console.log(JSON.stringify({version:process.version,exports:Object.keys(api).sort()}));';
          matrix.push({ node, format, result: JSON.parse(await run([node, ...(format === "esm" ? ["--input-type=module"] : []), "-e", script], consumer, `imports-${format}-${matrix.length}`)) });
        }
      const targets = [];
      for (const platform of ["ios", "android", "web"] as const) {
        const directory = join(consumer, "exports", platform);
        await run([join(consumer, "node_modules/.bin/expo"), "export", "--platform", platform, "--source-maps", "--output-dir", directory], consumer, `expo-${platform}`);
        targets.push({ platform, directory });
      }
      const inventories = await verifyExpoBundleInventory(targets, consumer, repository, ["@opsydyn/crumbs-css"]);
      for (const inventory of inventories)
        if (!inventory.packageSources["@opsydyn/crumbs-css"]!.some(path => path.includes("theme-vars")))
          throw Error("Expo export did not exercise installed /theme/vars");
      receipt = { ...receipt, host: "passed", compiledLocalModuleSha256:sha(code), nodeMatrix: matrix, inventories, companionMetadata: code.includes("crumbs.css.local-vars-metadata") ? "passed" : "failed" };
      if (receipt.companionMetadata !== "passed")
        throw Error("Missing local companion metadata");
    }
  }
  catch (error) {
    receipt = { ...receipt, host: "failed", error: String(error) };
    throw error;
  }
  finally {
    const after = await sourceIdentity();
    receipt = { ...receipt, sourceAfter: after, commands, completedAt: new Date().toISOString() };
    if (before.digest !== after.digest)
      receipt = { ...receipt, host: "failed", error: "Source changed during qualification" };
    await writeFile(join(output, "qualification.json"), JSON.stringify(receipt, null, 2) + "\n");
    assertM11SourceStable(before.digest, after.digest);
  }
  console.log(JSON.stringify({ consumerRoot: consumer, output, host: receipt.host, acceptance: receipt.acceptance }));
}
if (import.meta.main)
  await qualify(process.argv.slice(2));
