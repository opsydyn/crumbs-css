import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises"
import { watch } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { createRequire } from "node:module"
import { verifyRuntimeBundles } from "./runtime-bundle-contract"

export const packageName = "@opsydyn/crumbs-css"
const root = resolve(import.meta.dir, "..")
const template = join(root, "apps/playground")
type Mode = "workspace" | "packed" | "published"

export function parseArgs(args: string[]) {
  const mode = args.shift() ?? "workspace"
  if (!["workspace", "packed", "published"].includes(mode)) throw new Error(`Unknown mode: ${mode}`)
  const allowed = ["--check", "--prepare-only", "--web", "--ios", "--android"]
  for (const arg of args) {
    if (!allowed.includes(arg) && !/^--version=[a-zA-Z0-9.+-]+$/.test(arg)) throw new Error(`Unknown option: ${arg}`)
  }
  if (args.some(arg => arg.startsWith("--version=")) && mode !== "published") throw new Error("--version is only valid in published mode")
  return { mode: mode as Mode, check: args.includes("--check"), prepareOnly: args.includes("--prepare-only"), version: args.findLast(arg => arg.startsWith("--version="))?.slice(10) ?? "alpha", expoArgs: args.filter(arg => ["--web", "--ios", "--android"].includes(arg)) }
}

export function installedManifest(manifest: { dependencies: Record<string, string>; [key: string]: unknown }, specifier: string) {
  if (specifier.startsWith("workspace:") || specifier.startsWith("link:")) throw new Error("Installed modes cannot use workspace links")
  return { ...manifest, dependencies: { ...manifest.dependencies, [packageName]: specifier } }
}

async function run(command: string[], cwd: string, env = process.env, capture = false) {
  const child = Bun.spawn(command, { cwd, env, stdout: capture ? "pipe" : "inherit", stderr: "inherit" })
  const output = capture ? await new Response(child.stdout).text() : ""
  if (await child.exited !== 0) throw new Error(`Command failed: ${command.join(" ")}`)
  return output.trim()
}

export async function stage(specifier: string, stagingParent = tmpdir()) {
  const directory = await mkdtemp(join(stagingParent, "crumbs-playground-"))
  // Explicit copy allowlist excludes node_modules, .expo, generated exports and local env.
  for (const name of ["src", "index.js", "app.json", "babel.config.js", "metro.config.js", "tsconfig.json", "README.md"]) {
    await cp(join(template, name), join(directory, name), {
      recursive: true,
      filter: source => !basename(source).startsWith("incremental"),
    })
  }
  // Keep shared demo sources inside the installed app, where its own peers resolve.
  const sharedRoot = join(directory, "src/shared-storybook")
  for (const name of ["container-conditions", "native-motion", "token-algebra", "runtime-extensions"]) {
    await cp(join(root, "apps/storybook/src/components", name), join(sharedRoot, "components", name), { recursive: true })
  }
  await cp(join(root, "apps/storybook/src/accessibility/native-condition-source.ts"), join(sharedRoot, "accessibility/native-condition-source.ts"))
  for (const name of ["ContainerConditionsPanel", "NativeMotionPanel", "TokenAlgebraPanel", "RuntimeExtensionPanel"]) {
    const file = join(directory, "src", name + ".tsx")
    await writeFile(file, (await readFile(file, "utf8")).replaceAll("../../storybook/src/", "./shared-storybook/"))
  }
  const manifest = JSON.parse(await readFile(join(template, "package.json"), "utf8"))
  const runtimeEntry = `${manifest.name}/runtime-extensions`
  const authoring = join(sharedRoot, "components/runtime-extensions/authoring.ts")
  await writeFile(authoring, (await readFile(authoring, "utf8")).replaceAll("@crumbs/storybook/runtime-extensions", runtimeEntry))
  manifest.exports = {
    ...manifest.exports,
    "./runtime-extensions": {
      types: "./src/shared-storybook/components/runtime-extensions/runtime.tsx",
      default: "./src/shared-storybook/components/runtime-extensions/runtime.tsx",
    },
  }
  await writeFile(join(directory, "package.json"), JSON.stringify(installedManifest(manifest, specifier), null, 2) + "\n")
  return await realpath(directory)
}

