import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createRequire } from "node:module";
import { verifyInstalledArtifact, verifyExpoBundleInventory, assertNoWorkspaceOrLinkDependencies } from "./packed-distribution-contract";
import { verifyPackedExportMap } from "./packed-export-contract";
import { auditPackedRuntimeEntrypoints } from "./packed-runtime-graph";
const repository = resolve(import.meta.dir, "..");
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
export function assertM112SourceStable(before: string, after: string) {
    if (before !== after)
        throw Error("Source changed during M11.2 qualification");
}
export function assertM112InstalledRoot(consumer: string, installed: string) {
    if (resolve(installed) !== resolve(consumer, "node_modules/@opsydyn/crumbs-css"))
        throw Error("Installed Crumbs package escaped the owned consumer");
}
export function m112Acceptance(states: {
    host: "passed" | "failed" | "not-run";
    ios: "passed" | "failed" | "not-run";
    android: "passed" | "failed" | "not-run";
}) { return Object.values(states).some(s => s === "failed") ? "failed" : Object.values(states).every(s => s === "passed") ? "passed" : "incomplete"; }
export async function m112SourceIdentity() {
    const process = Bun.spawn(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: repository, stdout: "pipe", stderr: "pipe" });
    const files = (await new Response(process.stdout).text()).split("\0").filter(file => /^(?:packages\/css\/(?:src|fixtures|test|bench)\/|scripts\/|apps\/(?:storybook|playground)\/(?:src|test)\/)/.test(file) || ["bun.lock", "package.json", "packages/css/package.json", "packages/css/tsdown.config.ts", "packages/css/build-policy.ts", "apps/storybook/tsconfig.json", "apps/playground/tsconfig.json", "apps/storybook/metro.config.js", "apps/playground/metro.config.js"].includes(file)).sort();
    if (await process.exited !== 0)
        throw Error("Cannot read source inventory");
    const hashes = await Promise.all(files.map(async (path) => ({ path, sha256: sha(await readFile(join(repository, path))) })));
    return { digest: sha(JSON.stringify(hashes)), files: hashes };
}
export function assertM112OwnedRoot(entries: readonly string[], marker: unknown) { if (!marker && entries.length)
    throw Error("Consumer root is nonempty and has no M11.2 ownership record"); }
export function assertM112ArtifactIdentity(expected: string, actual: string) { if (expected !== actual)
    throw Error("Tarball identity changed"); }
