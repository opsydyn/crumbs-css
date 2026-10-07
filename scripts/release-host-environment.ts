import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { release } from "node:os"
import { dirname, join, resolve } from "node:path"
import { existsSync, readFileSync } from "node:fs"

export type ReleaseHostEnvironment = Readonly<{
  macOSProductVersion: string
  darwinRelease: string
  chip: string
  architecture: string
  bunVersion: string
  npmVersion: string
  nodeFloorVersion: string
  nodeCurrentVersion: string
  bunNodeCompatibilityVersion: string
  tsdownVersion: string
  typescriptVersion: string
  tsgoVersion: string
}>

export const approvedReleaseHostEnvironment: ReleaseHostEnvironment = Object.freeze({
  macOSProductVersion: "26.6.2",
  darwinRelease: "25.6.0",
  chip: "Apple M4 Pro",
  architecture: "arm64",
  bunVersion: "1.4.2",
  npmVersion: "11.12.1",
  nodeFloorVersion: "22.0.0",
  nodeCurrentVersion: "24.15.0",
  bunNodeCompatibilityVersion: "v26.3.0",
  tsdownVersion: "0.21.10",
  typescriptVersion: "6.0.3",
  tsgoVersion: "7.0.0-dev.20260519.1",
})

const labels: Readonly<Record<keyof ReleaseHostEnvironment, string>> = {
  macOSProductVersion: "macOS product version",
  darwinRelease: "Darwin release",
  chip: "Apple chip",
  architecture: "architecture",
  bunVersion: "Bun version",
  npmVersion: "npm version",
  nodeFloorVersion: "Node floor version",
  nodeCurrentVersion: "current Node version",
  bunNodeCompatibilityVersion: "Bun Node compatibility version",
  tsdownVersion: "tsdown version",
  typescriptVersion: "TypeScript version",
  tsgoVersion: "tsgo version",
}

export function verifyReleaseHostEnvironment(actual: ReleaseHostEnvironment): readonly string[] {
  const blockers: string[] = []
  for (const key of Object.keys(approvedReleaseHostEnvironment) as Array<keyof ReleaseHostEnvironment>) {
    const expected = approvedReleaseHostEnvironment[key]
    const received = actual[key]
    if (received !== expected) {
      blockers.push(`${labels[key]} must be ${expected}; received ${received || "missing"}`)
    }
  }
  return blockers
}

function run(command: string, args: string[], repositoryRoot: string, env: NodeJS.ProcessEnv): string {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function readChip(repositoryRoot: string, env: NodeJS.ProcessEnv): string {
  try {
    return run("sysctl", ["-n", "machdep.cpu.brand_string"], repositoryRoot, env)
  } catch {
    const hardware = run("system_profiler", ["SPHardwareDataType"], repositoryRoot, env)
    const chip = hardware.match(/^\s*Chip:\s*(.+)$/m)?.[1]?.trim()
    if (!chip) throw Error("Could not read the Apple chip identity from sysctl or system_profiler")
    return chip
  }
}

function packageVersion(packageRoot: string, packageName: string): string {
  const requireFromPackage = createRequire(join(packageRoot, "package.json"))
  let manifestPath: string | undefined

  try {
    manifestPath = requireFromPackage.resolve(`${packageName}/package.json`)
  } catch {
    let directory = dirname(requireFromPackage.resolve(packageName))
    while (true) {
      const candidate = join(directory, "package.json")
      if (existsSync(candidate)) {
        const manifest = JSON.parse(readFileSync(candidate, "utf8")) as { name?: string; version?: string }
        if (manifest.name === packageName && manifest.version) {
          manifestPath = candidate
          break
        }
      }
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  }

  if (!manifestPath) throw Error(`Could not resolve the installed ${packageName} package version from ${packageRoot}`)
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version?: string }
  if (!manifest.version) throw Error(`Installed package ${packageName} has no version field`)
  return manifest.version
}

const withoutV = (version: string) => version.replace(/^v/u, "")

export function collectReleaseHostEnvironment(
  repositoryRoot = resolve(import.meta.dir, ".."),
  env: NodeJS.ProcessEnv = process.env,
): ReleaseHostEnvironment {
  const nodeFloorBinary = env.CRUMBS_AUDIT_NODE_FLOOR
  if (!nodeFloorBinary) throw Error("CRUMBS_AUDIT_NODE_FLOOR must name the explicit Node 22.0.0 binary")

  const packageRoot = resolve(repositoryRoot, "packages/css")
  const playgroundRoot = resolve(repositoryRoot, "apps/playground")
  return {
    macOSProductVersion: run("sw_vers", ["-productVersion"], repositoryRoot, env),
    darwinRelease: release(),
    chip: readChip(repositoryRoot, env),
    architecture: process.arch,
    bunVersion: Bun.version,
    npmVersion: run("npm", ["--version"], repositoryRoot, env),
    nodeFloorVersion: withoutV(run(nodeFloorBinary, ["--version"], repositoryRoot, env)),
    nodeCurrentVersion: withoutV(run("node", ["--version"], repositoryRoot, env)),
    bunNodeCompatibilityVersion: process.version,
    tsdownVersion: packageVersion(packageRoot, "tsdown"),
    typescriptVersion: packageVersion(playgroundRoot, "typescript"),
    tsgoVersion: packageVersion(packageRoot, "@typescript/native-preview"),
  }
}

if (import.meta.main) {
  try {
    const actual = collectReleaseHostEnvironment()
    const blockers = verifyReleaseHostEnvironment(actual)
    console.log(JSON.stringify({ actual, blockers }, null, 2))
    if (blockers.length > 0) process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