export async function identity(directory: string, mode: Mode, expectedVersion: string) {
  const require = createRequire(join(directory, "package.json"))
  const entry = await realpath(require.resolve(`${packageName}/theme`))
  const packageRoot = dirname(dirname(entry))
  if (mode !== "workspace" && !packageRoot.startsWith(await realpath(directory) + "/node_modules/")) throw new Error(`Package escaped staged installation: ${entry}`)
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"))
  if (manifest.name !== packageName || manifest.version !== expectedVersion) throw new Error("Installed Crumbs identity does not match requested artifact")
  return { mode, version: manifest.version as string, entry }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.mode !== "workspace") {
    process.env.npm_config_cache = await mkdtemp(join(tmpdir(), "crumbs-npm-cache-"))
    process.env.npm_config_fetch_retries = "1"
    process.env.npm_config_fetch_timeout = "20000"
  }
  let directory = template
  let version = JSON.parse(await readFile(join(root, "packages/css/package.json"), "utf8")).version as string
  if (options.mode === "published") {
    version = JSON.parse(await run(["npm", "view", `${packageName}@${options.version}`, "version", "--json"], root, process.env, true))
    if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error("Registry selector must resolve to one exact version")
    directory = await stage(version)
  } else {
    await run(["bun", "run", "build:dev"], join(root, "packages/css"))
    if (options.mode === "packed") {
      const artifacts = await mkdtemp(join(tmpdir(), "crumbs-artifacts-"))
      console.log(`Packed artifacts: ${artifacts}`)
      // Build completed above. Suppress prepack's build logs so stdout remains machine-readable JSON.
      const packed = JSON.parse(await run(["npm", "pack", "--ignore-scripts", "--json", "--pack-destination", artifacts], join(root, "packages/css"), process.env, true))
      directory = await stage(`file:${join(artifacts, packed[0].filename)}`)
    }
  }
  console.log(`Preparing ${options.mode} consumer: ${directory}; requested Crumbs ${version}`)
  if (options.mode !== "workspace") await run(["npm", "install", "--no-audit", "--no-fund"], directory)
  const installed = await identity(directory, options.mode, version)
  const revision = options.mode === "published" ? "registry artifact" : await run(["git", "rev-parse", "--short", "HEAD"], root, process.env, true) + " (working tree)"
  const env = { ...process.env, EXPO_NO_METRO_WORKSPACE_ROOT: "1", EXPO_PUBLIC_CRUMBS_MODE: installed.mode, EXPO_PUBLIC_CRUMBS_VERSION: version, EXPO_PUBLIC_CRUMBS_REVISION: revision }
  await writeFile(join(directory, ".env.local"), `EXPO_PUBLIC_CRUMBS_MODE=${installed.mode}\nEXPO_PUBLIC_CRUMBS_VERSION=${version}\nEXPO_PUBLIC_CRUMBS_REVISION="${revision}"\n`)
  await writeFile(join(directory, ".expo-consumer-identity.json"), JSON.stringify({ ...installed, revision }, null, 2) + "\n")
  console.log(`Consumer: ${directory}\n${JSON.stringify(installed)}`)
  if (options.prepareOnly) return
  const bin = (name: string) => join(directory, "node_modules/.bin", name)
  if (options.check) {
    await run([bin("tsc"), "--noEmit"], directory, env)
    await rm(join(directory, "dist"), { recursive: true, force: true })
    await run([bin("expo"), "export", "--platform", "all", "--source-maps"], directory, { ...env, CI: "1" })
    const runtimeBundles = await verifyRuntimeBundles(join(directory, "dist"))
    await writeFile(join(directory, ".expo-runtime-bundles.json"), JSON.stringify(runtimeBundles, null, 2) + "\n")
    console.log(`Runtime bundle source qualification: ${runtimeBundles.length} source maps passed`)
    return
  }
  let stopped = false
  let expo: ReturnType<typeof Bun.spawn> | undefined
  let builder: ReturnType<typeof Bun.spawn> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending = Promise.resolve()
  const stopChild = async (child: ReturnType<typeof Bun.spawn> | undefined) => {
    if (!child) return
    child.kill("SIGTERM")
    const force = setTimeout(() => child.kill("SIGKILL"), 5000)
    await child.exited
    clearTimeout(force)
  }
  const launch = () => {
    const child = Bun.spawn([bin("expo"), "start", "--clear", "--port", "8091", ...options.expoArgs], { cwd: directory, env, stdin: "inherit", stdout: "inherit", stderr: "inherit" })
    expo = child
    child.exited.then(code => { if (!stopped && child === expo) { process.exitCode = code; void cleanup() } })
    return child
  }
  let watcher: ReturnType<typeof watch> | undefined
  if (options.mode === "workspace") {
    builder = Bun.spawn(["bun", "run", "build:dev", "--watch"], { cwd: join(root, "packages/css"), stdout: "inherit", stderr: "inherit" })
    watcher = watch(join(root, "packages/css/dist"), (_event, file) => {
      if (!file?.endsWith(".cjs") && !file?.endsWith(".mjs")) return
      clearTimeout(timer)
      timer = setTimeout(() => { pending = pending.then(async () => {
        if (stopped) return
        console.log("Crumbs build changed; restarting Metro to reload the compiler.")
        const previous = expo
        expo = undefined
        await stopChild(previous)
        if (!stopped) launch()
      }).catch(error => { console.error(error); process.exitCode = 1; void cleanup() }) }, 750)
    })
  }
  let finish: () => void
  const done = new Promise<void>(resolveDone => { finish = resolveDone })
  const cleanup = async () => {
    if (stopped) return
    stopped = true
    clearTimeout(timer)
    watcher?.close()
    await Promise.all([stopChild(expo), stopChild(builder)])
    finish()
  }
  process.once("SIGINT", cleanup)
  process.once("SIGTERM", cleanup)
  builder?.exited.then(code => { if (!stopped) { process.exitCode = code || 1; void cleanup() } })
  launch()
  await done
}

if (import.meta.main) main().catch(error => { console.error(error); process.exitCode = 1 })