// Metro checks each source extension in order: .css.ts wins over .css.native.js.
// Keep the authored input outside the delivery tree after its installed typecheck.
export async function relocateM112AuthoredStyle(consumer: string, expected: string) {
    const source = join(consumer, "src/container-panel.css.ts");
    if (sha(await readFile(source)) !== expected) throw Error("Fixture changed: container-panel.css.ts");
    await mkdir(join(consumer, "authoring"), { recursive: true });
    await cp(source, join(consumer, "authoring/container-panel.css.ts"));
    await unlink(source);
}
export async function restoreM112AuthoredStyle(consumer: string, expected: string) {
    const source = join(consumer, "src/container-panel.css.ts");
    try { await readFile(source); return; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const archive = join(consumer, "authoring/container-panel.css.ts");
    if (sha(await readFile(archive)) !== expected) throw Error("Fixture changed: container-panel.css.ts");
    await cp(archive, source);
}
type Command = {
    command: readonly string[];
    cwd: string;
    exitCode: number;
    log: string;
    status: "passed" | "failed";
};
async function qualify(args: string[]) {
    let prepareOnly = false, output = resolve(repository, "docs/evidence/2026-10-09-m11-2-container-conditions/host"), consumer: string | undefined;
    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        if (flag === "--prepare-only")
            prepareOnly = true;
        else if (flag === "--output" && args[i + 1])
            output = resolve(args[++i]!);
        else if (flag === "--consumer-root" && args[i + 1])
            consumer = resolve(args[++i]!);
        else
            throw Error("Usage: m11-2-qualification.ts [--prepare-only] [--output directory] [--consumer-root owned-directory]");
    }
    await mkdir(output, { recursive: true });
    consumer ??= await mkdtemp(join(tmpdir(), "crumbs-m11-2-consumer-"));
    const before = await m112SourceIdentity(), commands: Command[] = [];
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
    let receipt: Record<string, unknown> = { schema: "crumbs.m11.2.qualification.v1", base, workingTree, sourceBefore: before, consumerRoot: consumer, commands, host: "not-run", native: { ios: "not-run", android: "not-run" }, acceptance: "incomplete" };
    try {
        await mkdir(consumer, { recursive: true });
        const marker = join(consumer, ".m11-2-owned.json");
        let owned: {
            source: string;
            lockHash: string;
            copiedFiles: {
                path: string;
                sha256: string;
            }[];
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
            assertM112OwnedRoot(await readdir(consumer), owned);
            const artifacts = join(consumer, "artifacts");
            await mkdir(artifacts);
            const pack = JSON.parse(await run(["npm", "pack", "--ignore-scripts", "--json", "--pack-destination", artifacts], join(repository, "packages/css"), "pack"))[0];
            const tarball = join(artifacts, pack.filename), artifact = { name: pack.name, version: pack.version, tarball, sha256: sha(await readFile(tarball)) };
            const template = join(repository, "packages/css/fixtures/packed-distribution/app"), manifest = JSON.parse(await readFile(join(template, "package.json"), "utf8"));
            delete manifest.dependencies["@acme/design-tokens"];
            delete manifest.dependencies["@acme/ui"];
            manifest.devDependencies.jsdom = "26.1.0";
            manifest.name = "crumbs-m11-2-installed-consumer";
            manifest.dependencies[artifact.name] = `file:${tarball}`;
            assertNoWorkspaceOrLinkDependencies(manifest);
            await writeFile(join(consumer, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
            await mkdir(join(consumer, "src"));
            await mkdir(join(consumer, "test"));
            for (const filename of ["local-theme.ts", "local-vars.css.ts", "local-vars.styles.d.ts", "local-vars-model.ts", "LocalVarsPanel.tsx", "LocalVarsApp.tsx", "ContainerApp.tsx", "containers.types.tsx"])
                await cp(join(template, "src", filename), join(consumer, "src", filename));
            for (const filename of ["container-definitions.ts", "container-model.ts", "container-panel.css.ts", "ContainerPanel.tsx"])
                await cp(join(repository, "apps/storybook/src/components/container-conditions", filename), join(consumer, "src", filename));
            await cp(join(template, "test/local-vars.integration.tsx"), join(consumer, "test/local-vars.integration.tsx"));
            for (const file of ["containers.integration.tsx", "containers.node.mjs", "containers.registry.node.mjs", "containers.hydration.mjs"])
                await cp(join(template, "test", file), join(consumer, "test", file));
            await cp(join(template, "tsconfig.json"), join(consumer, "tsconfig.json"));
            await writeFile(join(consumer, "index.js"), 'import {registerRootComponent} from "expo"; import App from "./src/ContainerApp"; registerRootComponent(App);\n');
            await writeFile(join(consumer, "app.json"), JSON.stringify({ expo: { name: "Crumbs Container Conditions", slug: "crumbs-m11-2", scheme: "crumbs-m11-2", ios: { bundleIdentifier: "dev.crumbs.m112" }, android: { package: "dev.crumbs.m112" }, web: { bundler: "metro", output: "single" } } }, null, 2));
            await writeFile(join(consumer, "metro.config.js"), 'const {getDefaultConfig}=require("expo/metro-config"); const {withNativeStyles}=require("@opsydyn/crumbs-css/metro-plugin"); const config=getDefaultConfig(__dirname); config.resolver.useWatchman=false; config.transformer={...config.transformer,upstreamTransformerPath:config.transformerPath,nativeStyles:{strictDiagnostics:true}};module.exports=withNativeStyles(config);\n');
            await run(["npm", "install", "--no-audit", "--no-fund", "--package-lock=true"], consumer, "install", { npm_config_fetch_retries: "1", npm_config_fetch_timeout: "30000" });
            const copiedFiles: {
                path: string;
                sha256: string;
            }[] = [];
            for (const dir of ["src", "test"])
                for (const file of await readdir(join(consumer, dir))) {
                    const path = join(dir, file);
                    copiedFiles.push({ path, sha256: sha(await readFile(join(consumer, path))) });
                }
            for (const path of ["package.json", "tsconfig.json", "index.js", "app.json", "metro.config.js"])
                copiedFiles.push({ path, sha256: sha(await readFile(join(consumer, path))) });
            owned = { source: before.digest, artifact, lockHash: sha(await readFile(join(consumer, "package-lock.json"))), copiedFiles };
            await writeFile(marker, JSON.stringify(owned, null, 2));
        }
        assertM112SourceStable(owned.source, before.digest);
        assertM112ArtifactIdentity(owned.artifact.sha256, sha(await readFile(owned.artifact.tarball)));
        if (sha(await readFile(join(consumer, "package-lock.json"))) !== owned.lockHash)
            throw Error("Generated lock identity changed");
        const authoredStyle = owned.copiedFiles.find(file => file.path === "src/container-panel.css.ts")!;
        await restoreM112AuthoredStyle(consumer, authoredStyle.sha256);
        for (const file of owned.copiedFiles)
            if (sha(await readFile(join(consumer, file.path))) !== file.sha256)
                throw Error(`Fixture changed: ${file.path}`);
        if (!prepareOnly) {
            await run(["npm", "ci", "--no-audit", "--no-fund"], consumer, "locked-reproduction");
            if (sha(await readFile(join(consumer, "package-lock.json"))) !== owned.lockHash)
                throw Error("Locked reproduction changed package-lock.json");
        }
        const installed = await verifyInstalledArtifact(consumer, owned.artifact);
        assertM112InstalledRoot(await realpath(consumer), await realpath(installed.packageRoot));
        const resolutions = await verifyPackedExportMap(installed.packageRoot, consumer);
        if (!resolutions.some(row => row.subpath === "./theme/containers"))
            throw Error("Missing installed container runtime entry");
        const graphs = await auditPackedRuntimeEntrypoints(installed.packageRoot);
        const entryHashes = await Promise.all([...new Set(graphs.flatMap(g => g.files))].sort().map(async (path) => ({ path, sha256: sha(await readFile(join(installed.packageRoot, path))) })));
        const unpacked = join(consumer, "artifact-unpacked");
        await mkdir(unpacked, { recursive: true });
        await run(["tar", "-xzf", owned.artifact.tarball, "--strip-components=1", "-C", unpacked], consumer, "unpack-control");
        const artifactHashes: {
            path: string;
            sha256: string;
        }[] = [];
        async function inventory(directory: string) {
            for (const entry of await readdir(directory, { withFileTypes: true })) {
                const file = join(directory, entry.name);
                if (entry.isDirectory())
                    await inventory(file);
                else if (entry.isFile()) {
                    const path = relative(unpacked, file), expected = sha(await readFile(file)), actual = sha(await readFile(join(installed.packageRoot, path)));
                    if (expected !== actual)
                        throw Error(`Installed artifact differs from tarball: ${path}`);
                    artifactHashes.push({ path, sha256: expected });
                }
                else
                    throw Error("Unsupported packed artifact entry");
            }
        }
        await inventory(unpacked);
        const tools = await run(["node", "--version"], consumer, "node-version");
        const require = createRequire(join(consumer, "package.json"));
        const versions = Object.fromEntries(["expo", "react", "react-native", "react-test-renderer", "typescript"].map(name => [name, require(`${name}/package.json`).version]));
        receipt = { ...receipt, artifact: owned.artifact, installed, entryHashes, artifactHashes, graphs, copiedFiles: owned.copiedFiles, versions: { node: tools, bun: Bun.version, ...versions }, lockHash: sha(await readFile(join(consumer, "package-lock.json"))) };
        if (!prepareOnly) {
            const transformer = await import(join(installed.packageRoot, "dist/transformer.mjs"));
            const transformed = await transformer.transformCssTsToStyleSheetWithManifestSidecar(join(consumer, "src/local-vars.css.ts"), consumer, { useStyleSheet: false, includeStyleExplanations: false });
            const containerStyles = await transformer.transformCssTsToStyleSheet(join(consumer, "src/container-panel.css.ts"), consumer, { useStyleSheet: false });
            await writeFile(join(consumer, "src/container-panel.css.web.js"), containerStyles);
            const nativeContainerStyles=await transformer.transformCssTsToStyleSheet(join(consumer,"src/container-panel.css.ts"),consumer,{useStyleSheet:true,includeStyleExplanations:false});
            await writeFile(join(consumer,"src/container-panel.css.native.js"),nativeContainerStyles);
            await writeFile(join(output,"container-compilation.json"),JSON.stringify({source:sha(await readFile(join(consumer,"src/container-panel.css.ts"))),web:sha(containerStyles),native:sha(nativeContainerStyles),compiler:installed.packageRoot,route:"installed compiler; standard Metro platform-file resolution; shared Panel source unchanged"},null,2)+"\n");
            await writeFile(join(consumer, "src/container-panel.node.mjs"), containerStyles);
            await writeFile(join(consumer, "src/container-panel.node.cjs"), containerStyles.replace(/export const (\w+) =/g, "exports.$1 ="));
            const code = transformed.code;
            if (transformed.sidecar.localVariables?.$$type !== "crumbs.css.local-variable-dependencies" || transformed.sidecar.localVariables.version !== 1 || transformed.sidecar.localVariables.definitions.length !== 2)
                throw Error("Invalid local-variable manifest companion");
            await writeFile(join(output, "local-variable-manifest.json"), JSON.stringify(transformed.sidecar, null, 2) + "\n");
            await writeFile(join(consumer, "src/local-vars.styles.web.js"), code);
            await writeFile(join(consumer, "src/local-vars.styles.native.js"), code);
            // Node 22 cannot evaluate TypeScript dependency modules. Keep the test shim
            // limited to transpiling the installed fixture's token module, without aliases.
            const ts = require("typescript"), themeSource = await readFile(join(consumer, "src/local-theme.ts"), "utf8");
            await writeFile(join(consumer, "src/local-theme.node.mjs"), ts.transpileModule(themeSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
            await writeFile(join(consumer, "src/local-theme.node.cjs"), ts.transpileModule(themeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
            await writeFile(join(consumer, "src/local-vars.styles.mjs"), code.replace('import "./local-theme.ts";', 'import "./local-theme.node.mjs";'));
            await writeFile(join(consumer, "src/local-vars.styles.cjs"), 'require("./local-theme.node.cjs");\n' + code.replace('import "./local-theme.ts";', '').replace(/export const (\w+) =/g, "exports.$1 ="));
            await writeFile(join(consumer, "src/local-vars.styles.d.ts"), 'export * from "./local-vars.css";\n');
            await run([join(consumer, "node_modules/.bin/tsc"), "--project", "tsconfig.json", "--noEmit"], consumer, "typecheck");
            await relocateM112AuthoredStyle(consumer, authoredStyle.sha256);
            receipt.delivery = { authoredStyle: { sourcePath: authoredStyle.path, retainedPath: "authoring/container-panel.css.ts", sha256: authoredStyle.sha256 }, runtimeStyles: ["src/container-panel.css.native.js", "src/container-panel.css.web.js"], reason: "Metro source extension priority; authored input retained outside runtime graph after installed typecheck" };
            const copyRoot = join(consumer, "node_modules/@m112/copy");
            await cp(unpacked, copyRoot, { recursive: true });
            for (const order of ["esm-first", "cjs-first"])
                await run(["bun", "test", "./test/containers.integration.tsx"], consumer, `containers-react-${order}`, { CRUMBS_IMPORT_ORDER: order });
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
            for (const node of [floor, Bun.which("node")!]) {
                for (const format of ["esm", "cjs"])
                    for (const copy of ["primary", "secondary"])
                        matrix.push({ node, format, copy, result: JSON.parse(await run([node, "test/containers.node.mjs", format, copy], consumer, `containers-node-${matrix.length}`)) });
                for (const format of ["esm", "cjs"]) {
                    const entry = format === "esm" ? 'await import("@opsydyn/crumbs-css/theme/containers")' : 'require("@opsydyn/crumbs-css/theme/containers")';
                    const copy = format === "esm" ? 'await import("./node_modules/@m112/copy/dist/theme-containers.mjs")' : 'require("./node_modules/@m112/copy/dist/theme-containers.cjs")';
                    const probe = 'const React=require("react"),server=require("react-dom/server");const api=' + entry + ',other=' + copy + ';const d=api.defineContainer({owner:"@fixture/ui",name:"prod",version:1,axis:"width",buckets:{small:0}});function Reader(){return React.createElement("span",null,other.useContainerValue(d,{unmeasured:"initial",small:"small"}));}function Owner(){const layout=api.useContainerLayout(d);return React.createElement(other.ContainerProvider,{layout},React.createElement(Reader));}if(server.renderToString(React.createElement(Owner))!=="<span>initial</span>")throw Error("Production context ABI mismatch");console.log(JSON.stringify({version:process.version,format:"' + format + '",status:"passed"}));';
                    // Dynamic import works in CommonJS; both copies use one production React installation.
                    await run([node, "-e", '(async()=>{' + probe + '})().catch(error=>{console.error(error);process.exitCode=1;});'], consumer, `containers-production-${format}-${node === floor ? "floor" : "current"}`, {NODE_ENV:"production"});
                }
                for (const format of ["esm", "cjs"])
                    for (const mode of ["slot-accessor", "version", "field-accessor", "react", "context", "extra", "abi-getter-_currentValue", "abi-getter-_currentValue2", "abi-getter-_currentRenderer", "abi-getter-_currentRenderer2", "abi-missing", "abi-frozen", "abi-consumer", "abi-forged"])
                        await run([node, "test/containers.registry.node.mjs", mode, format], consumer, `registry-${format}-${mode}-${node === floor ? "floor" : "current"}`);
                await run([node, "test/containers.hydration.mjs"], consumer, `hydration-${node === floor ? "floor" : "current"}`);
            }
            const targets = [];
            for (const platform of ["ios", "android", "web"] as const) {
                const directory = join(consumer, "exports", platform);
                await run([join(consumer, "node_modules/.bin/expo"), "export", "--platform", platform, "--source-maps", "--output-dir", directory], consumer, `expo-${platform}`);
                targets.push({ platform, directory });
            }
            const inventories = await verifyExpoBundleInventory(targets, consumer, repository, ["@opsydyn/crumbs-css"]);
            for (const inventory of inventories)
                if (!inventory.packageSources["@opsydyn/crumbs-css"]!.some(path => path.includes("theme-containers")))
                    throw Error("Expo export did not exercise installed /theme/containers");
            receipt = { ...receipt, host: "passed", compiledLocalModuleSha256: sha(code), compiledContainerModuleSha256: sha(containerStyles), nodeMatrix: matrix, inventories, companionMetadata: code.includes("crumbs.css.local-vars-metadata") ? "passed" : "failed" };
            if (receipt.companionMetadata !== "passed")
                throw Error("Missing local companion metadata");
        }
    }
    catch (error) {
        receipt = { ...receipt, host: "failed", error: String(error) };
        throw error;
    }
    finally {
        const after = await m112SourceIdentity();
        receipt = { ...receipt, sourceAfter: after, commands, completedAt: new Date().toISOString() };
        if (before.digest !== after.digest)
            receipt = { ...receipt, host: "failed", error: "Source changed during qualification" };
        await writeFile(join(output, "qualification.json"), JSON.stringify(receipt, null, 2) + "\n");
        assertM112SourceStable(before.digest, after.digest);
    }
    console.log(JSON.stringify({ consumerRoot: consumer, output, host: receipt.host, acceptance: receipt.acceptance }));
}
if (import.meta.main)
    await qualify(process.argv.slice(2));
