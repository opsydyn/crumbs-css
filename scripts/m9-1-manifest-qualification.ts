import { createHash } from "node:crypto"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { NativeArtifactVersion } from "../packages/css/src/contracts/payloads"
import {
  assembleManifest,
  encodeCanonicalManifest,
  projectComponentRecipe,
  projectTokenContract,
  transformCssTsToStyleSheetWithManifestSidecar,
  type DesignSystemManifest,
} from "../packages/css/src/tooling/manifest"
import { auditPackedRuntimeEntrypoints } from "./packed-runtime-graph"
import { verifyPackedExportMap } from "./packed-export-contract"
import { button } from "../packages/css/fixtures/m9-1-manifest/components"
import { tokens } from "../packages/css/fixtures/m9-1-manifest/tokens"
import { supplementalTokens } from "../packages/css/fixtures/m9-1-manifest/tokens-supplement"

const REPOSITORY_ROOT = resolve(import.meta.dir, "..")
const PACKAGE_ROOT = resolve(REPOSITORY_ROOT, "packages/css")
const FIXTURE_RELATIVE_ROOT = "fixtures/m9-1-manifest"
const FIXTURE_ROOT = resolve(PACKAGE_ROOT, FIXTURE_RELATIVE_ROOT)
const EVIDENCE_ROOT = resolve(REPOSITORY_ROOT, "docs/evidence/2026-09-27-m9-1-deterministic-manifest")
const FIXTURE_FILES = [
  "components.ts",
  "package.json",
  "styles.css.ts",
  "tokens-supplement.ts",
  "tokens.ts",
] as const

type FixtureDigest = Readonly<{ path: string; sha256: string }>

export type DeterministicManifestEvidence = Readonly<{
  manifest: DesignSystemManifest
  canonicalManifest: string
  canonicalManifestSha256: string
  fixtureSha256: ReadonlyArray<FixtureDigest>
  determinism: Readonly<{
    absoluteRootCount: 2
    byteIdentical: true
    digestIdentical: true
    rootsReordered: true
  }>
}>

type PackedQualification = Readonly<{
  resolvedPackedExports: ReadonlyArray<Readonly<Record<string, string>>>
  runtimeGraphClasses: ReadonlyArray<Readonly<{
    subpath: string
    classification: string
    format: string
    fileCount: number
    externalSpecifiers: ReadonlyArray<string>
  }>>
}>

