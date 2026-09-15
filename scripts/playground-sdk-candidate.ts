import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { packageName, stage } from "./playground"

type Manifest = {
  readonly name: string
  readonly dependencies: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
  readonly [key: string]: unknown
}

export type SdkCandidate = {
  readonly schemaVersion: 1
  readonly observedAt: string
  readonly observed: {
    readonly expoTag: "latest"
    readonly expoVersion: string
    readonly templateVersion: string
  }
  readonly dependencies: Readonly<Record<string, string>> & {
    readonly expo: string
    readonly react: string
    readonly "react-native": string
  }
  readonly devDependencies: Readonly<Record<string, string>>
  readonly expectedOutcome: {
    readonly kind: "peer-blocked"
    readonly packagePeer: string
  }
}

const repoRoot = resolve(import.meta.dir, "..")
const candidatePath = join(repoRoot, "apps/playground/upgrade/expo-57.json")
const packageRoot = join(repoRoot, "packages/css")

function exactVersion(value: string, label: string) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) {
    throw new Error(`${label} must be one exact version`)
  }
}

export function candidateManifest(base: Manifest, candidate: SdkCandidate, crumbsSpecifier: string): Manifest {
  if (!crumbsSpecifier.startsWith("file:") || !crumbsSpecifier.endsWith(".tgz")) {
    throw new Error("SDK candidates must consume a packed artifact")
  }
  for (const [name, version] of Object.entries({ ...candidate.dependencies, ...candidate.devDependencies })) {
    exactVersion(version, name)
  }
  return {
    ...base,
    name: "@crumbs/playground-expo-57-candidate",
    dependencies: { ...candidate.dependencies, [packageName]: crumbsSpecifier },
    devDependencies: { ...candidate.devDependencies },
  }
}

function tuple(version: string) {
  if (!/^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`React Native candidate must be a version boundary, received: ${version}`)
  }
  return version.split("-", 1)[0]!.split(".").map(Number)
}

function compare(left: number[], right: number[]) {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return Math.sign(difference)
  }
  return 0
}

export function assessPeerCompatibility(candidate: SdkCandidate, peerRange: string) {
  const match = /^>=(\d+\.\d+(?:\.\d+)?)\s+<(\d+\.\d+(?:\.\d+)?)$/.exec(peerRange)
  if (!match) throw new Error(`Expected one bounded peer range, received: ${peerRange}`)
  const reactNative = candidate.dependencies["react-native"]
  const version = tuple(reactNative)
  return {
    compatible: compare(version, tuple(match[1]!)) >= 0 && compare(version, tuple(match[2]!)) < 0,
    reactNative,
    peerRange,
  }
}

async function command(args: string[], cwd: string, env = process.env) {
  const child = Bun.spawn(args, { cwd, env, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() }
}

async function checked(args: string[], cwd: string, env = process.env) {
  const result = await command(args, cwd, env)
  if (result.exitCode !== 0) throw new Error(`${args.join(" ")} failed\n${result.stderr}`)
  return result.stdout
}

async function main() {
  const outputPath = process.argv[2] ? resolve(process.argv[2]) : undefined
  const candidate = JSON.parse(await readFile(candidatePath, "utf8")) as SdkCandidate
  const base = JSON.parse(await readFile(join(repoRoot, "apps/playground/package.json"), "utf8")) as Manifest
  const packageManifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
    readonly version: string
    readonly peerDependencies: { readonly "react-native": string }
  }
  const npmCache = await mkdtemp(join(tmpdir(), "crumbs-sdk-candidate-cache-"))
  const artifacts = await mkdtemp(join(tmpdir(), "crumbs-sdk-candidate-artifacts-"))
  let consumer: string | undefined
  try {
    const env = {
      ...process.env,
      npm_config_cache: npmCache,
      npm_config_fetch_retries: "1",
      npm_config_fetch_timeout: "20000",
    }
    const tags = JSON.parse(await checked(["npm", "view", "expo", "dist-tags", "--json"], repoRoot, env)) as {
      readonly latest: string
    }
    const template = JSON.parse(await checked(
      ["npm", "view", "expo-template-blank@latest", "version", "dependencies", "--json"],
      repoRoot,
      env,
    )) as {
      readonly version: string
      readonly dependencies: { readonly expo: string; readonly react: string; readonly "react-native": string }
    }
    if (tags.latest !== candidate.observed.expoVersion || template.version !== candidate.observed.templateVersion) {
      throw new Error(`Recorded SDK candidate is stale: npm latest is Expo ${tags.latest}, template ${template.version}`)
    }
    if (
      template.dependencies.expo.replace(/^~/, "") !== candidate.dependencies.expo ||
      template.dependencies.react !== candidate.dependencies.react ||
      template.dependencies["react-native"] !== candidate.dependencies["react-native"]
    ) {
      throw new Error("Recorded SDK candidate does not match the official blank template")
    }

    const compatibility = assessPeerCompatibility(candidate, packageManifest.peerDependencies["react-native"])
    if (
      compatibility.compatible ||
      candidate.expectedOutcome.kind !== "peer-blocked" ||
      candidate.expectedOutcome.packagePeer !== compatibility.peerRange
    ) {
      throw new Error("Candidate expectation no longer matches the package peer contract")
    }

    await checked(["bun", "run", "build:dev"], packageRoot, env)
    const packed = JSON.parse(await checked(
      ["npm", "pack", "--ignore-scripts", "--json", "--pack-destination", artifacts],
      packageRoot,
      env,
    )) as [{ readonly filename: string }]
    const tarball = join(artifacts, packed[0].filename)
    const bytes = await readFile(tarball)
    consumer = await stage(`file:${tarball}`)
    const manifest = candidateManifest(base, candidate, `file:${tarball}`)
    await writeFile(join(consumer, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`)
    const resolution = await command(
      ["npm", "install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"],
      consumer,
      env,
    )
    const diagnostic = `${resolution.stdout}\n${resolution.stderr}`
    if (resolution.exitCode === 0 || !diagnostic.includes("ERESOLVE") || !diagnostic.includes(packageName)) {
      throw new Error("Expo SDK candidate did not produce the expected Crumbs peer-resolution block")
    }

    const report = {
      slice: "M1.9a",
      recordedAt: new Date().toISOString(),
      candidate: {
        ...candidate.observed,
        react: candidate.dependencies.react,
        reactNative: candidate.dependencies["react-native"],
      },
      crumbs: {
        mode: "packed",
        version: packageManifest.version,
        tarballSha256: createHash("sha256").update(bytes).digest("hex"),
        reactNativePeer: compatibility.peerRange,
      },
      npmResolution: { exitCode: resolution.exitCode, outcome: "peer-blocked", errorCode: "ERESOLVE" },
      sdkSupported: false,
      supportBroadened: false,
      contractPassed: true,
    }
    const json = `${JSON.stringify(report, null, 2)}\n`
    if (outputPath) {
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, json)
      console.log(`SDK candidate receipt: ${outputPath}`)
    } else {
      console.log(json.trim())
    }
  } finally {
    if (consumer) await rm(consumer, { recursive: true, force: true })
    await Promise.all([
      rm(npmCache, { recursive: true, force: true }),
      rm(artifacts, { recursive: true, force: true }),
    ])
  }
}

if (import.meta.main) main().catch(error => { console.error(error); process.exitCode = 1 })