/** Build and compare two manifests from reordered roots at distinct temporary absolute roots. */
export async function createDeterministicManifestEvidence(): Promise<DeterministicManifestEvidence> {
  const roots = [createTemporaryPackageRoot(), createTemporaryPackageRoot()] as const
  try {
    if (!roots.every(isAbsolute) || roots[0] === roots[1]) {
      throw new Error("M9.1 qualification requires two distinct absolute temporary package roots.")
    }

    const tokenRoots = [
      { contract: tokens, origin: { path: `${FIXTURE_RELATIVE_ROOT}/tokens.ts`, exportPath: "tokens" } },
      { contract: supplementalTokens, origin: { path: `${FIXTURE_RELATIVE_ROOT}/tokens-supplement.ts`, exportPath: "supplementalTokens" } },
    ] as const
    const declaredTokenIds = new Set([
      ...projectTokenContract(tokens, tokenRoots[0].origin).map(token => token.id),
      ...projectTokenContract(supplementalTokens, tokenRoots[1].origin).map(token => token.id),
    ])
    const sidecars = await Promise.all(roots.map(async root => {
      const result = await transformCssTsToStyleSheetWithManifestSidecar(
        resolve(root, FIXTURE_RELATIVE_ROOT, "styles.css.ts"),
        root,
        { declaredTokenIds, useStyleSheet: false, dev: false },
      )
      return result.sidecar
    }))
    const componentOrigin = { path: `${FIXTURE_RELATIVE_ROOT}/components.ts`, exportPath: "button" }
    const component = projectComponentRecipe(button, componentOrigin)
    const tokenLifecycleTarget = projectTokenContract(tokens, tokenRoots[0].origin)
      .find(token => token.path.join(".") === "color.label")
    if (tokenLifecycleTarget === undefined) throw new Error("M9.1 fixture token lifecycle target is missing.")

    const packageMetadata = JSON.parse(readFileSync(resolve(FIXTURE_ROOT, "package.json"), "utf8")) as {
      readonly name: string
      readonly version: string
    }
    const producer = {
      compiler: { name: "@opsydyn/crumbs-css", version: readPackageVersion() },
      artifact: { name: "crumbs.native-styles", version: NativeArtifactVersion },
    } as const
    const assemble = (rootOrder: ReadonlyArray<typeof tokenRoots[number]>, sidecarIndex: 0 | 1): DesignSystemManifest => {
      const sidecar = sidecars[sidecarIndex]
      if (sidecar === undefined) throw new Error(`M9.1 sidecar ${sidecarIndex} is missing.`)
      return assembleManifest({
        package: packageMetadata,
        producer,
        tokenContracts: rootOrder,
        componentRecipes: [{ recipe: button, origin: componentOrigin }],
        styleSidecars: [sidecar],
        lifecycleAnnotations: [
          {
            entityId: component.id,
            deprecatedSince: "2.0.0",
            reason: "The reference fixture demonstrates explicit component lifecycle metadata.",
            replacement: { id: "@acme/ui#ActionButton@1", resolution: "external" },
          },
          {
            entityId: tokenLifecycleTarget.id,
            deprecatedSince: "2.0.0",
            reason: "Use the semantic surface alias.",
            replacement: {
              id: projectTokenContract(tokens, tokenRoots[0].origin).find(token => token.path.join(".") === "semantic.surface")!.id,
              resolution: "declared",
            },
          },
        ],
      })
    }

    const firstManifest = assemble(tokenRoots, 0)
    const secondManifest = assemble([...tokenRoots].reverse(), 1)
    const canonicalFirst = encodeCanonicalManifest(firstManifest)
    const canonicalSecond = encodeCanonicalManifest(secondManifest)
    if (canonicalFirst !== canonicalSecond) {
      throw new Error("M9.1 manifests differ after root reordering or package-root relocation.")
    }

    const canonicalManifestSha256 = sha256(canonicalFirst)
    if (canonicalManifestSha256 !== sha256(canonicalSecond)) {
      throw new Error("M9.1 canonical manifest digests differ after root reordering or package-root relocation.")
    }
    const fixtureSha256 = FIXTURE_FILES.map(file => ({
      path: `${FIXTURE_RELATIVE_ROOT}/${file}`,
      sha256: sha256(readFileSync(resolve(FIXTURE_ROOT, file))),
    }))
    return {
      manifest: firstManifest,
      canonicalManifest: canonicalFirst,
      canonicalManifestSha256,
      fixtureSha256,
      determinism: {
        absoluteRootCount: 2,
        byteIdentical: true,
        digestIdentical: true,
        rootsReordered: true,
      },
    }
  } finally {
    roots.forEach(root => rmSync(root, { recursive: true, force: true }))
  }
}

async function qualifyPackedPackage(): Promise<PackedQualification> {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "crumbs-css-m9-1-packed-"))
  try {
    const packageArchiveRoot = resolve(temporaryRoot, "archive")
    const installedRoot = resolve(temporaryRoot, "installed", "crumbs-css")
    const consumerRoot = resolve(temporaryRoot, "consumer")
    mkdirSync(packageArchiveRoot, { recursive: true })
    mkdirSync(installedRoot, { recursive: true })
    mkdirSync(resolve(consumerRoot, "node_modules", "@opsydyn"), { recursive: true })

    runChecked(["bun", "pm", "pack", "--destination", packageArchiveRoot], PACKAGE_ROOT)
    const archive = readdirSync(packageArchiveRoot).find(entry => entry.endsWith(".tgz"))
    if (archive === undefined) throw new Error("Packed M9.1 qualification produced no npm archive.")
    runChecked(["tar", "-xzf", resolve(packageArchiveRoot, archive), "--strip-components=1", "-C", installedRoot], temporaryRoot)
    writeFileSync(resolve(consumerRoot, "package.json"), JSON.stringify({ name: "crumbs-m9-1-qualification-consumer", private: true, type: "module" }))
    symlinkSync(installedRoot, resolve(consumerRoot, "node_modules", "@opsydyn", "crumbs-css"), "junction")

    const resolvedPackedExports = await verifyPackedExportMap(installedRoot, consumerRoot)
    const runtimeGraphs = await auditPackedRuntimeEntrypoints(installedRoot)
    const runtimeGraphClasses = runtimeGraphs.map(graph => ({
      subpath: graph.subpath,
      classification: graph.classification,
      format: graph.format,
      fileCount: graph.files.length,
      externalSpecifiers: [...graph.externalSpecifiers].sort(compareOrdinal),
    }))
    if (!resolvedPackedExports.some(entry => entry.subpath === "./tooling/manifest" &&
      entry.import !== undefined && entry.require !== undefined && entry.types !== undefined)) {
      throw new Error("Packed M9.1 manifest tooling export did not resolve import, require and types targets.")
    }
    if (!runtimeGraphClasses.some(entry => entry.subpath === "./theme/core" && entry.classification === "ordinary-runtime")) {
      throw new Error("Packed M9.1 qualification did not audit the ordinary theme/core runtime graph.")
    }
    return { resolvedPackedExports, runtimeGraphClasses }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

function createTemporaryPackageRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "crumbs-css-m9-1-root-"))
  const fixtureDestination = resolve(root, FIXTURE_RELATIVE_ROOT)
  mkdirSync(dirname(fixtureDestination), { recursive: true })
  cpSync(FIXTURE_ROOT, fixtureDestination, { recursive: true })
  cpSync(resolve(PACKAGE_ROOT, "package.json"), resolve(root, "package.json"))
  symlinkSync(resolve(PACKAGE_ROOT, "src"), resolve(root, "src"), "junction")
  const packageNodeModules = resolve(PACKAGE_ROOT, "node_modules")
  if (!existsSync(packageNodeModules)) throw new Error("M9.1 qualification needs the CSS package dependencies installed.")
  symlinkSync(packageNodeModules, resolve(root, "node_modules"), "junction")
  return root
}

function readPackageVersion(): string {
  const metadata = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "package.json"), "utf8")) as { readonly version: string }
  return metadata.version
}

function runChecked(command: ReadonlyArray<string>, cwd: string): void {
  const result = Bun.spawnSync([...command], { cwd, stderr: "pipe", stdout: "pipe" })
  if (result.exitCode !== 0) {
    throw new Error([`$ ${command.join(" ")}`, result.stdout.toString(), result.stderr.toString()].join("\n"))
  }
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

async function main(): Promise<void> {
  const evidence = await createDeterministicManifestEvidence()
  const packed = await qualifyPackedPackage()
  runChecked(["bun", "run", "playground:distribution", "--m8-3-check"], REPOSITORY_ROOT)
  const receipt = {
    format: "crumbs.m9-1-qualification",
    status: "qualified",
    identity: {
      package: evidence.manifest.package,
      compiler: evidence.manifest.producer.compiler,
      artifact: evidence.manifest.producer.artifact,
      manifestSchemaVersion: evidence.manifest.schemaVersion,
    },
    fixture: { files: evidence.fixtureSha256 },
    manifest: {
      path: "manifest.json",
      sha256: evidence.canonicalManifestSha256,
      declaredRoots: evidence.manifest.coverage.roots,
      unresolvedReferences: evidence.manifest.coverage.unresolved,
      capabilityEvidence: [...new Set(evidence.manifest.capabilities.map(capability => capability.evidence))].sort(compareOrdinal),
    },
    determinism: evidence.determinism,
    packedPackage: {
      resolvedExports: packed.resolvedPackedExports,
      runtimeGraphClasses: packed.runtimeGraphClasses,
      ordinaryRuntimeBoundary: "passed",
    },
    distribution: {
      command: "bun run playground:distribution --m8-3-check",
      status: "passed",
      esmCommonJsTypes: "passed",
      ios: "passed",
      web: "passed",
      android: "not-run",
      androidStatus: "parked; no Android device is available",
    },
  }
  mkdirSync(EVIDENCE_ROOT, { recursive: true })
  writeFileSync(resolve(EVIDENCE_ROOT, "manifest.json"), evidence.canonicalManifest)
  writeFileSync(resolve(EVIDENCE_ROOT, "qualification.json"), `${JSON.stringify(receipt, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    manifestSha256: evidence.canonicalManifestSha256,
    fixtureFiles: evidence.fixtureSha256.length,
    packedExports: packed.resolvedPackedExports.length,
    runtimeGraphs: packed.runtimeGraphClasses.length,
    evidence: relative(REPOSITORY_ROOT, resolve(EVIDENCE_ROOT, "qualification.json")).split(sep).join("/"),
  }, null, 2)}\n`)
}

if (import.meta.main) await main()
